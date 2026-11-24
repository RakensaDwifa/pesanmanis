import "server-only";
import { verifyMidtransSignature } from "./midtrans-signature";
import { normalizeBaseUrl } from "./validation";

export { verifyMidtransSignature };

const MIDTRANS_MODE = () => process.env.MIDTRANS_MODE ?? "sandbox";

const SNAP_URL = () =>
  MIDTRANS_MODE() === "production"
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

const API_URL = () =>
  MIDTRANS_MODE() === "production"
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";

export function midtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY);
}

export async function createSnapTransaction(input: {
  ucapanId: string;
  merchantRef: string;
  templateSlug: string;
  customerName: string;
  customerEmail?: string;
  /** Nominal final dari server (lihat lib/pricing-server.ts). */
  amount: number;
}): Promise<{ ok: boolean; paymentUrl?: string; error?: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    return { ok: false, error: "PAYMENT_NOT_CONFIGURED" };
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "INVALID_AMOUNT" };
  }

  const authString = Buffer.from(`${serverKey}:`).toString("base64");
  const baseUrl = normalizeBaseUrl(
    process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000"
  );
  const callbackUrl =
    process.env.MIDTRANS_CALLBACK_URL?.trim() ||
    `${baseUrl}/api/payment/webhook`;
  const returnUrl = `${baseUrl}/checkout/${encodeURIComponent(input.ucapanId)}/selesai?ref=${encodeURIComponent(input.merchantRef)}`;
  const safeName = String(input.customerName ?? "Pelanggan").trim().slice(0, 50) || "Pelanggan";
  const safeEmail = input.customerEmail?.trim() || "pelanggan@pesanmanis.com";

  try {
    const res = await fetch(SNAP_URL(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
        "X-Override-Notification": callbackUrl,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: input.merchantRef,
          gross_amount: input.amount,
        },
        item_details: [
          {
            id: `TEMPLATE-${input.templateSlug}`,
            price: input.amount,
            quantity: 1,
            name: `Template Ucapan (${input.templateSlug})`,
          },
        ],
        customer_details: {
          first_name: safeName,
          email: safeEmail,
        },
        enabled_payments: ["qris", "gopay", "shopeepay", "ovo", "dana"],
        callbacks: {
          finish: returnUrl,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const json = await res.json();
    if (!res.ok || !json.token) {
      return {
        ok: false,
        error: json.message ?? json.error_messages?.[0] ?? "MIDTRANS_ERROR",
      };
    }

    return {
      ok: true,
      paymentUrl: json.redirect_url ?? undefined,
    };
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export async function checkMidtransStatus(orderId: string): Promise<{
  ok: boolean;
  status?: "PAID" | "PENDING" | "FAILED" | "EXPIRED";
  grossAmount?: string;
  paymentType?: string;
  transactionId?: string;
}> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return { ok: false };

  const authString = Buffer.from(`${serverKey}:`).toString("base64");

  try {
    const res = await fetch(`${API_URL()}/${encodeURIComponent(orderId)}/status`, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${authString}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const json = await res.json();
    if (!res.ok) return { ok: false };

    const txStatus = json.transaction_status;
    const fraudStatus = json.fraud_status;
    let normalized: "PAID" | "PENDING" | "FAILED" | "EXPIRED" = "PENDING";
    if (
      (txStatus === "settlement" || txStatus === "capture") &&
      (!fraudStatus || fraudStatus === "accept")
    ) {
      normalized = "PAID";
    } else if (txStatus === "expire") {
      normalized = "EXPIRED";
    } else if (["cancel", "deny"].includes(txStatus)) {
      normalized = "FAILED";
    }

    return {
      ok: true,
      status: normalized,
      grossAmount: json.gross_amount ? String(json.gross_amount) : undefined,
      paymentType:
        typeof json.payment_type === "string" ? json.payment_type : undefined,
      transactionId:
        typeof json.transaction_id === "string" ? json.transaction_id : undefined,
    };
  } catch {
    return { ok: false };
  }
}
