import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { buildDraftAddonColumns, mapUcapanRow, stripPublicUcapan, toUcapanRow, validateUcapanInput } from "@/lib/supabase/rows";
import type { UcapanRow, UcapanStatsRow } from "@/lib/supabase/rows";
import type { UcapanContent } from "@/lib/types";

export const dynamic = "force-dynamic";

const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface FetchResult {
  ucapan: ReturnType<typeof mapUcapanRow> | null;
  user: { id: string } | null;
}

async function fetchUcapanAdmin(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ucapan")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const { data: stats } = await supabase
    .from("ucapan_stats")
    .select("ucapan_id, total_views, first_view_at, last_view_at")
    .eq("ucapan_id", id)
    .maybeSingle();

  return mapUcapanRow(data as UcapanRow, stats as UcapanStatsRow | null);
}

async function fetchUcapan(id: string): Promise<FetchResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase.from("ucapan").select("*").eq("id", id);
  if (!user) {
    query = query.eq("paid", true);
  }
  const { data, error } = await query.maybeSingle();
  if (error || !data) return { ucapan: null, user };

  const { data: stats } = await supabase
    .from("ucapan_stats")
    .select("ucapan_id, total_views, first_view_at, last_view_at")
    .eq("ucapan_id", id)
    .maybeSingle();

  return {
    ucapan: mapUcapanRow(data as UcapanRow, stats as UcapanStatsRow | null),
    user,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: true, demo: true, ucapan: null });
  }
  const { id } = await params;
  const { ucapan } = await fetchUcapan(id);
  if (ucapan) {
    return NextResponse.json({ ok: true, demo: false, ucapan });
  }
  // Pembaca publik (bukan pemilik): hanya boleh baca ucapan yang sudah paid, tanpa email & PIN
  const publicUcapan = await fetchUcapanAdmin(id);
  if (!publicUcapan || !publicUcapan.paid) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    demo: false,
    ucapan: stripPublicUcapan(publicUcapan),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const { ucapan, user } = await fetchUcapan(id);
  if (!user) {
    return NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 });
  }
  if (!ucapan) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const supabase = await createClient();

  const reference = ucapan.paidAt ?? ucapan.createdAt;
  if (ucapan.paid && Date.now() - reference > EDIT_WINDOW_MS) {
    return NextResponse.json(
      { ok: false, error: "EDIT_WINDOW_EXPIRED" },
      { status: 403 }
    );
  }

  // Validasi input
  const validation = validateUcapanInput(body as Partial<UcapanContent>);
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.reason }, { status: 400 });
  }

  // Jika belum dibayar, izinkan pemilik memperbarui pilihan add-on dari Builder
  const addonCols = !ucapan.paid
    ? buildDraftAddonColumns({
        addons: body.addons,
        customSlug: typeof body.customSlug === "string" ? body.customSlug : null,
        pin: typeof body.pin === "string" ? body.pin : null,
        particleStyle: typeof body.particleStyle === "string" ? body.particleStyle : null,
      })
    : {};

  const admin = createAdminClient();
  if (addonCols.custom_slug) {
    const { data: taken } = await admin
      .from("ucapan")
      .select("id")
      .eq("custom_slug", addonCols.custom_slug)
      .neq("id", id)
      .maybeSingle();
    if (taken) addonCols.custom_slug = null;
  }

  const client = Object.keys(addonCols).length > 0 ? admin : supabase;
  const { error } = await client
    .from("ucapan")
    .update({
      ...toUcapanRow(body as Partial<UcapanContent>),
      ...addonCols,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }
  const { id } = await params;
  const { ucapan, user } = await fetchUcapan(id);
  if (!user) {
    return NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 });
  }
  if (!ucapan) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // Bersihkan file foto di bucket 'foto' Supabase Storage sebelum baris dihapus,
  // namun jangan hapus foto yang masih direferensikan oleh ucapan lain (misal hasil duplikat).
  const marker = "/storage/v1/object/public/foto/";
  const extractPath = (url: unknown) => {
    if (typeof url !== "string") return null;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
  };
  const candidatePaths = (ucapan.photos ?? [])
    .map(extractPath)
    .filter((p): p is string => Boolean(p));

  if (candidatePaths.length > 0) {
    try {
      const admin = createAdminClient();
      const { data: siblingRows } = await admin
        .from("ucapan")
        .select("photos")
        .eq("owner_id", user.id)
        .neq("id", id);

      const usedBySiblings = new Set<string>();
      for (const row of siblingRows ?? []) {
        const photos = (row as { photos?: string[] | null }).photos ?? [];
        for (const p of photos) {
          const sp = extractPath(p);
          if (sp) usedBySiblings.add(sp);
        }
      }

      const safeToRemove = candidatePaths.filter((p) => !usedBySiblings.has(p));
      if (safeToRemove.length > 0) {
        await admin.storage.from("foto").remove(safeToRemove);
      }
    } catch {
      // non-blocking: tetap lanjut hapus baris ucapan
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ucapan").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
