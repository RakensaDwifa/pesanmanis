import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { success } = await checkRateLimit(`views:${getClientIp(request)}`, 30, 60000);
  if (!success) {
    return NextResponse.json({ ok: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
  }

  let body: { ucapanId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  if (!body.ucapanId) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  if (!isRemote()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("ucapan")
    .select("id,paid")
    .eq("id", body.ucapanId)
    .eq("paid", true)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("views")
    .insert({ ucapan_id: body.ucapanId });

  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, demo: false });
}
