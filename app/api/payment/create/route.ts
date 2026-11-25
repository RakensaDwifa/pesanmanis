import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { createSnapTransaction } from "@/lib/midtrans";
import { calculateCheckoutTotal, sanitizeAddons } from "@/lib/pricing";
import { getActivePrice } from "@/lib/pricing-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateSlugFormat } from "@/lib/slug";
import { getTemplate } from "@/lib/templates";
import { isRemote } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { buildDraftAddonState } from "@/lib/supabase/rows";
import { asTrimmedString, isRecord, isValidUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const MIN_PAYABLE = 1000;
const VALID_PARTICLES = ["hearts", "roses", "sparkles"];

export async function POST(request: Request) {
  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }

  const { success } = await checkRateLimit(
    `payment-create:${getClientIp(request)}`,
    5,
    60000
  );
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

  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  if (!isRecord(body) || !isValidUuid(body.ucapanId)) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  const ucapanId = body.ucapanId.trim();
  const customerName = asTrimmedString(body.customerName) || "Pelanggan";
  const useCredits = body.useCredits !== false;
  const randomSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  const merchantRef = `UP-${ucapanId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: ucapanRow } = await admin
    .from("ucapan")
    .select("template_slug, owner_id, email, paid")
    .eq("id", ucapanId)
    .maybeSingle();

  if (!ucapanRow?.template_slug) {
    return NextResponse.json({ ok: false, error: "UCAPAN_NOT_FOUND" }, { status: 404 });
  }

  // Strict ownership check (rejects orphan rows where owner_id is null as well).
  if (!ucapanRow.owner_id || ucapanRow.owner_id !== user.id) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  if (ucapanRow.paid) {
    return NextResponse.json({ ok: false, error: "ALREADY_PAID" }, { status: 400 });
  }
  if (!getTemplate(ucapanRow.template_slug)?.active) {
    return NextResponse.json(
      {
        ok: false,
        error: "TEMPLATE_UNAVAILABLE",
        message: "Template ini sedang dalam pengembangan dan belum tersedia untuk checkout.",
      },
      { status: 400 }
    );
  }

  const sanitizedAddons = sanitizeAddons(body.addons);

  // Validate custom slug uniqueness strictly against already-paid ucapan.
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

    const { data: existingSlug } = await admin
      .from("ucapan")
      .select("id")
      .eq("custom_slug", validCustomSlug)
      .eq("paid", true)
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

  // Validate Intimate Gate (PIN 4–6 digits OR Nostalgia Trivia Q&A)
  let validGateType: "pin" | "trivia" | null = null;
  let validPin: string | null = null;
  let validQuestion: string | null = null;
  let validAnswer: string | null = null;
  if (sanitizedAddons.includes("intimate_gate")) {
    const rawGateType = asTrimmedString(body.gateType) ?? "pin";
    const gateData = isRecord(body.gateData) ? body.gateData : null;

    if (rawGateType === "trivia") {
      const question = asTrimmedString(gateData?.question) ?? "";
      const answer = asTrimmedString(gateData?.answer) ?? "";
      if (question.length < 3 || question.length > 160) {
        return NextResponse.json(
          {
            ok: false,
            error: "INVALID_GATE",
            message: "Pertanyaan kuis nostalgia wajib diisi (3–160 karakter).",
          },
          { status: 400 }
        );
      }
      if (answer.length < 1 || answer.length > 80) {
        return NextResponse.json(
          {
            ok: false,
            error: "INVALID_GATE",
            message: "Jawaban rahasia kuis wajib diisi (1–80 karakter).",
          },
          { status: 400 }
        );
      }
      validGateType = "trivia";
      validQuestion = question;
      validAnswer = answer;
    } else if (rawGateType === "pin") {
      const pin = asTrimmedString(gateData?.pin) ?? "";
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
      validGateType = "pin";
      validPin = pin;
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_GATE",
          message: "Jenis kunci pesan tidak dikenali.",
        },
        { status: 400 }
      );
    }
  }

  // Validate touch particle style
  let validParticle: string | null = null;
  if (sanitizedAddons.includes("touch_particles")) {
    const rawParticle = asTrimmedString(body.touchParticles);
    if (rawParticle && !VALID_PARTICLES.includes(rawParticle)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PARTICLE", message: "Jenis efek partikel tidak dikenal." },
        { status: 400 }
      );
    }
    validParticle = rawParticle ?? "hearts";
  }

  // Build immutable add-on configuration snapshot stored directly on the payment row.
  const addonSnapshot = buildDraftAddonState({
    addons: sanitizedAddons,
    customSlug: validCustomSlug,
    gateType: validGateType,
    pin: validPin,
    question: validQuestion,
    answer: validAnswer,
    particleStyle: validParticle,
  });

  // Server-authoritative base price based on template tier (promo vs normal)
  const price = await getActivePrice(ucapanRow.template_slug);
  const calculation = calculateCheckoutTotal(price.amount, sanitizedAddons);

  // Supersede previous UNPAID attempts for the same ucapanId so retrying checkout
  // does not double-reserve the user's own referral credits.
  await admin
    .from("payments")
    .update({ status: "SUPERSEDED" })
    .eq("ucapan_id", ucapanId)
    .eq("status", "UNPAID");

  // Compute spendable referral credits (excluding credits already reserved by other active UNPAID checkouts).
  let creditUsed = 0;
  if (useCredits) {
    try {
      const { getAvailableCreditBalance } = await import("@/lib/referral");
      const balance = await getAvailableCreditBalance(user.id, ucapanId);
      if (balance > 0 && calculation.totalAmount > MIN_PAYABLE) {
        creditUsed = Math.min(balance, calculation.totalAmount - MIN_PAYABLE);
      }
    } catch {
      creditUsed = 0;
    }
  }
  const payableAmount = Math.max(MIN_PAYABLE, calculation.totalAmount - creditUsed);

  // Persist draft add-on preferences (and fallback creator email) without touching live paid columns.
  const ucapanDraftUpdate: Record<string, unknown> = {
    draft_addons: addonSnapshot,
  };
  if (!ucapanRow.email && user.email) {
    ucapanDraftUpdate.email = user.email;
  }
  const { error: ucapanDraftErr } = await admin
    .from("ucapan")
    .update(ucapanDraftUpdate)
    .eq("id", ucapanId);
  if (ucapanDraftErr?.code === "42703" && !ucapanRow.email && user.email) {
    await admin.from("ucapan").update({ email: user.email }).eq("id", ucapanId);
  }

  const paymentRow: Record<string, unknown> = {
    ucapan_id: ucapanId,
    merchant_ref: merchantRef,
    method: "snap",
    amount: payableAmount,
    base_amount: price.amount,
    is_promo: price.isPromo,
    addons: calculation.addons,
    addon_config: addonSnapshot ?? {},
    credit_used: creditUsed,
    status: "UNPAID",
  };

  let { error: insertError } = await admin.from("payments").insert(paymentRow);
  // Only fall back when schema_v9 columns are genuinely absent (Postgres undefined_column 42703).
  if (insertError?.code === "42703") {
    console.warn("[payment-create] kolom schema_v9 belum dimigrasikan, menggunakan insert kompatibel");
    const legacyRow: Record<string, unknown> = {
      ucapan_id: ucapanId,
      merchant_ref: merchantRef,
      method: "snap",
      amount: calculation.totalAmount,
      addons: calculation.addons,
      status: "UNPAID",
    };
    creditUsed = 0;
    ({ error: insertError } = await admin.from("payments").insert(legacyRow));
  }
  if (insertError) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }

  // Record checkout session for abandoned-cart recovery
  const effectiveEmail = ucapanRow.email || user.email || undefined;
  try {
    const { data: existingSession } = await admin
      .from("checkout_sessions")
      .select("id")
      .eq("ucapan_id", ucapanId)
      .limit(1)
      .maybeSingle();

    if (!existingSession) {
      await admin.from("checkout_sessions").insert({
        ucapan_id: ucapanId,
        email: effectiveEmail ?? null,
        started_at: new Date().toISOString(),
      });
    }
  } catch {
    // non-blocking
  }

  const finalPayable = Math.max(MIN_PAYABLE, calculation.totalAmount - creditUsed);

  const result = await createSnapTransaction({
    ucapanId,
    merchantRef,
    templateSlug: ucapanRow.template_slug,
    customerName,
    customerEmail: effectiveEmail,
    amount: finalPayable,
  });

  if (!result.ok) {
    await admin.from("payments").delete().eq("merchant_ref", merchantRef);
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
