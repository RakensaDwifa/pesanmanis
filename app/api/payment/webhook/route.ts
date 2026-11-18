import { NextResponse } from "next/server";
import { isRemote } from "@/lib/supabase/config";
import { amountMatchesPaid } from "@/lib/pricing";

function maskId(id: string): string {
  if (!id || id.length <= 8) return "***";
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  return `${local[0]}***@${domain}`;
}

function maskAmount(amount: number): string {
  return `Rp ${Math.round(amount / 1000) * 1000}K+`;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json();
  const signatureKey: string = payload.signature_key ?? "";
  const orderId: string = payload.order_id ?? "";
  const statusCode: string = String(payload.status_code ?? "");
  const grossAmount: string = String(payload.gross_amount ?? "");
  const transactionStatus: string = payload.transaction_status ?? "";
  const fraudStatus: string | undefined = payload.fraud_status;
  const transactionId: string = payload.transaction_id ?? "";

  const { verifyMidtransSignature } = await import("@/lib/midtrans");

  if (!verifyMidtransSignature(orderId, statusCode, grossAmount, signatureKey)) {
    return NextResponse.json({ success: false, message: "Signature tidak valid" }, { status: 401 });
  }

  // Idempotency: cek apakah transaksi ini sudah diproses (via transaction_id)
  if (transactionId && isRemote()) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: existingPayment } = await admin
      .from("payments")
      .select("status")
      .eq("tripay_ref", transactionId)
      .maybeSingle();
    if (existingPayment?.status === "PAID") {
      console.info("[payment-webhook] idempotent skip: transaction_id sudah diproses", {
        transactionId: maskId(transactionId),
        merchantRef: maskId(orderId),
      });
      return NextResponse.json({ success: true, idempotent: true });
    }
  }

  const isPaid =
    (transactionStatus === "settlement" || transactionStatus === "capture") &&
    statusCode === "200" &&
    (!fraudStatus || fraudStatus === "accept");

  const merchantRef = orderId;
  const now = new Date().toISOString();

  if (isPaid && isRemote()) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { data: payment } = await admin
      .from("payments")
      .select("ucapan_id,status,amount,addons")
      .eq("merchant_ref", merchantRef)
      .maybeSingle();

    // Pastikan nominal yang benar-benar dibayar sama dengan yang tercatat.
    // Beda nominal = jangan aktifkan produk, tapi tetap balas 200 agar
    // Midtrans tidak mengirim ulang tanpa henti.
    if (payment && !amountMatchesPaid(grossAmount, payment.amount)) {
      console.warn("[payment-webhook] nominal tidak cocok, pembayaran diabaikan", {
        ref: maskId(merchantRef),
        expected: maskAmount(Number(payment.amount ?? 0)),
        received: maskAmount(Number(grossAmount || 0)),
      });
      return NextResponse.json({ success: true, mismatch: true });
    }

    let ucapanId: string | null = payment?.ucapan_id ?? null;

    if (!ucapanId && merchantRef.startsWith("UP-")) {
      const id8 = merchantRef.slice(3, 11);
      const { data: fallback } = await admin
        .from("ucapan")
        .select("id")
        .like("id", `${id8}%`)
        .maybeSingle();
      ucapanId = fallback?.id ?? null;
    }

    if (ucapanId) {
      const alreadyPaid = payment?.status === "PAID";
      await admin
        .from("payments")
        .update({
          status: "PAID",
          method: payload.payment_type ?? "snap",
          tripay_ref: transactionId ?? null,
          paid_at: now,
        })
        .eq("merchant_ref", merchantRef);

      if (!alreadyPaid) {
        // Sumber kebenaran add-on: baris payments, bukan payload client.
        const { sanitizeAddons } = await import("@/lib/pricing");
        const paidAddons = sanitizeAddons(payment?.addons);

        const ucapanUpdate: Record<string, unknown> = {
          paid: true,
          paid_at: now,
          updated_at: now,
          qr_photo_enabled: paidAddons.includes("custom_qr"),
          receipt_enabled: paidAddons.includes("love_receipt"),
        };

        // Hanya bersihkan bila add-on tidak dibeli; jangan hapus konfigurasi
        // yang sudah ditulis saat create untuk add-on yang memang dibayar.
        if (!paidAddons.includes("touch_particles")) {
          ucapanUpdate.touch_particles = null;
        }
        if (!paidAddons.includes("intimate_gate")) {
          ucapanUpdate.gate_type = null;
          ucapanUpdate.gate_data = null;
        }

        await admin.from("ucapan").update(ucapanUpdate).eq("id", ucapanId);
      }

      // Tandai sesi recovery selesai jika ada
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
        .select("template_slug, from_name, to_name, email, owner_id")
        .eq("id", ucapanId)
        .maybeSingle();

      console.info("[payment-webhook] PAID + DB aktif", { ref: maskId(merchantRef), ucapanId: maskId(ucapanId ?? "") });

      // Selesaikan referral pending milik pembeli (jika login & pakai kode referral)
      if (ucapan?.owner_id) {
        try {
          const { completePendingReferrals } = await import("@/lib/referral");
          await completePendingReferrals(ucapan.owner_id);
        } catch {
          // non-blocking
        }
      }

      if (ucapan?.email) {
        const { sendPaymentSuccessEmail, sendAdminTransactionEmail } = await import(
          "@/lib/email"
        );
        const successRes = await sendPaymentSuccessEmail({
          to: ucapan.email,
          fromName: ucapan.from_name,
          toName: ucapan.to_name,
          templateSlug: ucapan.template_slug,
          ucapanId,
        });
        if (!successRes.ok) {
          console.warn("[payment-webhook] email pembeli gagal", { to: maskEmail(ucapan.email), error: successRes.error });
        }
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
          const adminRes = await sendAdminTransactionEmail({
            to: adminEmail,
            fromName: ucapan.from_name,
            toName: ucapan.to_name,
            templateSlug: ucapan.template_slug,
            amount: Number(payment?.amount ?? payload.gross_amount ?? 0),
          });
          if (!adminRes.ok) {
            console.warn("[payment-webhook] email admin gagal", { to: maskEmail(adminEmail), error: adminRes.error });
          }
        }
      } else {
        console.info("[payment-webhook] tidak ada email pembeli", { ucapanId: maskId(ucapanId ?? "") });
      }
    } else {
      console.warn("[payment-webhook] PAID tetapi ucapan tidak ditemukan", {
        ref: maskId(merchantRef),
      });
    }
  } else {
    console.info("[payment-webhook] status non-PAID", {
      ref: maskId(merchantRef),
      status: transactionStatus,
      statusCode,
    });

    // Catat sesi checkout untuk abandoned-cart recovery
    if (transactionStatus === "pending" && isRemote() && merchantRef.startsWith("UP-")) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        const id8 = merchantRef.slice(3, 11);
        const { data: u } = await admin
          .from("ucapan")
          .select("id,email")
          .like("id", `${id8}%`)
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
              email: u.email ? maskEmail(u.email) : null,
              started_at: now,
            });
          }
        }
      } catch {
        // non-blocking — jangan gagalkan webhook
      }
    }
  }

  return NextResponse.json({ success: true });
}