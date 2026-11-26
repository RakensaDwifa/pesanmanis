import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { supabaseUrl } from "@/lib/supabase/config";
import { deleteR2Objects, getR2PublicBaseUrl, isR2Configured } from "@/lib/r2";
import {
  CLEANUP_BATCH_LIMIT,
  UNPAID_RETENTION_MS,
  collectSafeCleanupStoragePaths,
  isDraftEligibleForCleanup,
  type CleanupDraftCandidate,
  type CleanupPaymentGuardRecord,
  type CleanupSiblingMediaRow,
} from "./cleanup-unpaid-policy";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface CleanupUnpaidSummary {
  ok: boolean;
  cleanedDrafts: number;
  cleanedStorageFiles: number;
  skippedByPaymentGuard: number;
  failed: number;
  error?: string;
}

/**
 * Deletes expired unpaid ucapan drafts (`paid = false` older than UNPAID_RETENTION_DAYS)
 * along with owned Storage assets in `foto` and `musik`, while preserving:
 * - all `paid = true` ucapan forever
 * - drafts edited within the retention window
 * - drafts linked to any `PAID` payment or any payment created < 24h ago
 * - Storage files still referenced by sibling ucapan rows of the same owner
 */
export async function cleanupExpiredUnpaidDrafts(
  admin: AdminClient,
  nowMs: number = Date.now()
): Promise<CleanupUnpaidSummary> {
  const cutoffIso = new Date(nowMs - UNPAID_RETENTION_MS).toISOString();

  const { data: candidatesRaw, error: candError } = await admin
    .from("ucapan")
    .select("id, owner_id, photos, music_url, timeline, paid, created_at, updated_at")
    .eq("paid", false)
    .lt("created_at", cutoffIso)
    .lt("updated_at", cutoffIso)
    .order("created_at", { ascending: true })
    .limit(CLEANUP_BATCH_LIMIT);

  if (candError) {
    console.warn("[cleanup-unpaid] gagal membaca kandidat draft:", candError.message);
    return {
      ok: false,
      cleanedDrafts: 0,
      cleanedStorageFiles: 0,
      skippedByPaymentGuard: 0,
      failed: 0,
      error: "CANDIDATE_QUERY_ERROR",
    };
  }

  const candidates = (candidatesRaw ?? []) as CleanupDraftCandidate[];
  if (candidates.length === 0) {
    return {
      ok: true,
      cleanedDrafts: 0,
      cleanedStorageFiles: 0,
      skippedByPaymentGuard: 0,
      failed: 0,
    };
  }

  const candidateIds = candidates.map((c) => c.id);
  const { data: paymentRows, error: payError } = await admin
    .from("payments")
    .select("ucapan_id, status, created_at")
    .in("ucapan_id", candidateIds);

  if (payError) {
    // Fail-closed: never delete drafts if payment guard verification fails.
    console.warn("[cleanup-unpaid] gagal membaca tabel payments:", payError.message);
    return {
      ok: false,
      cleanedDrafts: 0,
      cleanedStorageFiles: 0,
      skippedByPaymentGuard: 0,
      failed: 0,
      error: "PAYMENT_GUARD_QUERY_ERROR",
    };
  }

  const paymentsByUcapan = new Map<string, CleanupPaymentGuardRecord[]>();
  for (const row of (paymentRows ?? []) as CleanupPaymentGuardRecord[]) {
    if (!row.ucapan_id) continue;
    const list = paymentsByUcapan.get(row.ucapan_id) ?? [];
    list.push(row);
    paymentsByUcapan.set(row.ucapan_id, list);
  }

  const eligible: CleanupDraftCandidate[] = [];
  let skippedByPaymentGuard = 0;

  for (const draft of candidates) {
    const draftPayments = paymentsByUcapan.get(draft.id) ?? [];
    if (isDraftEligibleForCleanup(draft, draftPayments, nowMs)) {
      eligible.push(draft);
    } else {
      skippedByPaymentGuard += 1;
    }
  }

  if (eligible.length === 0) {
    return {
      ok: true,
      cleanedDrafts: 0,
      cleanedStorageFiles: 0,
      skippedByPaymentGuard,
      failed: 0,
    };
  }

  const ownerIds = Array.from(
    new Set(
      eligible
        .map((d) => d.owner_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  const siblingsByOwner = new Map<string, CleanupSiblingMediaRow[]>();
  if (ownerIds.length > 0) {
    const { data: ownerRows, error: ownerErr } = await admin
      .from("ucapan")
      .select("id, owner_id, photos, music_url, timeline")
      .in("owner_id", ownerIds);

    if (ownerErr) {
      // Fail-closed: abort rather than risking deletion of shared assets.
      console.warn("[cleanup-unpaid] gagal membaca sibling ucapan:", ownerErr.message);
      return {
        ok: false,
        cleanedDrafts: 0,
        cleanedStorageFiles: 0,
        skippedByPaymentGuard,
        failed: 0,
        error: "SIBLING_QUERY_ERROR",
      };
    }

    for (const raw of (ownerRows ?? []) as (CleanupSiblingMediaRow & {
      owner_id: string | null;
    })[]) {
      if (!raw.owner_id) continue;
      const list = siblingsByOwner.get(raw.owner_id) ?? [];
      list.push({
        id: raw.id,
        photos: raw.photos,
        music_url: raw.music_url,
        timeline: raw.timeline,
      });
      siblingsByOwner.set(raw.owner_id, list);
    }
  }

  const configuredUrl = supabaseUrl();
  const configuredR2Url = getR2PublicBaseUrl();
  let cleanedDrafts = 0;
  let cleanedStorageFiles = 0;
  let failed = 0;

  for (const draft of eligible) {
    if (draft.owner_id && (configuredUrl || configuredR2Url)) {
      const ownerSiblings = siblingsByOwner.get(draft.owner_id) ?? [];
      const { fotoPaths, audioPaths, r2VideoKeys } = collectSafeCleanupStoragePaths(
        draft,
        ownerSiblings,
        configuredUrl,
        configuredR2Url
      );

      // Non-blocking storage removals scoped strictly to owner_id paths
      if (fotoPaths.length > 0) {
        try {
          const { error: rmFotoErr } = await admin.storage
            .from("foto")
            .remove(fotoPaths);
          if (!rmFotoErr) {
            cleanedStorageFiles += fotoPaths.length;
          }
        } catch {
          // non-blocking
        }
      }

      if (audioPaths.length > 0) {
        try {
          const { error: rmAudioErr } = await admin.storage
            .from("musik")
            .remove(audioPaths);
          if (!rmAudioErr) {
            cleanedStorageFiles += audioPaths.length;
          }
        } catch {
          // non-blocking
        }
      }

      if (r2VideoKeys.length > 0 && isR2Configured()) {
        try {
          cleanedStorageFiles += await deleteR2Objects(r2VideoKeys);
        } catch {
          // non-blocking
        }
      }
    }

    const { error: delErr } = await admin
      .from("ucapan")
      .delete()
      .eq("id", draft.id)
      .eq("paid", false);

    if (delErr) {
      failed += 1;
      console.warn(`[cleanup-unpaid] gagal menghapus ucapan ${draft.id}:`, delErr.message);
      continue;
    }

    cleanedDrafts += 1;
    if (draft.owner_id) {
      const remaining = (siblingsByOwner.get(draft.owner_id) ?? []).filter(
        (row) => row.id !== draft.id
      );
      siblingsByOwner.set(draft.owner_id, remaining);
    }
  }

  return {
    ok: true,
    cleanedDrafts,
    cleanedStorageFiles,
    skippedByPaymentGuard,
    failed,
  };
}
