import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: true, demo: true, replies: [] });
  }
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("replies")
    .select("from_name, message, created_at")
    .eq("ucapan_id", id)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, demo: false, replies: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }
  const { success } = await checkRateLimit(`replies:${getClientIp(request)}`, 10, 60000);
  if (!success) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMIT_EXCEEDED" },
      { status: 429 }
    );
  }
  const { id } = await params;
  let body: { fromName?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  const fromName = (body.fromName ?? "").trim();
  const message = (body.message ?? "").trim();
  if (fromName.length < 1 || fromName.length > 60) {
    return NextResponse.json({ ok: false, error: "BAD_NAME" }, { status: 400 });
  }
  if (message.length < 1 || message.length > 1000) {
    return NextResponse.json({ ok: false, error: "BAD_MESSAGE" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("ucapan")
    .select("id,paid")
    .eq("id", id)
    .eq("paid", true)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("replies")
    .insert({ ucapan_id: id, from_name: fromName, message });
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
