import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { hasValidGateCookie } from "@/lib/gate-cookie";
import { isRecord, isValidUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { success } = await checkRateLimit(`views:${getClientIp(request)}`, 30, 60000);
  if (!success) {
    return NextResponse.json({ ok: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const ucapanId = isRecord(body) ? body.ucapanId : undefined;
  if (!isValidUuid(ucapanId)) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  if (!isRemote()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("ucapan")
    .select("id, paid, gate_type")
    .eq("id", ucapanId)
    .eq("paid", true)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Delay view count until Intimate Gate has been unlocked.
  if (target.gate_type && !(await hasValidGateCookie(ucapanId))) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error } = await admin
    .from("views")
    .insert({ ucapan_id: ucapanId });

  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, demo: false });
}
