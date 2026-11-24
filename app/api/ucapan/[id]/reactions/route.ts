import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { hasValidGateCookie } from "@/lib/gate-cookie";
import { asTrimmedString, isRecord, isValidUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const ALLOWED_EMOJIS = new Set(["❤️", "😍", "🥰", "😭", "🤗", "👏"]);

async function canAccessPublicUcapan(id: string): Promise<"ok" | "not_found" | "locked"> {
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("ucapan")
    .select("id, paid, gate_type, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (!target) return "not_found";

  if (!target.paid) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && target.owner_id === user.id) return "ok";
    return "not_found";
  }

  if (target.gate_type) {
    if (await hasValidGateCookie(id)) return "ok";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && target.owner_id === user.id) return "ok";
    return "locked";
  }

  return "ok";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: true, demo: true, reactions: [] });
  }
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const access = await canAccessPublicUcapan(id);
  if (access === "not_found") {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (access === "locked") {
    return NextResponse.json({ ok: false, error: "LOCKED" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
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
  if (!isValidUuid(id)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  const emoji = isRecord(body) ? asTrimmedString(body.emoji) : null;
  if (!emoji || !ALLOWED_EMOJIS.has(emoji)) {
    return NextResponse.json({ ok: false, error: "BAD_EMOJI" }, { status: 400 });
  }

  const access = await canAccessPublicUcapan(id);
  if (access === "not_found") {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (access === "locked") {
    return NextResponse.json({ ok: false, error: "LOCKED" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("reactions")
    .insert({ ucapan_id: id, emoji });
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
