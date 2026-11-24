import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRemote } from "@/lib/supabase/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { attachGateUnlockCookie } from "@/lib/gate-cookie";
import { safeStringEqual } from "@/lib/gate-token";
import {
  mapUcapanRow,
  stripPublicUcapan,
  type UcapanRow,
} from "@/lib/supabase/rows";
import { asTrimmedString, isRecord, isValidUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }

  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // Dedicated namespace per ucapan + IP to prevent cross-endpoint bucket collisions & brute force.
  const ip = getClientIp(request);
  const { success } = await checkRateLimit(`gate:${id}:${ip}`, 10, 60000);
  if (!success) {
    return NextResponse.json(
      {
        ok: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: "Terlalu banyak percobaan. Coba lagi dalam 1 menit.",
      },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const input = isRecord(body) ? asTrimmedString(body.input) : null;
  if (!input || input.length > 200) {
    return NextResponse.json({ ok: false, error: "EMPTY_INPUT" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("ucapan")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const typedRow = row as UcapanRow;

  // Unpaid ucapan cannot be unlocked publicly unless accessed by its logged-in owner.
  if (!typedRow.paid) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || typedRow.owner_id !== user.id) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }
  }

  if (!typedRow.gate_type || !typedRow.gate_data) {
    return NextResponse.json({ ok: false, error: "GATE_NOT_CONFIGURED" }, { status: 400 });
  }

  const isPin = typedRow.gate_type === "pin";
  let isCorrect = false;

  if (isPin) {
    const expectedPin = String(typedRow.gate_data.pin ?? "").trim();
    if (!expectedPin) {
      return NextResponse.json({ ok: false, error: "PIN_NOT_SET" }, { status: 400 });
    }
    isCorrect = safeStringEqual(input, expectedPin);
  } else {
    const normalizeTrivia = (v: string) =>
      v.trim().replace(/\s+/g, " ").toLowerCase();
    const expectedAnswer = normalizeTrivia(String(typedRow.gate_data.answer ?? ""));
    if (!expectedAnswer) {
      return NextResponse.json({ ok: false, error: "ANSWER_NOT_SET" }, { status: 400 });
    }
    isCorrect = safeStringEqual(normalizeTrivia(input), expectedAnswer);
  }

  if (!isCorrect) {
    return NextResponse.json({ ok: false, error: "INCORRECT" }, { status: 401 });
  }

  const unlockedUcapan = stripPublicUcapan(mapUcapanRow(typedRow));
  const response = NextResponse.json({ ok: true, ucapan: unlockedUcapan });
  attachGateUnlockCookie(response, id);
  return response;
}
