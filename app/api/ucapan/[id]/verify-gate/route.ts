import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }

  const { id } = await params;

  // Rate limit: 10 percobaan per menit per IP
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(ip, 10, 60000);
  if (!success) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMIT_EXCEEDED", message: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429 }
    );
  }

  let body: { input: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const input = String(body.input ?? "").trim();
  if (!input) {
    return NextResponse.json({ ok: false, error: "EMPTY_INPUT" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ucapan, error } = await admin
    .from("ucapan")
    .select("gate_type, gate_data")
    .eq("id", id)
    .maybeSingle();

  if (error || !ucapan) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  if (!ucapan.gate_type || !ucapan.gate_data) {
    return NextResponse.json({ ok: false, error: "GATE_NOT_CONFIGURED" }, { status: 400 });
  }

  const isPin = ucapan.gate_type === "pin";
  let isCorrect = false;

  if (isPin) {
    const expectedPin = String(ucapan.gate_data.pin ?? "").trim();
    if (!expectedPin) {
      return NextResponse.json({ ok: false, error: "PIN_NOT_SET" }, { status: 400 });
    }
    isCorrect = input === expectedPin;
  } else {
    const expectedAnswer = String(ucapan.gate_data.answer ?? "").trim().toLowerCase();
    if (!expectedAnswer) {
      return NextResponse.json({ ok: false, error: "ANSWER_NOT_SET" }, { status: 400 });
    }
    isCorrect = input.toLowerCase() === expectedAnswer;
  }

  if (!isCorrect) {
    return NextResponse.json({ ok: false, error: "INCORRECT" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}