import test from "node:test";
import assert from "node:assert/strict";

import {
  VIDEO_PLAY_EVENT,
  VIDEO_STOP_EVENT,
  createMediaSyncController,
  isAnyVideoPlaying,
  notifyVideoPlay,
  notifyVideoStop,
  resetMediaSync,
  subscribeMediaSync,
} from "../lib/media-sync.ts";

test("media-sync: play & stop mengirim CustomEvent dengan payload sourceId yang tepat", () => {
  const target = new EventTarget();
  const sync = createMediaSyncController(() => target);
  const events: Array<{ type: string; sourceId: string }> = [];

  const unsubscribe = sync.subscribe({
    onVideoPlay: (detail) => events.push({ type: VIDEO_PLAY_EVENT, sourceId: detail.sourceId }),
    onVideoStop: (detail) => events.push({ type: VIDEO_STOP_EVENT, sourceId: detail.sourceId }),
  });

  assert.equal(sync.isAnyVideoPlaying(), false);
  assert.equal(sync.notifyVideoPlay("video-1"), true);
  assert.equal(sync.isAnyVideoPlaying(), true);
  assert.deepEqual(sync.getActiveVideoIds(), ["video-1"]);

  assert.equal(sync.notifyVideoStop("video-1"), true);
  assert.equal(sync.isAnyVideoPlaying(), false);
  assert.deepEqual(sync.getActiveVideoIds(), []);

  assert.deepEqual(events, [
    { type: VIDEO_PLAY_EVENT, sourceId: "video-1" },
    { type: VIDEO_STOP_EVENT, sourceId: "video-1" },
  ]);

  unsubscribe();
});

test("media-sync: idempoten untuk sourceId sama (buffering -> playing) dan bisa diulang setelah stop", () => {
  const target = new EventTarget();
  const sync = createMediaSyncController(() => target);
  let playCount = 0;
  let stopCount = 0;

  sync.subscribe({
    onVideoPlay: () => {
      playCount += 1;
    },
    onVideoStop: () => {
      stopCount += 1;
    },
  });

  // YouTube buffering (3) diikuti playing (1) dari iframe yang sama -> hanya 1x pm:video-play
  assert.equal(sync.notifyVideoPlay("yt-1"), true);
  assert.equal(sync.notifyVideoPlay("yt-1"), false);
  assert.equal(playCount, 1);

  // Stop pertama memicu pm:video-stop; stop ganda/unknown menjadi no-op
  assert.equal(sync.notifyVideoStop("yt-1"), true);
  assert.equal(sync.notifyVideoStop("yt-1"), false);
  assert.equal(sync.notifyVideoStop("unknown"), false);
  assert.equal(stopCount, 1);

  // Jika diputar lagi setelah berhenti, pm:video-play kembali dikirim
  assert.equal(sync.notifyVideoPlay("yt-1"), true);
  assert.equal(playCount, 2);
});

test("media-sync: multi-video hanya mengirim pm:video-stop setelah semua video aktif berhenti", () => {
  const target = new EventTarget();
  const sync = createMediaSyncController(() => target);
  const log: string[] = [];

  sync.subscribe({
    onVideoPlay: ({ sourceId }) => log.push(`play:${sourceId}`),
    onVideoStop: ({ sourceId }) => log.push(`stop:${sourceId}`),
  });

  sync.notifyVideoPlay("video-a");
  sync.notifyVideoPlay("video-b");
  assert.equal(sync.isAnyVideoPlaying(), true);
  assert.deepEqual(sync.getActiveVideoIds(), ["video-a", "video-b"]);

  // Unmount/stop video-a saat video-b masih berjalan tidak boleh memicu stop global
  assert.equal(sync.notifyVideoStop("video-a"), false);
  assert.equal(sync.isAnyVideoPlaying(), true);
  assert.deepEqual(sync.getActiveVideoIds(), ["video-b"]);

  // Setelah video-b berhenti barulah pm:video-stop dikirim
  assert.equal(sync.notifyVideoStop("video-b"), true);
  assert.equal(sync.isAnyVideoPlaying(), false);
  assert.deepEqual(log, ["play:video-a", "play:video-b", "stop:video-b"]);
});

test("media-sync: unsubscribe menghentikan penerimaan event dan input kosong diabaikan", () => {
  const target = new EventTarget();
  const sync = createMediaSyncController(() => target);
  let count = 0;

  const unsubscribe = sync.subscribe({
    onVideoPlay: () => {
      count += 1;
    },
  });

  assert.equal(sync.notifyVideoPlay("   "), false);
  assert.equal(sync.notifyVideoStop(""), false);
  assert.equal(count, 0);

  unsubscribe();
  assert.equal(sync.notifyVideoPlay("video-after-unsub"), true);
  assert.equal(count, 0);

  sync.reset();
  assert.equal(sync.isAnyVideoPlaying(), false);
});

test("media-sync: helper default aman dipanggil di lingkungan SSR/Node tanpa window", () => {
  resetMediaSync();
  const unsub = subscribeMediaSync({ onVideoPlay: () => {}, onVideoStop: () => {} });

  assert.equal(notifyVideoPlay("ssr-video"), true);
  assert.equal(isAnyVideoPlaying(), true);
  assert.equal(notifyVideoStop("ssr-video"), true);
  assert.equal(isAnyVideoPlaying(), false);

  unsub();
  resetMediaSync();
});
