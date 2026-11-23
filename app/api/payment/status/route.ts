import { NextResponse } from "next/server";
import { checkMidtransStatus } from "@/lib/midtrans";
import { amountMatchesPaid, sanitizeAddons } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref");
  if (!ref) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (isRemote()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("id, ucapan_id, status, amount, addons, credit_used")
      .eq("merchant_ref", ref)
      .maybeSingle();

    if (!payment?.ucapan_id) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const { data: ucapan } = await admin
      .from("ucapan")
      .select("owner_id, paid")
      .eq("id", payment.ucapan_id)
      .maybeSingle();

    if (!ucapan || (ucapan.owner_id && ucapan.owner_id !== user.id)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    if (payment.status === "PAID" && ucapan.paid) {
      return NextResponse.json({ ok: true, status: "PAID" });
    }

    const result = await checkMidtransStatus(ref);

    // Fallback aktivasi bila Midtrans sudah PAID tetapi webhook terlambat/terlewat
    if (
      result.ok &&
      result.status === "PAID" &&
      result.grossAmount &&
      amountMatchesPaid(result.grossAmount, payment.amount)
    ) {
      const now = new Date().toISOString();
      await admin
        .from("payments")
        .update({ status: "PAID", paid_at: now })
        .eq("merchant_ref", ref);

      const paidAddons = sanitizeAddons(payment.addons);
      const ucapanUpdate: Record<string, unknown> = {
        paid: true,
        paid_at: now,
        updated_at: now,
        qr_photo_enabled: paidAddons.includes("custom_qr"),
        receipt_enabled: paidAddons.includes("love_receipt"),
      };
      if (!paidAddons.includes("touch_particles")) {
        ucapanUpdate.touch_particles = null;
      }
      if (!paidAddons.includes("intimate_gate")) {
        ucapanUpdate.gate_type = null;
        ucapanUpdate.gate_data = null;
      }
      await admin.from("ucapan").update(ucapanUpdate).eq("id", payment.ucapan_id);

      try {
        await admin
          .from("checkout_sessions")
          .update({ recovered_at: now })
          .eq("ucapan_id", payment.ucapan_id)
          .is("recovered_at", null);
      } catch {
        // non-blocking
      }

      if (ucapan.owner_id) {
        try {
          const { completePendingReferrals, redeemCreditsForPayment } = await import(
            "@/lib/referral"
          );
          await completePendingReferrals(ucapan.owner_id);
          const creditUsed = Number((payment as { credit_used?: number }).credit_used ?? 0);
          const paymentId = Number((payment as { id?: number }).id ?? 0);
          if (creditUsed > 0 && paymentId > 0) {
            await redeemCreditsForPayment(ucapan.owner_id, paymentId, creditUsed);
          }
        } catch {
          // non-blocking
        }
      }
    }

    return NextResponse.json({ ok: result.ok, status: result.status });
  }

  const result = await checkMidtransStatus(ref);
  return NextResponse.json({ ok: result.ok, status: result.status });
}
