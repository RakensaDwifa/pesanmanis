import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRemote } from "@/lib/supabase/config";
import {
  getAvailableCreditBalance,
  getOrCreateReferralCode,
  getReferralStats,
  applyReferralCode,
} from "@/lib/referral";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { asTrimmedString, isRecord } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function requireUser() {
  if (!isRemote()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  if (!isRemote()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      code: null,
      stats: {
        invited: 0,
        completed: 0,
        earned: 0,
        balance: 0,
        availableBalance: 0,
      },
    });
  }

  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 });
  }

  const code = await getOrCreateReferralCode(user.id);
  if (!code) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  const [stats, availableBalance] = await Promise.all([
    getReferralStats(user.id),
    getAvailableCreditBalance(user.id),
  ]);

  return NextResponse.json({
    ok: true,
    demo: false,
    code,
    stats: {
      ...stats,
      availableBalance,
    },
  });
}

export async function POST(request: Request) {
  const { success } = await checkRateLimit(
    `referral:${getClientIp(request)}`,
    10,
    60000
  );
  if (!success) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMIT_EXCEEDED" },
      { status: 429 }
    );
  }

  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const code = isRecord(body) ? asTrimmedString(body.code) : null;
  if (!code || code.length > 32) {
    return NextResponse.json({ ok: false, error: "MISSING_CODE" }, { status: 400 });
  }

  const result = await applyReferralCode(code, user.id);
  if (!result.ok) {
    const status = result.error === "INVALID" ? 404 : 409;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
