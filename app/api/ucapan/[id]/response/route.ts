import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { canAccessPublicUcapan } from "@/lib/public-ucapan-access";
import { validateRecipientResponseInput } from "@/lib/supabase/rows";
import type { RecipientResponse } from "@/lib/types";
import { isValidUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }

  const { success } = await checkRateLimit(
    `response:${getClientIp(request)}`,
    10,
    60000
  );
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

  const validation = validateRecipientResponseInput(body);
  if (!validation.valid) {
    return NextResponse.json(
      { ok: false, error: validation.reason },
      { status: 400 }
    );
  }

  const access = await canAccessPublicUcapan(id);
  if (access === "not_found") {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (access === "locked") {
    return NextResponse.json({ ok: false, error: "LOCKED" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: targetRow, error: fetchErr } = await admin
    .from("ucapan")
    .select("template_slug, recipient_response")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    if (fetchErr.code === "42703") {
      console.warn(
        "[recipient-response] kolom recipient_response belum ada di DB (schema_v9 perlu dijalankan)"
      );
      return NextResponse.json({ ok: true, persisted: false });
    }
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  if (!targetRow || targetRow.template_slug !== "permintaan-maaf") {
    return NextResponse.json(
      { ok: false, error: "INVALID_TEMPLATE" },
      { status: 400 }
    );
  }
  if (targetRow.recipient_response !== null && targetRow.recipient_response !== undefined) {
    return NextResponse.json({
      ok: true,
      persisted: false,
      alreadyRecorded: true,
      response: targetRow.recipient_response,
    });
  }

  const payload: RecipientResponse = {
    ...validation.data,
    respondedAt: Date.now(),
  };

  const { error } = await admin
    .from("ucapan")
    .update({ recipient_response: payload })
    .eq("id", id)
    .is("recipient_response", null);

  if (error) {
    if (error.code === "42703") {
      console.warn(
        "[recipient-response] kolom recipient_response belum ada di DB (schema_v9 perlu dijalankan)"
      );
      return NextResponse.json({ ok: true, persisted: false });
    }
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persisted: true, response: payload });
}
