import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRemote } from "@/lib/supabase/config";
import { checkRateLimit } from "@/lib/rate-limit";

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
  const ip =
    request.headers.get("x-vercel-ip") ||
    (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1");
  const { success } = await checkRateLimit(ip, 10, 60000);
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
  const supabase = await createClient();
  const { error } = await supabase
    .from("replies")
    .insert({ ucapan_id: id, from_name: fromName, message });
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
