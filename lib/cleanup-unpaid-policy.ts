/**
 * lib/cleanup-unpaid-policy.ts
 *
 * Pure policy & storage-path extraction helpers for cleaning up expired unpaid
 * ucapan drafts (`paid = false`). Zero Next/Supabase imports so it can be
 * thoroughly unit-tested in Node.
 */

import {
  extractOwnedAudioStoragePath,
  extractOwnedFotoStoragePath,
  extractOwnedR2VideoKey,
  isRecord,
} from "./validation.ts";

export const UNPAID_RETENTION_DAYS = 21;
export const UNPAID_RETENTION_MS = UNPAID_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const RECENT_PAYMENT_GUARD_MS = 24 * 60 * 60 * 1000;
export const CLEANUP_BATCH_LIMIT = 50;

export interface CleanupDraftCandidate {
  id: string;
  owner_id: string | null;
  photos?: string[] | null;
  music_url?: string | null;
  timeline?: unknown[] | null;
  paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface CleanupPaymentGuardRecord {
  ucapan_id: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface CleanupSiblingMediaRow {
  id: string;
  photos?: string[] | null;
  music_url?: string | null;
  timeline?: unknown[] | null;
}

export interface SafeStoragePathsToRemove {
  fotoPaths: string[];
  audioPaths: string[];
  r2VideoKeys: string[];
}

function parseIsoMs(raw: string | null | undefined): number | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Strict eligibility check for deleting an unpaid draft:
 * 1. `paid` must be strictly `false` (`paid === true` is never deleted).
 * 2. Both `created_at` and `updated_at` must be valid timestamps strictly older
 *    than `nowMs - retentionMs` (actively edited drafts are preserved).
 * 3. No linked payment row has `status === "PAID"` OR was created within the
 *    last 24 hours (`recentPaymentGuardMs`), protecting in-flight checkouts.
 */
export function isDraftEligibleForCleanup(
  draft: CleanupDraftCandidate,
  paymentsForDraft: readonly CleanupPaymentGuardRecord[],
  nowMs: number = Date.now(),
  retentionMs: number = UNPAID_RETENTION_MS,
  recentPaymentGuardMs: number = RECENT_PAYMENT_GUARD_MS
): boolean {
  if (draft.paid !== false) return false;

  const createdMs = parseIsoMs(draft.created_at);
  const updatedMs = parseIsoMs(draft.updated_at);
  if (createdMs === null || updatedMs === null) return false;

  const cutoffMs = nowMs - retentionMs;
  if (createdMs >= cutoffMs || updatedMs >= cutoffMs) {
    return false;
  }

  for (const payment of paymentsForDraft) {
    const status = (payment.status ?? "").trim().toUpperCase();
    if (status === "PAID") {
      return false;
    }

    const payCreatedMs = parseIsoMs(payment.created_at);
    // Fail-closed: if a payment record exists without a parseable timestamp or
    // was created within the 24h guard window, do not delete the draft yet.
    if (payCreatedMs === null || nowMs - payCreatedMs < recentPaymentGuardMs) {
      return false;
    }
  }

  return true;
}

/**
 * Extracts Storage object paths belonging to `draft.owner_id` on buckets
 * `foto` and `musik`, excluding any path still referenced by another surviving
 * `ucapan` owned by the same user.
 */
export function collectSafeCleanupStoragePaths(
  draft: Pick<
    CleanupDraftCandidate,
    "id" | "owner_id" | "photos" | "music_url" | "timeline"
  >,
  siblingRows: readonly CleanupSiblingMediaRow[],
  configuredSupabaseUrl: string,
  configuredR2PublicUrl: string = ""
): SafeStoragePathsToRemove {
  const ownerId = draft.owner_id;
  if (!ownerId || (!configuredSupabaseUrl && !configuredR2PublicUrl)) {
    return { fotoPaths: [], audioPaths: [], r2VideoKeys: [] };
  }

  const extractTimelineUrls = (
    timeline: unknown[] | null | undefined,
    field: "voiceNoteUrl" | "videoUrl"
  ): string[] => {
    const urls: string[] = [];
    for (const entry of timeline ?? []) {
      const value = isRecord(entry) ? entry[field] : undefined;
      if (typeof value === "string" && value) {
        urls.push(value);
      }
    }
    return urls;
  };

  const usedPhotosBySiblings = new Set<string>();
  const usedAudioBySiblings = new Set<string>();
  const usedR2VideosBySiblings = new Set<string>();

  for (const sibling of siblingRows) {
    if (sibling.id === draft.id) continue;
    if (configuredSupabaseUrl) {
      for (const p of sibling.photos ?? []) {
        const sp = extractOwnedFotoStoragePath(p, configuredSupabaseUrl, ownerId);
        if (sp) usedPhotosBySiblings.add(sp);
      }
      for (const audioUrl of [
        sibling.music_url,
        ...extractTimelineUrls(sibling.timeline, "voiceNoteUrl"),
      ]) {
        const ap = extractOwnedAudioStoragePath(
          audioUrl,
          configuredSupabaseUrl,
          ownerId
        );
        if (ap) usedAudioBySiblings.add(ap);
      }
    }
    if (configuredR2PublicUrl) {
      for (const videoUrl of extractTimelineUrls(sibling.timeline, "videoUrl")) {
        const vk = extractOwnedR2VideoKey(videoUrl, configuredR2PublicUrl, ownerId);
        if (vk) usedR2VideosBySiblings.add(vk);
      }
    }
  }

  const fotoSet = new Set<string>();
  const audioSet = new Set<string>();
  if (configuredSupabaseUrl) {
    for (const p of draft.photos ?? []) {
      const sp = extractOwnedFotoStoragePath(p, configuredSupabaseUrl, ownerId);
      if (sp && !usedPhotosBySiblings.has(sp)) {
        fotoSet.add(sp);
      }
    }

    for (const audioUrl of [
      draft.music_url,
      ...extractTimelineUrls(draft.timeline, "voiceNoteUrl"),
    ]) {
      const audioPath = extractOwnedAudioStoragePath(
        audioUrl,
        configuredSupabaseUrl,
        ownerId
      );
      if (audioPath && !usedAudioBySiblings.has(audioPath)) {
        audioSet.add(audioPath);
      }
    }
  }

  const r2VideoSet = new Set<string>();
  if (configuredR2PublicUrl) {
    for (const videoUrl of extractTimelineUrls(draft.timeline, "videoUrl")) {
      const videoKey = extractOwnedR2VideoKey(
        videoUrl,
        configuredR2PublicUrl,
        ownerId
      );
      if (videoKey && !usedR2VideosBySiblings.has(videoKey)) {
        r2VideoSet.add(videoKey);
      }
    }
  }

  return {
    fotoPaths: Array.from(fotoSet),
    audioPaths: Array.from(audioSet),
    r2VideoKeys: Array.from(r2VideoSet),
  };
}
