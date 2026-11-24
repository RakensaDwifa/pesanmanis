import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRemote } from "@/lib/supabase/config";
import {
  buildDraftAddonState,
  mapUcapanRow,
  toUcapanRow,
  validateUcapanInput,
} from "@/lib/supabase/rows";
import type { UcapanRow, UcapanStatsRow } from "@/lib/supabase/rows";
import type { UcapanContent } from "@/lib/types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isRecord } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isRemote()) {
    return NextResponse.json({ ok: true, demo: true, ucapans: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("ucapan")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }

  const ids = (rows as UcapanRow[]).map((r) => r.id);

  const [{ data: statsRows }, { data: reactionRows }, { data: replyRows }] =
    ids.length > 0
      ? await Promise.all([
          supabase
            .from("ucapan_stats")
            .select("ucapan_id, total_views, first_view_at, last_view_at")
            .in("ucapan_id", ids),
          supabase
            .from("reactions")
            .select("ucapan_id, emoji, created_at")
            .in("ucapan_id", ids)
            .order("created_at", { ascending: true }),
          supabase
            .from("replies")
            .select("ucapan_id, from_name, message, created_at")
            .in("ucapan_id", ids)
            .order("created_at", { ascending: true }),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  const statsByUcapan = new Map<string, UcapanStatsRow>(
    (statsRows as UcapanStatsRow[] | null)?.map((s) => [s.ucapan_id, s]) ?? []
  );

  const reactionsByUcapan = new Map<string, Record<string, number>>();
  for (const r of (reactionRows ?? []) as { ucapan_id: string; emoji: string }[]) {
    const bucket = reactionsByUcapan.get(r.ucapan_id) ?? {};
    bucket[r.emoji] = (bucket[r.emoji] ?? 0) + 1;
    reactionsByUcapan.set(r.ucapan_id, bucket);
  }

  const repliesByUcapan = new Map<
    string,
    { fromName: string; message: string; createdAt: string }[]
  >();
  for (const p of (replyRows ?? []) as {
    ucapan_id: string;
    from_name: string;
    message: string;
    created_at: string;
  }[]) {
    const list = repliesByUcapan.get(p.ucapan_id) ?? [];
    list.push({
      fromName: p.from_name,
      message: p.message,
      createdAt: p.created_at,
    });
    repliesByUcapan.set(p.ucapan_id, list);
  }

  const ucapans = (rows as UcapanRow[]).map((row) => ({
    ...mapUcapanRow(row, statsByUcapan.get(row.id)),
    reactions: reactionsByUcapan.get(row.id) ?? {},
    replies: repliesByUcapan.get(row.id) ?? [],
  }));

  return NextResponse.json({ ok: true, demo: false, ucapans });
}

export async function POST(request: Request) {
  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }

  const { success } = await checkRateLimit(`ucapan-create:${getClientIp(request)}`, 5, 60000);
  if (!success) {
    return NextResponse.json(
      {
        ok: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: "Terlalu banyak permintaan. Coba lagi dalam 1 menit.",
      },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 });
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

  const validation = validateUcapanInput(body);
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.reason }, { status: 400 });
  }

  const draftAddons = buildDraftAddonState({
    addons: body.addons,
    customSlug: typeof body.customSlug === "string" ? body.customSlug : null,
    gateType: typeof body.gateType === "string" ? body.gateType : null,
    pin: typeof body.pin === "string" ? body.pin : null,
    question: typeof body.question === "string" ? body.question : null,
    answer: typeof body.answer === "string" ? body.answer : null,
    particleStyle: typeof body.particleStyle === "string" ? body.particleStyle : null,
  });

  const basePayload: Record<string, unknown> = {
    owner_id: user.id,
    ...toUcapanRow(body as Partial<UcapanContent>),
  };

  const insertPayload =
    draftAddons !== null
      ? { ...basePayload, draft_addons: draftAddons }
      : basePayload;

  // Use user-scoped Supabase client so RLS and BEFORE INSERT trigger are enforced.
  let { data, error } = await supabase
    .from("ucapan")
    .insert(insertPayload)
    .select("id")
    .single();

  // Graceful fallback if schema_v9 draft_addons column has not been applied yet.
  if (error?.code === "42703" && "draft_addons" in insertPayload) {
    console.warn("[ucapan-create] kolom draft_addons belum tersedia, menyimpan tanpa draft_addons");
    ({ data, error } = await supabase
      .from("ucapan")
      .insert(basePayload)
      .select("id")
      .single());
  }

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
