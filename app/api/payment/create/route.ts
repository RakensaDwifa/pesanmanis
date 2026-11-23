import { NextResponse } from "next/server";

import { createSnapTransaction } from "@/lib/midtrans";
import { calculateCheckoutTotal, sanitizeAddons } from "@/lib/pricing";
import { getActivePrice } from "@/lib/pricing-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateSlugFormat } from "@/lib/slug";
import { getUcapan } from "@/lib/store";
import { isRemote } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Cegah spam pembuatan transaksi (tiap request membuat baris payments).
  const { success } = await checkRateLimit(getClientIp(request), 5, 60000);
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
    useCredits?: boolean;
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
  let ownerId: string | null = null;
  let ucapanEmail: string | null = null;
  let paid = false;

  if (isRemote()) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data } = await admin
      .from("ucapan")
      .select("template_slug, owner_id, email, paid")
      .eq("id", ucapanId)
      .maybeSingle();
    templateSlug = data?.template_slug ?? null;
    ownerId = data?.owner_id ?? null;
    ucapanEmail = data?.email ?? null;
    paid = data?.paid ?? false;
  } else {
    const local = getUcapan(ucapanId);
    templateSlug = local?.templateSlug ?? null;
    paid = local?.paid ?? false;
  }

  if (!templateSlug) {
    return NextResponse.json({ ok: false, error: "UCAPAN_NOT_FOUND" }, { status: 404 });
  }

  // Ownership check & paid check
  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 });
  }
  if (ownerId && ownerId !== user.id) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  if (paid) {
    return NextResponse.json({ ok: false, error: "ALREADY_PAID" }, { status: 400 });
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

  // Jika add-on gate dipilih, wajib ada PIN 4-6 digit
  let validGateData: { pin: string } | null = null;
  if (sanitizedAddons.includes("intimate_gate")) {
    const gateData =
      body.gateData && typeof body.gateData === "object"
        ? (body.gateData as Record<string, unknown>)
        : null;
    const pin = String(gateData?.pin ?? "").trim();
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_GATE",
          message: "PIN rahasia wajib diisi 4–6 angka.",
        },
        { status: 400 }
      );
    }
    validGateData = { pin };
  }

  // Jika add-on partikel dipilih, validasi jenis yang didukung
  const VALID_PARTICLES = ["hearts", "roses", "sparkles"];
  if (
    sanitizedAddons.includes("touch_particles") &&
    body.touchParticles &&
    !VALID_PARTICLES.includes(String(body.touchParticles))
  ) {
    return NextResponse.json(
      { ok: false, error: "INVALID_PARTICLE", message: "Jenis efek partikel tidak dikenal." },
      { status: 400 }
    );
  }

  // Harga dasar dari server (promo vs normal)
  const price = await getActivePrice();

  // Hitung total checkout dengan mempertimbangkan paket bundling add-on
  const calculation = calculateCheckoutTotal(price.amount, sanitizedAddons);

  // Hitung potongan saldo referral (credits) bila user memilih useCredits (default: true)
  const MIN_PAYABLE = 1000;
  let creditUsed = 0;
  if (isRemote() && body.useCredits !== false) {
    try {
      const { getCreditBalance } = await import("@/lib/referral");
      const balance = await getCreditBalance(user.id);
      if (balance > 0 && calculation.totalAmount > MIN_PAYABLE) {
        creditUsed = Math.min(balance, calculation.totalAmount - MIN_PAYABLE);
      }
    } catch {
      creditUsed = 0;
    }
  }
  const payableAmount = Math.max(MIN_PAYABLE, calculation.totalAmount - creditUsed);

  // Simpan konfigurasi add-on ke ucapan, catat pembayaran, & catat sesi abandoned-cart
  if (isRemote()) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    // Update ucapan dengan konfigurasi add-on (+ isi email dari user login bila masih kosong)
    const ucapanUpdate: Record<string, unknown> = {
      qr_photo_enabled: sanitizedAddons.includes("custom_qr"),
      receipt_enabled: sanitizedAddons.includes("love_receipt"),
      touch_particles: sanitizedAddons.includes("touch_particles")
        ? body.touchParticles ?? "hearts"
        : null,
      gate_type: sanitizedAddons.includes("intimate_gate") ? "pin" : null,
      gate_data: sanitizedAddons.includes("intimate_gate") ? validGateData : null,
    };
    if (validCustomSlug) {
      ucapanUpdate.custom_slug = validCustomSlug;
    }
    if (!ucapanEmail && user.email) {
      ucapanUpdate.email = user.email;
    }

    await admin.from("ucapan").update(ucapanUpdate).eq("id", ucapanId);

    const paymentRow: Record<string, unknown> = {
      ucapan_id: ucapanId,
      merchant_ref: merchantRef,
      method: "snap",
      amount: payableAmount,
      addons: calculation.addons,
      status: "UNPAID",
    };
    if (creditUsed > 0) {
      paymentRow.credit_used = creditUsed;
    }

    let { error: insertError } = await admin.from("payments").insert(paymentRow);
    // Fallback jika kolom credit_used belum dimigrasikan di database lama
    if (insertError && creditUsed > 0) {
      delete paymentRow.credit_used;
      creditUsed = 0;
      paymentRow.amount = calculation.totalAmount;
      ({ error: insertError } = await admin.from("payments").insert(paymentRow));
    }
    if (insertError) {
      return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
    }

    // Catat sesi checkout untuk abandoned-cart recovery sejak user klik Bayar
    try {
      const { data: existingSession } = await admin
        .from("checkout_sessions")
        .select("id")
        .eq("ucapan_id", ucapanId)
        .limit(1)
        .maybeSingle();

      if (!existingSession) {
        const effectiveEmail = ucapanEmail ?? user.email ?? null;
        await admin.from("checkout_sessions").insert({
          ucapan_id: ucapanId,
          email: effectiveEmail,
          started_at: new Date().toISOString(),
        });
      }
    } catch {
      // non-blocking
    }
  }

  const finalPayable = Math.max(MIN_PAYABLE, calculation.totalAmount - creditUsed);

  const result = await createSnapTransaction({
    ucapanId,
    merchantRef,
    templateSlug,
    customerName: body.customerName ?? "Pelanggan",
    amount: finalPayable,
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
    amount: finalPayable,
    baseAmount: price.amount,
    addonTotal: calculation.addonTotal,
    discount: calculation.discount,
    creditUsed,
    isPromo: price.isPromo,
    addons: calculation.addons,
  });
}

