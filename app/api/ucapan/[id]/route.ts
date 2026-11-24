import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote, supabaseUrl } from "@/lib/supabase/config";
import {
  buildDraftAddonState,
  mapUcapanRow,
  stripLockedUcapan,
  stripPublicUcapan,
  toUcapanRow,
  validateUcapanInput,
} from "@/lib/supabase/rows";
import type { UcapanRow, UcapanStatsRow } from "@/lib/supabase/rows";
import type { UcapanContent } from "@/lib/types";
import { hasValidGateCookie } from "@/lib/gate-cookie";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  extractOwnedFotoStoragePath,
  isRecord,
  isValidUuid,
} from "@/lib/validation";

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

async function fetchOwnedUcapan(id: string): Promise<FetchResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ucapan: null, user: null };

  const { data, error } = await supabase
    .from("ucapan")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
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
  if (!isValidUuid(id)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // Owner always gets full ucapan details (for Builder edit / Checkout / Dashboard).
  const { ucapan } = await fetchOwnedUcapan(id);
  if (ucapan) {
    return NextResponse.json({ ok: true, demo: false, ucapan });
  }

  // Public reader: only paid ucapan; redact content if Intimate Gate is active and locked.
  const publicUcapan = await fetchUcapanAdmin(id);
  if (!publicUcapan || !publicUcapan.paid) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const isLocked = Boolean(publicUcapan.gateType) && !(await hasValidGateCookie(id));
  return NextResponse.json({
    ok: true,
    demo: false,
    ucapan: isLocked
      ? stripLockedUcapan(publicUcapan)
      : stripPublicUcapan(publicUcapan),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }

  const { success } = await checkRateLimit(`ucapan-write:${getClientIp(request)}`, 20, 60000);
  if (!success) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMIT_EXCEEDED", message: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429 }
    );
  }

  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const { ucapan, user } = await fetchOwnedUcapan(id);
  if (!user) {
    return NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 });
  }
  if (!ucapan) {
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

  const reference = ucapan.paidAt ?? ucapan.createdAt;
  if (ucapan.paid && Date.now() - reference > EDIT_WINDOW_MS) {
    return NextResponse.json(
      { ok: false, error: "EDIT_WINDOW_EXPIRED" },
      { status: 403 }
    );
  }

  const validation = validateUcapanInput(body);
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.reason }, { status: 400 });
  }

  // Unpaid drafts save add-on preferences in `draft_addons` without touching live paid columns.
  const draftAddons = !ucapan.paid
    ? buildDraftAddonState({
        addons: body.addons,
        customSlug: typeof body.customSlug === "string" ? body.customSlug : null,
        gateType: typeof body.gateType === "string" ? body.gateType : null,
        pin: typeof body.pin === "string" ? body.pin : null,
        question: typeof body.question === "string" ? body.question : null,
        answer: typeof body.answer === "string" ? body.answer : null,
        particleStyle: typeof body.particleStyle === "string" ? body.particleStyle : null,
      })
    : null;

  const baseUpdate: Record<string, unknown> = {
    ...toUcapanRow(body as Partial<UcapanContent>),
    updated_at: new Date().toISOString(),
  };

  const updatePayload =
    !ucapan.paid && draftAddons !== null
      ? { ...baseUpdate, draft_addons: draftAddons }
      : baseUpdate;

  // Always update via user-scoped client so RLS and DB triggers protect paid columns.
  const supabase = await createClient();
  let { error } = await supabase
    .from("ucapan")
    .update(updatePayload)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error?.code === "42703" && "draft_addons" in updatePayload) {
    console.warn("[ucapan-update] kolom draft_addons belum tersedia, memperbarui tanpa draft_addons");
    ({ error } = await supabase
      .from("ucapan")
      .update(baseUpdate)
      .eq("id", id)
      .eq("owner_id", user.id));
  }

  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRemote()) {
    return NextResponse.json({ ok: false, error: "DEMO_MODE" }, { status: 400 });
  }

  const { success } = await checkRateLimit(`ucapan-delete:${getClientIp(request)}`, 15, 60000);
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

  const { ucapan, user } = await fetchOwnedUcapan(id);
  if (!user) {
    return NextResponse.json({ ok: false, error: "NEED_LOGIN" }, { status: 401 });
  }
  if (!ucapan) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const supabase = await createClient();
  const configuredUrl = supabaseUrl();

  // Only consider Storage paths strictly belonging to this user's own folder (<user.id>/...)
  // and skip any photo still referenced by another ucapan owned by the same user (e.g. cloned).
  const candidatePaths = (ucapan.photos ?? [])
    .map((url) => extractOwnedFotoStoragePath(url, configuredUrl, user.id))
    .filter((p): p is string => Boolean(p));

  if (candidatePaths.length > 0) {
    try {
      const { data: siblingRows } = await supabase
        .from("ucapan")
        .select("photos")
        .eq("owner_id", user.id)
        .neq("id", id);

      const usedBySiblings = new Set<string>();
      for (const row of siblingRows ?? []) {
        const photos = (row as { photos?: string[] | null }).photos ?? [];
        for (const p of photos) {
          const sp = extractOwnedFotoStoragePath(p, configuredUrl, user.id);
          if (sp) usedBySiblings.add(sp);
        }
      }

      const safeToRemove = candidatePaths.filter((p) => !usedBySiblings.has(p));
      if (safeToRemove.length > 0) {
        // Delete via user-scoped client so Storage RLS enforces ownership as defense-in-depth.
        await supabase.storage.from("foto").remove(safeToRemove);
      }
    } catch {
      // non-blocking: still delete the ucapan row
    }
  }

  const { error } = await supabase
    .from("ucapan")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
