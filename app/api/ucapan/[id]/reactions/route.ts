import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { canAccessPublicUcapan } from "@/lib/public-ucapan-access";
import { asTrimmedString, isRecord, isValidUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const ALLOWED_EMOJIS = new Set(["❤️", "😍", "🥰", "😭", "🤗", "👏"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: true, demo: true, reactions: [] });
  }
  const { success } = await checkRateLimit(`reactions-read:${getClientIp(request)}`, 60, 60000);
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
