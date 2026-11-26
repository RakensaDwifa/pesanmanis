import assert from "node:assert/strict";
import test from "node:test";

import { signR2DeleteRequest, signR2PresignedPutUrl } from "../lib/r2-signer.ts";
import { collectSafeCleanupStoragePaths } from "../lib/cleanup-unpaid-policy.ts";
import {
  mapUcapanRow,
  stripPublicUcapan,
  toUcapanRow,
  type UcapanRow,
} from "../lib/supabase/rows.ts";
import { extractOwnedR2VideoKey, isYouTubeVideoUrl } from "../lib/validation.ts";

const TEST_CREDS = {
  accountId: "abc123account",
  accessKeyId: "AKIA_TEST_KEY",
  secretAccessKey: "SECRET_TEST_KEY_123456",
  bucketName: "pesanmanis-media",
  publicUrl: "https://media.pesanmanis.web.id",
};

test("r2-signer: menghasilkan presigned PUT URL SigV4 deterministik dan valid", () => {
  const fixedDate = new Date("2026-11-27T02:00:00.000Z");
  const { uploadUrl, publicUrl } = signR2PresignedPutUrl({
    credentials: TEST_CREDS,
    key: "videos/user-1/clip-1.mp4",
    contentType: "video/mp4",
    contentLength: 102400,
    expiresInSeconds: 600,
    now: fixedDate,
  });

  const parsed = new URL(uploadUrl);
  assert.equal(parsed.hostname, "abc123account.r2.cloudflarestorage.com");
  assert.equal(parsed.pathname, "/pesanmanis-media/videos/user-1/clip-1.mp4");
  assert.equal(parsed.searchParams.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256");
  assert.equal(
    parsed.searchParams.get("X-Amz-Credential"),
    "AKIA_TEST_KEY/20261127/auto/s3/aws4_request"
  );
  assert.equal(parsed.searchParams.get("X-Amz-Date"), "20261127T020000Z");
  assert.equal(parsed.searchParams.get("X-Amz-Expires"), "600");
  assert.equal(
    parsed.searchParams.get("X-Amz-SignedHeaders"),
    "content-length;content-type;host"
  );
  assert.match(parsed.searchParams.get("X-Amz-Signature") ?? "", /^[0-9a-f]{64}$/);
  assert.equal(publicUrl, "https://media.pesanmanis.web.id/videos/user-1/clip-1.mp4");
});

test("r2-signer: menghasilkan DELETE request SigV4 dengan header Authorization", () => {
  const fixedDate = new Date("2026-11-27T02:00:00.000Z");
  const { url, headers } = signR2DeleteRequest(
    TEST_CREDS,
    "videos/user-1/clip-1.mp4",
    fixedDate
  );

  assert.equal(
    url,
    "https://abc123account.r2.cloudflarestorage.com/pesanmanis-media/videos/user-1/clip-1.mp4"
  );
  assert.ok(headers.Authorization.startsWith("AWS4-HMAC-SHA256 Credential=AKIA_TEST_KEY/20261127/auto/s3/aws4_request"));
  assert.equal(headers["x-amz-date"], "20261127T020000Z");
});

test("local_video: stripPublicUcapan menyembunyikan video R2 tanpa add-on, tetapi membiarkan YouTube gratis", () => {
  const r2Url = "https://media.pesanmanis.web.id/videos/user-1/clip.mp4";
  const ytUrl = "https://youtu.be/dQw4w9WgXcQ";

  const makeRow = (videoUrl: string, localVideoEnabled: boolean): UcapanRow => {
    const payload = toUcapanRow({
      templateSlug: "amplop-cinta",
      toName: "Nadia",
      fromName: "Ari",
      title: "Hai",
      message: "Test",
      photos: [],
      videoUrl,
    });
    return {
      id: "00000000-0000-4000-8000-000000000010",
      template_slug: payload.template_slug,
      to_name: payload.to_name,
      from_name: payload.from_name,
      title: payload.title,
      message: payload.message,
      photos: payload.photos,
      music_url: payload.music_url,
      email: "ari@example.com",
      timeline: payload.timeline,
      local_video_enabled: localVideoEnabled,
      paid: true,
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  assert.equal(isYouTubeVideoUrl(ytUrl), true);
  assert.equal(isYouTubeVideoUrl(r2Url), false);

  // R2 tanpa add-on -> disembunyikan
  const r2Blocked = stripPublicUcapan(mapUcapanRow(makeRow(r2Url, false)));
  assert.equal(r2Blocked.videoUrl, undefined);

  // R2 dengan add-on -> tampil
  const r2Allowed = stripPublicUcapan(mapUcapanRow(makeRow(r2Url, true)));
  assert.equal(r2Allowed.videoUrl, r2Url);

  // YouTube tanpa add-on -> tetap gratis & tampil
  const ytAllowed = stripPublicUcapan(mapUcapanRow(makeRow(ytUrl, false)));
  assert.equal(ytAllowed.videoUrl, ytUrl);
});

test("r2 cleanup: mengekstrak key video milik owner dan melindungi key yang dipakai sibling", () => {
  const r2Base = "https://media.pesanmanis.web.id";
  const ownerId = "owner-123";
  const orphanUrl = `${r2Base}/videos/${ownerId}/orphan.mp4`;
  const sharedUrl = `${r2Base}/videos/${ownerId}/shared.mp4`;
  const foreignUrl = `${r2Base}/videos/other-user/nope.mp4`;

  assert.equal(
    extractOwnedR2VideoKey(orphanUrl, r2Base, ownerId),
    `videos/${ownerId}/orphan.mp4`
  );
  assert.equal(extractOwnedR2VideoKey(foreignUrl, r2Base, ownerId), null);

  const res = collectSafeCleanupStoragePaths(
    {
      id: "draft-1",
      owner_id: ownerId,
      photos: [],
      music_url: null,
      timeline: [
        { date: "__pm_meta__", title: "", mood: null, videoUrl: orphanUrl },
        { date: "__pm_meta__", title: "", mood: null, videoUrl: sharedUrl },
        { date: "__pm_meta__", title: "", mood: null, videoUrl: foreignUrl },
      ],
    },
    [
      {
        id: "sibling-paid",
        photos: [],
        music_url: null,
        timeline: [{ date: "__pm_meta__", title: "", mood: null, videoUrl: sharedUrl }],
      },
    ],
    "https://proj.supabase.co",
    r2Base
  );

  assert.deepEqual(res.r2VideoKeys, [`videos/${ownerId}/orphan.mp4`]);
});
