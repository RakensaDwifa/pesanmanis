import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRemote } from "@/lib/supabase/config";
import type { UcapanRow } from "@/lib/supabase/rows";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getTemplate } from "@/lib/templates";
import { isRecord, isValidUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const COPY_SUFFIX = " (Salinan)";
const MAX_TITLE_LENGTH = 120;

function makeClonedTitle(rawTitle: string | null | undefined): string {
  const base = (rawTitle ?? "").trim() || "Untuk Kamu";
  const maxBaseLen = MAX_TITLE_LENGTH - COPY_SUFFIX.length;
  const trimmedBase = base.length > maxBaseLen ? base.slice(0, maxBaseLen).trimEnd() : base;
  return `${trimmedBase}${COPY_SUFFIX}`;
}

export async function POST(request: Request) {
  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }

  const { success } = await checkRateLimit(`clone:${getClientIp(request)}`, 10, 60000);
  if (!success) {
    return NextResponse.json({ ok: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const sourceId = isRecord(body) ? body.id : undefined;
  if (!isValidUuid(sourceId)) {
    return NextResponse.json({ ok: false, error: "MISSING_ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 });
  }

  // Fetch sumber — hanya milik user ini
  const { data: source, error: fetchErr } = await supabase
    .from("ucapan")
    .select("*")
    .eq("id", sourceId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (fetchErr || !source) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const src = source as UcapanRow;
  if (!getTemplate(src.template_slug)?.active) {
    return NextResponse.json(
      {
        ok: false,
        error: "TEMPLATE_UNAVAILABLE",
        message: "Template ucapan ini belum tersedia untuk diduplikat.",
      },
      { status: 400 }
    );
  }
  const now = new Date().toISOString();

  // Clone: konten sama, status unpaid, judul dibatasi <= 120 karakter
  const { data: clone, error: insertErr } = await supabase
    .from("ucapan")
    .insert({
      owner_id: user.id,
      template_slug: src.template_slug,
      to_name: src.to_name,
      from_name: src.from_name,
      title: makeClonedTitle(src.title),
      message: src.message,
      photos: src.photos ?? [],
      music_url: src.music_url,
      email: src.email,
      timeline: src.timeline,
      paid: false,
      paid_at: null,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insertErr || !clone) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: clone.id });
}
