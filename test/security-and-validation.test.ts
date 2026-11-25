import test from "node:test";
import assert from "node:assert/strict";

import {
  extractOwnedAudioStoragePath,
  extractOwnedFotoStoragePath,
  isValidEmail,
  isValidMediaUrl,
  isValidUuid,
  normalizeBaseUrl,
  sanitizeRelativeRedirect,
} from "../lib/validation.ts";
import {
  createGateUnlockToken,
  safeStringEqual,
  verifyGateUnlockToken,
} from "../lib/gate-token.ts";
import {
  MAX_HESITATION_COUNT,
  buildDraftAddonState,
  mapUcapanRow,
  parseRecipientResponse,
  stripLockedUcapan,
  stripPublicUcapan,
  validateRecipientResponseInput,
  validateUcapanInput,
  type UcapanRow,
} from "../lib/supabase/rows.ts";

test("validation: menolak input non-string dan URL protocol-relative (//)", () => {
  // Non-string JSON payload tidak boleh melempar TypeError
  assert.equal(validateUcapanInput(null).valid, false);
  assert.equal(
    validateUcapanInput({
      templateSlug: "surat-cinta",
      toName: 12345,
      fromName: "Raka",
    }).valid,
    false
  );
  assert.equal(
    validateUcapanInput({
      templateSlug: "surat-cinta",
      toName: "Nabila",
      fromName: { bad: true },
    }).valid,
    false
  );

  // URL protocol-relative // harus ditolak di photos, musicUrl, dan videoUrl
  assert.equal(isValidMediaUrl("//evil.example/tracker.jpg"), false);
  assert.equal(isValidMediaUrl("javascript:alert(1)"), false);
  assert.equal(isValidMediaUrl("http://insecure.example/a.jpg"), false);
  assert.equal(isValidMediaUrl("https://cdn.example.com/photo.webp"), true);
  assert.equal(isValidMediaUrl("/templates/surat-cinta.png"), true);

  assert.equal(
    validateUcapanInput({
      templateSlug: "surat-cinta",
      toName: "Nabila",
      fromName: "Raka",
      photos: ["//evil.example/x.jpg"],
    }).valid,
    false
  );
  assert.equal(
    validateUcapanInput({
      templateSlug: "surat-cinta",
      toName: "Nabila",
      fromName: "Raka",
      musicUrl: "//evil.example/song.mp3",
    }).valid,
    false
  );

  assert.equal(isValidEmail("kamu@example.com"), true);
  assert.equal(isValidEmail(["not-a-string"]), false);
  assert.equal(isValidUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isValidUuid("not-a-uuid"), false);
});

test("validation: extractOwnedFotoStoragePath menolak hapus foto milik user lain", () => {
  const supabaseUrl = "https://demo-proj.supabase.co";
  const ownerId = "11111111-1111-1111-1111-111111111111";
  const victimId = "22222222-2222-2222-2222-222222222222";

  // Milik sendiri di folder <ownerId>/ -> valid
  assert.equal(
    extractOwnedFotoStoragePath(
      `${supabaseUrl}/storage/v1/object/public/foto/${ownerId}/abc.webp`,
      supabaseUrl,
      ownerId
    ),
    `${ownerId}/abc.webp`
  );

  // Milik user lain -> ditolak
  assert.equal(
    extractOwnedFotoStoragePath(
      `${supabaseUrl}/storage/v1/object/public/foto/${victimId}/secret.webp`,
      supabaseUrl,
      ownerId
    ),
    null
  );

  // Root path tanpa folder owner -> ditolak
  assert.equal(
    extractOwnedFotoStoragePath(
      `${supabaseUrl}/storage/v1/object/public/foto/legacy-orphan.webp`,
      supabaseUrl,
      ownerId
    ),
    null
  );

  // Path traversal -> ditolak
  assert.equal(
    extractOwnedFotoStoragePath(
      `${supabaseUrl}/storage/v1/object/public/foto/${ownerId}/../${victimId}/x.webp`,
      supabaseUrl,
      ownerId
    ),
    null
  );

  // Domain eksternal -> ditolak
  assert.equal(
    extractOwnedFotoStoragePath(
      `https://evil.example/storage/v1/object/public/foto/${ownerId}/abc.webp`,
      supabaseUrl,
      ownerId
    ),
    null
  );
});

test("validation: extractOwnedAudioStoragePath membersihkan fragment #t dan menolak milik user lain", () => {
  const supabaseUrl = "https://demo-proj.supabase.co";
  const ownerId = "11111111-1111-1111-1111-111111111111";
  const victimId = "22222222-2222-2222-2222-222222222222";

  // Milik sendiri dengan Media Fragment #t=10,45 -> valid & fragment dibersihkan
  assert.equal(
    extractOwnedAudioStoragePath(
      `${supabaseUrl}/storage/v1/object/public/musik/${ownerId}/abc-lagu.mp3#t=10,45`,
      supabaseUrl,
      ownerId
    ),
    `${ownerId}/abc-lagu.mp3`
  );

  // Milik user lain -> ditolak
  assert.equal(
    extractOwnedAudioStoragePath(
      `${supabaseUrl}/storage/v1/object/public/musik/${victimId}/secret.mp3`,
      supabaseUrl,
      ownerId
    ),
    null
  );

  // Path traversal -> ditolak
  assert.equal(
    extractOwnedAudioStoragePath(
      `${supabaseUrl}/storage/v1/object/public/musik/${ownerId}/../${victimId}/x.mp3`,
      supabaseUrl,
      ownerId
    ),
    null
  );

  // Bucket salah (foto) -> ditolak
  assert.equal(
    extractOwnedAudioStoragePath(
      `${supabaseUrl}/storage/v1/object/public/foto/${ownerId}/abc.webp`,
      supabaseUrl,
      ownerId
    ),
    null
  );
});

test("validation: normalizeBaseUrl dan sanitizeRelativeRedirect", () => {
  assert.equal(normalizeBaseUrl("", "https://pesanmanis.vercel.app"), "https://pesanmanis.vercel.app");
  assert.equal(normalizeBaseUrl("https://pesanmanis.com///", "http://localhost:3000"), "https://pesanmanis.com");
  assert.equal(normalizeBaseUrl("invalid-url", "https://pesanmanis.vercel.app"), "https://pesanmanis.vercel.app");

  assert.equal(sanitizeRelativeRedirect("/checkout/123?ref=abc"), "/checkout/123?ref=abc");
  assert.equal(sanitizeRelativeRedirect("//evil.com/phish"), "/dashboard");
  assert.equal(sanitizeRelativeRedirect("/\\evil.com/phish"), "/dashboard");
  assert.equal(sanitizeRelativeRedirect("https://evil.com"), "/dashboard");
});

test("gate-token: HMAC sign/verify, expiry, dan anti-replay lintas ucapanId", () => {
  const secret = "test-service-role-secret";
  const ucapanA = "550e8400-e29b-41d4-a716-446655440000";
  const ucapanB = "660e8400-e29b-41d4-a716-446655440000";
  const now = 1_700_000_000_000;

  const token = createGateUnlockToken(ucapanA, secret, now, 3600);
  assert.equal(verifyGateUnlockToken(ucapanA, token, secret, now + 1000), true);
  // Tidak boleh dipakai untuk ucapan lain
  assert.equal(verifyGateUnlockToken(ucapanB, token, secret, now + 1000), false);
  // Kedaluwarsa ditolak
  assert.equal(verifyGateUnlockToken(ucapanA, token, secret, now + 4_000_000), false);
  // Token dimodifikasi ditolak
  assert.equal(verifyGateUnlockToken(ucapanA, `${token}x`, secret, now + 1000), false);

  assert.equal(safeStringEqual("1402", "1402"), true);
  assert.equal(safeStringEqual("1402", "1403"), false);
});

test("rows: stripLockedUcapan menyembunyikan seluruh isi surat, foto, media & PIN", () => {
  const sampleRow: UcapanRow = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    owner_id: "11111111-1111-1111-1111-111111111111",
    template_slug: "surat-cinta",
    to_name: "Nabila",
    from_name: "Raka",
    title: "Rahasia Kita",
    message: "Pesan cinta pribadi yang tidak boleh bocor sebelum PIN benar.",
    photos: ["https://demo.supabase.co/storage/v1/object/public/foto/a.webp"],
    music_url: "https://example.com/song.mp3",
    email: "raka@example.com",
    timeline: [
      { date: "14 Feb", title: "Kencan Pertama" },
      { date: "__pm_meta__", title: "", mood: "romantic", videoUrl: "https://youtu.be/dQw4w9WgXcQ" },
    ],
    paid: true,
    paid_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    gate_type: "pin",
    gate_data: { pin: "1402", question: "Tanggal jadian?" },
    receipt_enabled: true,
  };

  const mapped = mapUcapanRow(sampleRow);
  const locked = stripLockedUcapan(mapped);

  assert.equal(locked.locked, true);
  assert.equal(locked.toName, "Nabila");
  assert.equal(locked.fromName, "Raka");
  assert.equal(locked.message, "");
  assert.equal(locked.title, "");
  assert.deepEqual(locked.photos, []);
  assert.equal(locked.musicUrl, undefined);
  assert.equal(locked.videoUrl, undefined);
  assert.equal(locked.timeline, undefined);
  assert.equal(locked.email, undefined);
  assert.deepEqual(locked.gateData, { question: "Tanggal jadian?" });

  const unlocked = stripPublicUcapan(mapped);
  assert.equal(unlocked.locked, false);
  assert.equal(unlocked.message, sampleRow.message);
  assert.equal(unlocked.photos.length, 1);
  assert.equal(unlocked.email, undefined);
  assert.deepEqual(unlocked.gateData, { question: "Tanggal jadian?" });
});

test("rows: draft_addons dipulihkan untuk ucapan unpaid tetapi diabaikan untuk paid", () => {
  const draftState = buildDraftAddonState({
    addons: ["custom_slug", "intimate_gate", "touch_particles"],
    customSlug: "Ari Nadia",
    pin: "2512",
    particleStyle: "roses",
  });
  assert.deepEqual(draftState, {
    addons: ["custom_slug", "intimate_gate", "touch_particles"],
    customSlug: "ari-nadia",
    pin: "2512",
    particleStyle: "roses",
  });

  const unpaidRow: UcapanRow = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    template_slug: "surat-cinta",
    to_name: "Nadia",
    from_name: "Ari",
    title: "Hai",
    message: "Test",
    photos: [],
    music_url: null,
    email: null,
    timeline: null,
    draft_addons: draftState,
    custom_slug: null,
    paid: false,
    paid_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
  const mappedUnpaid = mapUcapanRow(unpaidRow);
  assert.equal(mappedUnpaid.customSlug, "ari-nadia");
  assert.equal(mappedUnpaid.gateType, "pin");
  assert.equal(mappedUnpaid.touchParticles, "roses");

  // Saat sudah paid=true, sumber kebenaran hanya kolom live (bukan draft_addons)
  const paidRow: UcapanRow = { ...unpaidRow, paid: true, custom_slug: null, gate_type: null, touch_particles: null };
  const mappedPaid = mapUcapanRow(paidRow);
  assert.equal(mappedPaid.customSlug, null);
  assert.equal(mappedPaid.gateType, null);
  assert.equal(mappedPaid.touchParticles, null);
});

test("recipient-response: validasi ketat, sanitasi & penyembunyian saat gate terkunci", () => {
  // Valid payload
  assert.deepEqual(
    validateRecipientResponseInput({
      type: "apology",
      decision: "forgiven",
      hesitationCount: 0,
    }),
    {
      valid: true,
      data: { type: "apology", decision: "forgiven", hesitationCount: 0 },
    }
  );
  assert.equal(
    validateRecipientResponseInput({
      type: "apology",
      decision: "forgiven",
      hesitationCount: MAX_HESITATION_COUNT,
    }).valid,
    true
  );

  // Invalid payloads
  assert.equal(validateRecipientResponseInput(null).valid, false);
  assert.equal(
    validateRecipientResponseInput({
      type: "unknown",
      decision: "forgiven",
      hesitationCount: 2,
    }).valid,
    false
  );
  assert.equal(
    validateRecipientResponseInput({
      type: "apology",
      decision: "forgiven",
      hesitationCount: -1,
    }).valid,
    false
  );
  assert.equal(
    validateRecipientResponseInput({
      type: "apology",
      decision: "forgiven",
      hesitationCount: 2.5,
    }).valid,
    false
  );
  assert.equal(
    validateRecipientResponseInput({
      type: "apology",
      decision: "forgiven",
      hesitationCount: MAX_HESITATION_COUNT + 1,
    }).valid,
    false
  );

  // Parser DB mengharuskan respondedAt numerik positif valid
  assert.equal(
    parseRecipientResponse({
      type: "apology",
      decision: "forgiven",
      hesitationCount: 4,
    }),
    null
  );
  assert.deepEqual(
    parseRecipientResponse({
      type: "apology",
      decision: "forgiven",
      hesitationCount: 4,
      respondedAt: 1700000000000.9,
    }),
    {
      type: "apology",
      decision: "forgiven",
      hesitationCount: 4,
      respondedAt: 1700000000000,
    }
  );

  // Mapping di UcapanRow + redaksi saat gate masih terkunci
  const rowWithResponse: UcapanRow = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    template_slug: "permintaan-maaf",
    to_name: "Nadia",
    from_name: "Raka",
    title: "Maaf ya",
    message: "Beneran nyesel.",
    photos: [],
    music_url: null,
    email: "raka@example.com",
    timeline: null,
    gate_type: "pin",
    gate_data: { pin: "1402" },
    recipient_response: {
      type: "apology",
      decision: "forgiven",
      hesitationCount: 6,
      respondedAt: 1700000000000,
    },
    paid: true,
    paid_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  const mapped = mapUcapanRow(rowWithResponse);
  assert.deepEqual(mapped.recipientResponse, {
    type: "apology",
    decision: "forgiven",
    hesitationCount: 6,
    respondedAt: 1700000000000,
  });

  const locked = stripLockedUcapan(mapped);
  assert.equal(locked.recipientResponse, undefined);

  const unlocked = stripPublicUcapan(mapped);
  assert.deepEqual(unlocked.recipientResponse, mapped.recipientResponse);
});
