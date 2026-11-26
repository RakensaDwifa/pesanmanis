import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { amountMatchesPaid, sanitizeAddons } from "@/lib/pricing";
import { buildDraftAddonColumns } from "@/lib/supabase/rows";
import { isRecord } from "@/lib/validation";

export function maskId(id: string): string {
  if (!id || id.length <= 8) return "***";
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  return `${local[0]}***@${domain}`;
}

export function maskAmount(amount: number): string {
  const roundedK = Math.max(0, Math.round(amount / 1000));
  return `Rp ${roundedK}K+`;
}

interface PaymentRecord {
  id: number;
  ucapan_id: string | null;
  status: string;
  amount: number;
  addons: unknown;
  addon_config?: unknown;
  credit_used?: number | null;
  tripay_ref?: string | null;
}

export interface ActivatePaidPaymentInput {
  merchantRef: string;
  grossAmount: string;
  paymentType?: string | null;
  transactionId?: string | null;
}

export interface ActivatePaidPaymentResult {
  ok: boolean;
  alreadyPaid?: boolean;
  mismatch?: boolean;
  notFound?: boolean;
}

/**
 * Single atomic, idempotent activation path shared by Midtrans webhook and /api/payment/status.
 * Claims UNPAID -> PAID transition atomically so ucapan activation, credit redemption,
 * referral payouts, and emails execute at most once even under concurrent webhook + polling.
 */
export async function activatePaidPayment(
  input: ActivatePaidPaymentInput
): Promise<ActivatePaidPaymentResult> {
  const admin = createAdminClient();
  const { merchantRef, grossAmount, paymentType, transactionId } = input;
  const now = new Date().toISOString();

  let { data: paymentRaw, error: fetchErr } = await admin
    .from("payments")
    .select("id, ucapan_id, status, amount, addons, addon_config, credit_used, tripay_ref")
    .eq("merchant_ref", merchantRef)
    .maybeSingle();

  // Backward-compatible fallback if schema_v9 columns are not yet present in an older DB.
  if (fetchErr?.code === "42703") {
    const legacy = await admin
      .from("payments")
      .select("id, ucapan_id, status, amount, addons, tripay_ref")
      .eq("merchant_ref", merchantRef)
      .maybeSingle();
    paymentRaw = legacy.data as typeof paymentRaw;
    fetchErr = legacy.error;
  }

  const payment = paymentRaw as PaymentRecord | null;
  if (fetchErr || !payment || !payment.ucapan_id) {
    console.warn("[payment-activation] pembayaran atau ucapan tidak ditemukan", {
      ref: maskId(merchantRef),
    });
    return { ok: false, notFound: true };
  }

  if (!amountMatchesPaid(grossAmount, payment.amount)) {
    console.warn("[payment-activation] nominal tidak cocok, aktivasi dibatalkan", {
      ref: maskId(merchantRef),
      expected: maskAmount(Number(payment.amount ?? 0)),
      received: maskAmount(Number(grossAmount || 0)),
    });
    return { ok: false, mismatch: true };
  }

  if (payment.status === "PAID") {
    if (transactionId && !payment.tripay_ref) {
      await admin
        .from("payments")
        .update({ tripay_ref: transactionId })
        .eq("id", payment.id)
        .is("tripay_ref", null);
    }
    return { ok: true, alreadyPaid: true };
  }

  // Atomic claim: only ONE concurrent caller can transition status from non-PAID to PAID.
  const { data: claimed, error: claimErr } = await admin
    .from("payments")
    .update({
      status: "PAID",
      method: paymentType && typeof paymentType === "string" ? paymentType : "snap",
      tripay_ref: transactionId || payment.tripay_ref || null,
      paid_at: now,
    })
    .eq("id", payment.id)
    .neq("status", "PAID")
    .select("id")
    .maybeSingle();

  if (claimErr || !claimed) {
    return { ok: true, alreadyPaid: true };
  }

  const ucapanId = payment.ucapan_id;
  const paidAddons = sanitizeAddons(payment.addons);
  const cfg = isRecord(payment.addon_config) ? payment.addon_config : null;
  const hasSnapshot = Boolean(cfg && Object.keys(cfg).length > 0);

  // Build explicit live add-on columns strictly from the paid snapshot.
  // Explicitly resets custom_slug, touch_particles, and gate_type/gate_data when NOT purchased.
  let ucapanAddonUpdate: Record<string, unknown>;
  if (hasSnapshot) {
    ucapanAddonUpdate = buildDraftAddonColumns({
      addons: paidAddons,
      customSlug: typeof cfg?.customSlug === "string" ? cfg.customSlug : null,
      gateType: typeof cfg?.gateType === "string" ? cfg.gateType : null,
      pin: typeof cfg?.pin === "string" ? cfg.pin : null,
      question: typeof cfg?.question === "string" ? cfg.question : null,
      answer: typeof cfg?.answer === "string" ? cfg.answer : null,
      particleStyle: typeof cfg?.particleStyle === "string" ? cfg.particleStyle : null,
    });
  } else {
    // Legacy pre-v9 fallback: explicitly clear any add-on column not in paidAddons (including custom_slug!).
    ucapanAddonUpdate = {
      qr_photo_enabled: paidAddons.includes("custom_qr"),
      receipt_enabled: paidAddons.includes("love_receipt"),
      voice_note_enabled: paidAddons.includes("voice_note"),
      ...(paidAddons.includes("custom_slug") ? {} : { custom_slug: null }),
      ...(paidAddons.includes("touch_particles") ? {} : { touch_particles: null }),
      ...(paidAddons.includes("intimate_gate")
        ? {}
        : { gate_type: null, gate_data: null }),
    };
  }

  const ucapanUpdateWithClear: Record<string, unknown> = {
    paid: true,
    paid_at: now,
    updated_at: now,
    draft_addons: null,
    ...ucapanAddonUpdate,
  };

  let { error: ucapanUpdateErr } = await admin
    .from("ucapan")
    .update(ucapanUpdateWithClear)
    .eq("id", ucapanId);

  if (ucapanUpdateErr?.code === "42703") {
    delete ucapanUpdateWithClear.draft_addons;
    ({ error: ucapanUpdateErr } = await admin
      .from("ucapan")
      .update(ucapanUpdateWithClear)
      .eq("id", ucapanId));
  }

  // If a concurrent user claimed the same custom_slug while this payment was in flight,
  // still activate the ucapan without custom_slug rather than leaving a paid buyer stuck.
  if (ucapanUpdateErr?.code === "23505" && ucapanUpdateWithClear.custom_slug) {
    console.warn("[payment-activation] konflik custom_slug saat aktivasi, mengaktifkan tanpa slug", {
      ref: maskId(merchantRef),
      ucapanId: maskId(ucapanId),
    });
    ucapanUpdateWithClear.custom_slug = null;
    ({ error: ucapanUpdateErr } = await admin
      .from("ucapan")
      .update(ucapanUpdateWithClear)
      .eq("id", ucapanId));
  }

  if (ucapanUpdateErr) {
    console.error("[payment-activation] gagal update ucapan:", {
      ref: maskId(merchantRef),
      ucapanId: maskId(ucapanId),
      code: ucapanUpdateErr.code,
      message: ucapanUpdateErr.message,
      details: ucapanUpdateErr.details,
    });
  }

  // Mark abandoned-cart session recovered
  try {
    await admin
      .from("checkout_sessions")
      .update({ recovered_at: now })
      .eq("ucapan_id", ucapanId)
      .is("recovered_at", null);
  } catch {
    // non-blocking
  }

  const { data: ucapan } = await admin
    .from("ucapan")
    .select("template_slug, from_name, to_name, email, owner_id, custom_slug")
    .eq("id", ucapanId)
    .maybeSingle();

  console.info("[payment-activation] PAID + DB aktif", {
    ref: maskId(merchantRef),
    ucapanId: maskId(ucapanId),
  });

  // Settle pending referrals & redeem credits used for this payment
  if (ucapan?.owner_id) {
    try {
      const { completePendingReferrals, redeemCreditsForPayment } = await import(
        "@/lib/referral"
      );
      await completePendingReferrals(ucapan.owner_id);
      const creditUsed = Number(payment.credit_used ?? 0);
      if (creditUsed > 0 && payment.id > 0) {
        await redeemCreditsForPayment(ucapan.owner_id, payment.id, creditUsed);
      }
    } catch {
      // non-blocking
    }
  }

  // Send buyer & admin confirmation emails exactly once (inside atomic claim winner)
  if (ucapan?.email) {
    try {
      const { sendPaymentSuccessEmail, sendAdminTransactionEmail } = await import(
        "@/lib/email"
      );
      const successRes = await sendPaymentSuccessEmail({
        to: ucapan.email,
        fromName: ucapan.from_name,
        toName: ucapan.to_name,
        templateSlug: ucapan.template_slug,
        ucapanId,
        customSlug: ucapan.custom_slug,
      });
      if (!successRes.ok) {
        console.warn("[payment-activation] email pembeli gagal", {
          to: maskEmail(ucapan.email),
          error: successRes.error,
        });
      }
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const adminRes = await sendAdminTransactionEmail({
          to: adminEmail,
          fromName: ucapan.from_name,
          toName: ucapan.to_name,
          templateSlug: ucapan.template_slug,
          amount: Number(payment.amount ?? grossAmount ?? 0),
        });
        if (!adminRes.ok) {
          console.warn("[payment-activation] email admin gagal", {
            to: maskEmail(adminEmail),
            error: adminRes.error,
          });
        }
      }
    } catch {
      // non-blocking
    }
  }

  return { ok: true, alreadyPaid: false };
}

/**
 * Persists FAILED / EXPIRED status for UNPAID payments so reserved referral credits
 * are immediately released and admin reporting remains accurate.
 */
export async function markPaymentFailed(
  merchantRef: string,
  status: "FAILED" | "EXPIRED"
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("payments")
    .update({ status })
    .eq("merchant_ref", merchantRef)
    .eq("status", "UNPAID");
}
