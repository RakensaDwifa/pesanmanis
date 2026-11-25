/**
 * test/cleanup-unpaid.test.ts
 *
 * Unit tests for unpaid draft auto-cleanup eligibility guards and safe Storage
 * path extraction (`lib/cleanup-unpaid-policy.ts`).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CLEANUP_BATCH_LIMIT,
  UNPAID_RETENTION_DAYS,
  UNPAID_RETENTION_MS,
  collectSafeCleanupStoragePaths,
  isDraftEligibleForCleanup,
  type CleanupDraftCandidate,
} from "../lib/cleanup-unpaid-policy.ts";

const NOW_MS = Date.parse("2026-11-26T00:00:00.000Z");
const OLD_CREATED = new Date(NOW_MS - 25 * 24 * 60 * 60 * 1000).toISOString();
const OLD_UPDATED = new Date(NOW_MS - 22 * 24 * 60 * 60 * 1000).toISOString();
const RECENT_UPDATED = new Date(NOW_MS - 3 * 24 * 60 * 60 * 1000).toISOString();
const BOUNDARY_EXACT = new Date(NOW_MS - UNPAID_RETENTION_MS).toISOString();

function makeDraft(
  overrides: Partial<CleanupDraftCandidate> = {}
): CleanupDraftCandidate {
  return {
    id: "draft-1",
    owner_id: "11111111-1111-1111-1111-111111111111",
    photos: [],
    music_url: null,
    paid: false,
    created_at: OLD_CREATED,
    updated_at: OLD_UPDATED,
    ...overrides,
  };
}

test("cleanup-unpaid: default constants & retensi 21 hari", () => {
  assert.equal(UNPAID_RETENTION_DAYS, 21);
  assert.equal(CLEANUP_BATCH_LIMIT, 50);
});

test("cleanup-unpaid: memilih draft unpaid yang created_at & updated_at melewati retensi", () => {
  const draft = makeDraft();
  assert.equal(isDraftEligibleForCleanup(draft, [], NOW_MS), true);

  // Payment kadaluarsa/unpaid > 24 jam tetap boleh dibersihkan
  const oldUnpaidPayment = {
    ucapan_id: draft.id,
    status: "UNPAID",
    created_at: new Date(NOW_MS - 48 * 60 * 60 * 1000).toISOString(),
  };
  assert.equal(isDraftEligibleForCleanup(draft, [oldUnpaidPayment], NOW_MS), true);
});

test("cleanup-unpaid: TIDAK PERNAH menghapus ucapan paid: true", () => {
  const paidDraft = makeDraft({ paid: true });
  assert.equal(isDraftEligibleForCleanup(paidDraft, [], NOW_MS), false);
});

test("cleanup-unpaid: menolak draft yang baru dibuat, baru diedit, atau tepat di batas retensi", () => {
  // Baru diedit 3 hari lalu meski created_at > 21 hari
  assert.equal(
    isDraftEligibleForCleanup(makeDraft({ updated_at: RECENT_UPDATED }), [], NOW_MS),
    false
  );

  // Tepat di batas 21 hari (harus strictly `< cutoff`)
  assert.equal(
    isDraftEligibleForCleanup(makeDraft({ updated_at: BOUNDARY_EXACT }), [], NOW_MS),
    false
  );

  // Timestamp rusak/hilang -> fail-closed
  assert.equal(
    isDraftEligibleForCleanup(makeDraft({ updated_at: "" }), [], NOW_MS),
    false
  );
});

test("cleanup-unpaid: guard tabel payments menolak jika ada status PAID atau transaksi < 24 jam", () => {
  const draft = makeDraft();

  // Ada payment PAID (mis. race condition sinkronisasi status) -> TOLAK
  assert.equal(
    isDraftEligibleForCleanup(
      draft,
      [
        {
          ucapan_id: draft.id,
          status: "PAID",
          created_at: OLD_CREATED,
        },
      ],
      NOW_MS
    ),
    false
  );

  // Ada payment UNPAID baru dibuat 2 jam lalu -> TOLAK
  assert.equal(
    isDraftEligibleForCleanup(
      draft,
      [
        {
          ucapan_id: draft.id,
          status: "UNPAID",
          created_at: new Date(NOW_MS - 2 * 60 * 60 * 1000).toISOString(),
        },
      ],
      NOW_MS
    ),
    false
  );

  // Payment tanpa created_at valid -> fail-closed TOLAK
  assert.equal(
    isDraftEligibleForCleanup(
      draft,
      [{ ucapan_id: draft.id, status: "UNPAID", created_at: null }],
      NOW_MS
    ),
    false
  );
});

test("cleanup-unpaid: hanya menghapus path Storage milik owner dan menghormati sibling ucapan", () => {
  const supabaseUrl = "https://demo-proj.supabase.co";
  const ownerId = "11111111-1111-1111-1111-111111111111";
  const otherId = "22222222-2222-2222-2222-222222222222";

  const ownedPhoto1 = `${supabaseUrl}/storage/v1/object/public/foto/${ownerId}/p1.webp`;
  const ownedPhotoShared = `${supabaseUrl}/storage/v1/object/public/foto/${ownerId}/shared.webp`;
  const victimPhoto = `${supabaseUrl}/storage/v1/object/public/foto/${otherId}/victim.webp`;
  const externalPhoto = "https://cdn.example.com/external.jpg";

  const ownedAudio = `${supabaseUrl}/storage/v1/object/public/musik/${ownerId}/voice.mp3#t=5,30`;
  const galleryAudio = "/music/ungkapan-sayang/perfect.mp3";

  const draft = makeDraft({
    id: "draft-expired",
    owner_id: ownerId,
    photos: [ownedPhoto1, ownedPhoto1, ownedPhotoShared, victimPhoto, externalPhoto],
    music_url: ownedAudio,
  });

  // Sibling ucapan yang masih hidup (mis. ucapan paid) masih memakai shared.webp & voice.mp3
  const siblings = [
    {
      id: "draft-expired", // diri sendiri harus diabaikan
      photos: [ownedPhoto1],
      music_url: ownedAudio,
    },
    {
      id: "paid-sibling",
      photos: [ownedPhotoShared],
      music_url: ownedAudio,
    },
  ];

  const guarded = collectSafeCleanupStoragePaths(draft, siblings, supabaseUrl);
  assert.deepEqual(guarded.fotoPaths, [`${ownerId}/p1.webp`]);
  assert.deepEqual(guarded.audioPaths, []);

  // Jika tidak ada sibling yang memakai voice.mp3 maupun shared.webp -> keduanya boleh dihapus
  const unguarded = collectSafeCleanupStoragePaths(draft, [], supabaseUrl);
  assert.deepEqual(unguarded.fotoPaths, [
    `${ownerId}/p1.webp`,
    `${ownerId}/shared.webp`,
  ]);
  assert.deepEqual(unguarded.audioPaths, [`${ownerId}/voice.mp3`]);

  // Musik preset lokal & owner_id null tidak menghasilkan path hapus Storage
  assert.deepEqual(
    collectSafeCleanupStoragePaths(
      makeDraft({ owner_id: ownerId, music_url: galleryAudio }),
      [],
      supabaseUrl
    ),
    { fotoPaths: [], audioPaths: [] }
  );
  assert.deepEqual(
    collectSafeCleanupStoragePaths(
      makeDraft({ owner_id: null, photos: [ownedPhoto1], music_url: ownedAudio }),
      [],
      supabaseUrl
    ),
    { fotoPaths: [], audioPaths: [] }
  );
});
