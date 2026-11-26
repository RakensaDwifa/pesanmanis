import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkMidtransStatus } from "@/lib/midtrans";
import { activatePaidPayment, markPaymentFailed } from "@/lib/payment-activation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { asTrimmedString, isRecord } from "@/lib/validation";

export const dynamic = "force-dynamic";

const MERCHANT_REF_RE = /^[A-Za-z0-9_-]{4,100}$/;

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { success } = await checkRateLimit(`admin-sync:${getClientIp(request)}`, 20, 60000);
  if (!success) {
    return NextResponse.json(
      {
        ok: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: "Terlalu banyak permintaan sinkronisasi. Coba lagi sebentar.",
      },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const merchantRef = isRecord(body) ? asTrimmedString(body.merchantRef) : null;
  if (!merchantRef || !MERCHANT_REF_RE.test(merchantRef)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_MERCHANT_REF", message: "Format merchant_ref tidak valid." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: payment, error: fetchErr } = await admin
    .from("payments")
    .select("id, merchant_ref, status, ucapan_id, amount, tripay_ref")
    .eq("merchant_ref", merchantRef)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  if (!payment) {
    return NextResponse.json(
      { ok: false, error: "PAYMENT_NOT_FOUND", message: "Transaksi tidak ditemukan." },
      { status: 404 }
    );
  }

  if (payment.status === "PAID") {
    if (payment.ucapan_id) {
      const { data: targetUcapan } = await admin
        .from("ucapan")
        .select("paid")
        .eq("id", payment.ucapan_id)
        .maybeSingle();

      if (targetUcapan && !targetUcapan.paid) {
        const repair = await activatePaidPayment({
          merchantRef,
          grossAmount: String(payment.amount ?? 0),
          paymentType: "snap",
          transactionId: payment.tripay_ref ?? null,
        });
        if (!repair.ok) {
          return NextResponse.json(
            { ok: false, error: "ACTIVATION_FAILED", message: "Gagal memulihkan aktivasi ucapan." },
            { status: 500 }
          );
        }
        return NextResponse.json({
          ok: true,
          status: "PAID",
          activated: true,
          alreadyPaid: false,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      status: "PAID",
      activated: false,
      alreadyPaid: true,
    });
  }

  const remote = await checkMidtransStatus(merchantRef);
  if (!remote.ok || !remote.status) {
    return NextResponse.json(
      {
        ok: false,
        error: "MIDTRANS_UNREACHABLE",
        message: "Transaksi belum ditemukan di Midtrans atau koneksi bermasalah.",
      },
      { status: 502 }
    );
  }

  if (remote.status === "PAID") {
    if (!remote.grossAmount) {
      return NextResponse.json(
        { ok: false, error: "INVALID_GROSS_AMOUNT", message: "Nominal Midtrans tidak tersedia." },
        { status: 422 }
      );
    }

    const activation = await activatePaidPayment({
      merchantRef,
      grossAmount: remote.grossAmount,
      paymentType: remote.paymentType,
      transactionId: remote.transactionId,
    });

    if (activation.mismatch) {
      return NextResponse.json(
        {
          ok: false,
          error: "AMOUNT_MISMATCH",
          message: "Nominal yang dibayar di Midtrans tidak cocok dengan tagihan.",
        },
        { status: 409 }
      );
    }

    if (!activation.ok) {
      return NextResponse.json(
        { ok: false, error: "ACTIVATION_FAILED", message: "Gagal mengaktifkan ucapan." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: "PAID",
      activated: !activation.alreadyPaid,
      alreadyPaid: Boolean(activation.alreadyPaid),
    });
  }

  if (remote.status === "FAILED" || remote.status === "EXPIRED") {
    await markPaymentFailed(merchantRef, remote.status);
    return NextResponse.json({
      ok: true,
      status: remote.status,
      activated: false,
      alreadyPaid: false,
    });
  }

  return NextResponse.json({
    ok: true,
    status: "PENDING",
    activated: false,
    alreadyPaid: false,
  });
}
