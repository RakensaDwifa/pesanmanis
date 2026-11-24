import { NextResponse } from "next/server";
import { checkMidtransStatus } from "@/lib/midtrans";
import {
  activatePaidPayment,
  markPaymentFailed,
} from "@/lib/payment-activation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { success } = await checkRateLimit(
    `payment-status:${getClientIp(request)}`,
    30,
    60000
  );
  if (!success) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMIT_EXCEEDED" },
      { status: 429 }
    );
  }

  const ref = new URL(request.url).searchParams.get("ref")?.trim();
  if (!ref || ref.length > 80) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }

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
    .select("id, ucapan_id, status")
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

  // Strict ownership check (also denies orphan rows with null owner_id).
  if (!ucapan || !ucapan.owner_id || ucapan.owner_id !== user.id) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  if (payment.status === "PAID" && ucapan.paid) {
    return NextResponse.json({ ok: true, status: "PAID" });
  }

  if (payment.status === "FAILED" || payment.status === "EXPIRED") {
    return NextResponse.json({ ok: true, status: payment.status });
  }

  const result = await checkMidtransStatus(ref);

  // Fallback atomic activation if Midtrans already settled but webhook is delayed.
  if (result.ok && result.status === "PAID" && result.grossAmount) {
    const activation = await activatePaidPayment({
      merchantRef: ref,
      grossAmount: result.grossAmount,
      paymentType: result.paymentType ?? "snap",
      transactionId: result.transactionId ?? null,
    });
    if (activation.mismatch) {
      return NextResponse.json({ ok: false, status: "PENDING" });
    }
    return NextResponse.json({ ok: true, status: "PAID" });
  }

  if (result.ok && (result.status === "FAILED" || result.status === "EXPIRED")) {
    await markPaymentFailed(ref, result.status);
  }

  return NextResponse.json({ ok: result.ok, status: result.status });
}
