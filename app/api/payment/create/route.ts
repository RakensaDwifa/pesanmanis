import { NextResponse } from "next/server";

import { createSnapTransaction } from "@/lib/midtrans";
import { calculateCheckoutTotal, sanitizeAddons } from "@/lib/pricing";
import { getActivePrice } from "@/lib/pricing-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateSlugFormat } from "@/lib/slug";
import { getUcapan } from "@/lib/store";
import { isRemote } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-vercel-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

export async function POST(request: Request) {
  // Cegah spam pembuatan transaksi (tiap request membuat baris payments).
  const { success } = await checkRateLimit(clientIp(request), 5, 60000);
  if (!success) {
    return NextResponse.json(
      {
        ok: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: "Terlalu banyak permintaan. Coba lagi dalam 1 menit.",
      },
      { status: 429 }
    );
  }

  let body: {
    ucapanId?: string;
    customerName?: string;
    addons?: unknown;
    customSlug?: string;
    touchParticles?: string;
    gateType?: string;
    gateData?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  if (!body.ucapanId) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  const ucapanId = body.ucapanId;
  const merchantRef = `UP-${ucapanId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

  let templateSlug: string | null = null;
  if (isRemote()) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data } = await admin
      .from("ucapan")
      .select("template_slug")
      .eq("id", ucapanId)
      .maybeSingle();
    templateSlug = data?.template_slug ?? null;
  } else {
    templateSlug = getUcapan(ucapanId)?.templateSlug ?? null;
  }

  if (!templateSlug) {
    return NextResponse.json({ ok: false, error: "UCAPAN_NOT_FOUND" }, { status: 404 });
  }

  // Sanitasi daftar add-on
  const sanitizedAddons = sanitizeAddons(body.addons);

  // Jika add-on custom slug dipilih, validasi format dan keunikan
  let validCustomSlug: string | null = null;
  if (sanitizedAddons.includes("custom_slug")) {
    const validation = validateSlugFormat(body.customSlug);
    if (!validation.valid) {
      return NextResponse.json(
        { ok: false, error: "INVALID_SLUG", message: validation.reason },
        { status: 400 }
      );
    }
    validCustomSlug = validation.normalized;

    if (isRemote()) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { data: existingSlug } = await admin
        .from("ucapan")
        .select("id")
        .eq("custom_slug", validCustomSlug)
        .neq("id", ucapanId)
        .maybeSingle();

      if (existingSlug) {
        return NextResponse.json(
          {
            ok: false,
            error: "SLUG_TAKEN",
            message: "Alamat custom sudah dipakai orang lain. Pilih nama lain ya!",
          },
          { status: 400 }
        );
      }
    }
  }

  // Harga dasar dari server (promo vs normal)
  const price = await getActivePrice();

  // Hitung total checkout dengan mempertimbangkan paket bundling add-on
  const calculation = calculateCheckoutTotal(price.amount, sanitizedAddons);

  // Simpan konfigurasi add-on ke ucapan & catat pembayaran
  if (isRemote()) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    // Update ucapan dengan konfigurasi add-on
    const ucapanUpdate: Record<string, unknown> = {
      qr_photo_enabled: sanitizedAddons.includes("custom_qr"),
      receipt_enabled: sanitizedAddons.includes("love_receipt"),
      touch_particles: sanitizedAddons.includes("touch_particles")
        ? body.touchParticles ?? "hearts"
        : null,
      gate_type: sanitizedAddons.includes("intimate_gate") ? body.gateType ?? "pin" : null,
      gate_data: sanitizedAddons.includes("intimate_gate") ? body.gateData ?? null : null,
    };
    if (validCustomSlug) {
      ucapanUpdate.custom_slug = validCustomSlug;
    }

    await admin.from("ucapan").update(ucapanUpdate).eq("id", ucapanId);

    const { error: insertError } = await admin.from("payments").insert({
      ucapan_id: ucapanId,
      merchant_ref: merchantRef,
      method: "snap",
      amount: calculation.totalAmount,
      addons: calculation.addons,
      status: "UNPAID",
    });
    if (insertError) {
      return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
    }
  }

  const result = await createSnapTransaction({
    ucapanId,
    merchantRef,
    templateSlug,
    customerName: body.customerName ?? "Pelanggan",
    amount: calculation.totalAmount,
  });

  if (!result.ok) {
    if (isRemote()) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      await admin.from("payments").delete().eq("merchant_ref", merchantRef);
    }
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json({
    ...result,
    amount: calculation.totalAmount,
    baseAmount: price.amount,
    addonTotal: calculation.addonTotal,
    discount: calculation.discount,
    isPromo: price.isPromo,
    addons: calculation.addons,
  });
}

