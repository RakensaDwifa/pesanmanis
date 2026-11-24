import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  GATE_COOKIE_TTL_SECONDS,
  createGateUnlockToken,
  gateCookieName,
  verifyGateUnlockToken,
} from "./gate-token";

function signingSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.MIDTRANS_SERVER_KEY ??
    ""
  );
}

export async function hasValidGateCookie(ucapanId: string): Promise<boolean> {
  const secret = signingSecret();
  if (!secret) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(gateCookieName(ucapanId))?.value;
  return verifyGateUnlockToken(ucapanId, token, secret);
}

export function attachGateUnlockCookie(
  response: NextResponse,
  ucapanId: string
): void {
  const secret = signingSecret();
  if (!secret) return;
  const token = createGateUnlockToken(ucapanId, secret);
  response.cookies.set(gateCookieName(ucapanId), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GATE_COOKIE_TTL_SECONDS,
  });
}
