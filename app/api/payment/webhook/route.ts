import { NextResponse } from "next/server";
import { isRemote } from "@/lib/supabase/config";
import {
  activatePaidPayment,
  markPaymentFailed,
  maskId,
} from "@/lib/payment-activation";
import { isRecord } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  if (!isRecord(payload)) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const signatureKey = String(payload.signature_key ?? "");
  const orderId = String(payload.order_id ?? "");
  const statusCode = String(payload.status_code ?? "");
  const grossAmount = String(payload.gross_amount ?? "");
  const transactionStatus = String(payload.transaction_status ?? "");
  const fraudStatus =
    typeof payload.fraud_status === "string" ? payload.fraud_status : undefined;
  const transactionId =
    typeof payload.transaction_id === "string" && payload.transaction_id.trim()
      ? payload.transaction_id.trim()
      : null;
  const paymentType =
    typeof payload.payment_type === "string" ? payload.payment_type : null;

  const { verifyMidtransSignature } = await import("@/lib/midtrans-signature");

  if (!verifyMidtransSignature(orderId, statusCode, grossAmount, signatureKey)) {
    return NextResponse.json(
      { success: false, message: "Signature tidak valid" },
      { status: 401 }
    );
  }

  if (!isRemote()) {
    return NextResponse.json({ success: true });
  }

  // Fast idempotency check by Midtrans transaction_id — only skip if ucapan is already active too.
  if (transactionId) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: existingPayment } = await admin
      .from("payments")
      .select("status, ucapan_id")
      .eq("tripay_ref", transactionId)
      .maybeSingle();
    if (existingPayment?.status === "PAID" && existingPayment.ucapan_id) {
      const { data: existingUcapan } = await admin
        .from("ucapan")
        .select("paid")
        .eq("id", existingPayment.ucapan_id)
        .maybeSingle();
      if (existingUcapan?.paid) {
        console.info("[payment-webhook] idempotent skip: transaction_id sudah diproses", {
          transactionId: maskId(transactionId),
          merchantRef: maskId(orderId),
        });
        return NextResponse.json({ success: true, idempotent: true });
      }
    }
  }

  const isPaid =
    (transactionStatus === "settlement" || transactionStatus === "capture") &&
    statusCode === "200" &&
    (!fraudStatus || fraudStatus === "accept");

  if (isPaid) {
    const res = await activatePaidPayment({
      merchantRef: orderId,
      grossAmount,
      paymentType,
      transactionId,
    });
    if (res.mismatch) {
      // Return 200 so Midtrans does not retry endlessly on tampered/mismatched amounts.
      return NextResponse.json({ success: true, mismatch: true });
    }
    if (res.notFound) {
      return NextResponse.json({ success: true, notFound: true });
    }
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: "ACTIVATION_RETRY_NEEDED" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      idempotent: Boolean(res.alreadyPaid),
    });
  }

  console.info("[payment-webhook] status non-PAID", {
    ref: maskId(orderId),
    status: transactionStatus,
    statusCode,
  });

  if (transactionStatus === "expire") {
    await markPaymentFailed(orderId, "EXPIRED");
  } else if (["cancel", "deny"].includes(transactionStatus)) {
    await markPaymentFailed(orderId, "FAILED");
  } else if (transactionStatus === "pending" && orderId.startsWith("UP-")) {
    // Ensure abandoned-cart session is recorded if not created at payment/create
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { data: payRow } = await admin
        .from("payments")
        .select("ucapan_id")
        .eq("merchant_ref", orderId)
        .maybeSingle();
      if (payRow?.ucapan_id) {
        const { data: u } = await admin
          .from("ucapan")
          .select("id,email")
          .eq("id", payRow.ucapan_id)
          .maybeSingle();
        if (u?.id) {
          const { data: existing } = await admin
            .from("checkout_sessions")
            .select("id")
            .eq("ucapan_id", u.id)
            .limit(1)
            .maybeSingle();
          if (!existing) {
            await admin.from("checkout_sessions").insert({
              ucapan_id: u.id,
              email: u.email ?? null,
              started_at: new Date().toISOString(),
            });
          }
        }
      }
    } catch {
      // non-blocking
    }
  }

  return NextResponse.json({ success: true });
}
