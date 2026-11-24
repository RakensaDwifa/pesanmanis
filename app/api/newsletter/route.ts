import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { asTrimmedString, isRecord, isValidEmail } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { success } = await checkRateLimit(`newsletter:${getClientIp(request)}`, 5, 60000);
  if (!success) {
    return NextResponse.json({ ok: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
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

  const rawEmail = asTrimmedString(body.email);
  if (!rawEmail || !isValidEmail(rawEmail)) {
    return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
  }
  const email = rawEmail.toLowerCase();

  if (!isRemote()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("newsletter_subscribers").upsert(
    {
      email,
      source: body.source === "exit-intent" ? "exit-intent" : "footer",
    },
    { onConflict: "email", ignoreDuplicates: true }
  );

  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
