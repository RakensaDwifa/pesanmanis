import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { hasValidGateCookie } from "@/lib/gate-cookie";
import { asTrimmedString, isRecord, isValidUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({ ok: true, demo: true, replies: [] });
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
  if (!isValidUuid(id)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const fromName = asTrimmedString(body.fromName) ?? "";
  const message = asTrimmedString(body.message) ?? "";
  if (fromName.length < 1 || fromName.length > 60) {
    return NextResponse.json({ ok: false, error: "BAD_NAME" }, { status: 400 });
  }
  if (message.length < 1 || message.length > 1000) {
    return NextResponse.json({ ok: false, error: "BAD_MESSAGE" }, { status: 400 });
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
    .from("replies")
    .insert({ ucapan_id: id, from_name: fromName, message });
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }

  // Send throttled email notification (max 1 per 10 minutes per ucapan) to the creator.
  try {
    const { data: ucapanMeta } = await admin
      .from("ucapan")
      .select("email, from_name, to_name, title")
      .eq("id", id)
      .maybeSingle();

    if (ucapanMeta?.email) {
      const { success: allowEmail } = await checkRateLimit(
        `reply-email:${id}`,
        1,
        10 * 60 * 1000
      );
      if (allowEmail) {
        const { sendReplyNotificationEmail } = await import("@/lib/email");
        await sendReplyNotificationEmail({
          to: ucapanMeta.email,
          fromName: ucapanMeta.from_name || "Kamu",
          toName: ucapanMeta.to_name || "Penerima",
          replyFromName: fromName,
          replyMessage: message,
          ucapanTitle: ucapanMeta.title,
        });
      }
    }
  } catch {
    // non-blocking: reply is already saved
  }

  return NextResponse.json({ ok: true });
}
