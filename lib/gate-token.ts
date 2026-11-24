import crypto from "node:crypto";

const TOKEN_DOMAIN = "pm-gate-unlock-v1:";
export const GATE_COOKIE_TTL_SECONDS = 2 * 60 * 60; // 2 hours

function deriveSigningKey(secret: string): Buffer {
  return crypto
    .createHash("sha256")
    .update(`${TOKEN_DOMAIN}${secret}`)
    .digest();
}

export function gateCookieName(ucapanId: string): string {
  const safeId = ucapanId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  return `pm_gate_${safeId}`;
}

/**
 * Creates a stateless HMAC-SHA256 signed token scoped to a specific ucapanId and expiration timestamp.
 */
export function createGateUnlockToken(
  ucapanId: string,
  secret: string,
  nowMs = Date.now(),
  ttlSeconds = GATE_COOKIE_TTL_SECONDS
): string {
  const exp = Math.floor(nowMs / 1000) + ttlSeconds;
  const payload = `${ucapanId}.${exp}`;
  const sig = crypto
    .createHmac("sha256", deriveSigningKey(secret))
    .update(payload)
    .digest("base64url");
  return `${exp}.${sig}`;
}

/**
 * Verifies a signed gate unlock token using constant-time HMAC comparison.
 */
export function verifyGateUnlockToken(
  ucapanId: string,
  token: string | undefined | null,
  secret: string,
  nowMs = Date.now()
): boolean {
  if (!ucapanId || !token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expRaw, receivedSig] = parts;
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp <= Math.floor(nowMs / 1000)) return false;

  const payload = `${ucapanId}.${exp}`;
  const expectedSig = crypto
    .createHmac("sha256", deriveSigningKey(secret))
    .update(payload)
    .digest("base64url");

  const a = Buffer.from(expectedSig, "utf8");
  const b = Buffer.from(receivedSig, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Constant-time string comparison for PIN / gate answers.
 */
export function safeStringEqual(left: string, right: string): boolean {
  const hashA = crypto.createHash("sha256").update(left, "utf8").digest();
  const hashB = crypto.createHash("sha256").update(right, "utf8").digest();
  return crypto.timingSafeEqual(hashA, hashB);
}
