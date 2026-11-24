import crypto from "node:crypto";

/**
 * Verifies Midtrans webhook notification SHA-512 signature using constant-time comparison.
 * Formula: SHA512(order_id + status_code + gross_amount + serverKey)
 */
export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  receivedSignature: string
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
  if (!serverKey || !receivedSignature) return false;

  const raw = orderId + statusCode + grossAmount + serverKey;
  const computed = crypto.createHash("sha512").update(raw).digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(receivedSignature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
