import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ALLOWED_EMOJIS = new Set(["❤️", "😍", "🥰", "😭", "🤗", "👏"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: true, demo: true, reactions: [] });
  }
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reactions")
    .select("emoji, created_at")
    .eq("ucapan_id", id)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, demo: false, reactions: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }
  const { success } = await checkRateLimit(`reactions:${getClientIp(request)}`, 20, 60000);
  if (!success) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMIT_EXCEEDED" },
      { status: 429 }
    );
  }
  const { id } = await params;
  let body: { emoji?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  const emoji = (body.emoji ?? "").trim();
  if (!ALLOWED_EMOJIS.has(emoji)) {
    return NextResponse.json({ ok: false, error: "BAD_EMOJI" }, { status: 400 });
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
    .from("reactions")
    .insert({ ucapan_id: id, emoji });
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
