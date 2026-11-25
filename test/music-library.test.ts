import test from "node:test";
import assert from "node:assert/strict";

import {
  GALLERY_MUSIC_TRACKS,
  HERO_SAMPLE_MUSIC_URL,
  YOUTUBE_MUSIC_LIBRARY,
  applyAudioRange,
  buildYouTubeAudioUrl,
  buildYouTubeEmbedUrl,
  clampAudioBoundary,
  formatSeconds,
  getDefaultGalleryTrack,
  getGalleryTracksForCategory,
  getMusicDisplayInfo,
  parseAudioRange,
  parseDurationLabel,
  parseTimeInput,
  parseTrackFilename,
  parseYouTubeAudioUrl,
  parseYouTubeStartParam,
  splitMinutesSeconds,
  stripAudioRangeFragment,
  type GalleryMusicTrack,
} from "../lib/music-library.ts";
import { isValidMediaUrl } from "../lib/validation.ts";

const SAMPLE_GALLERY: GalleryMusicTrack[] = [
  {
    id: "ungkapan-sayang/jaz-bersamamu",
    slug: "jaz-bersamamu",
    title: "Bersamamu",
    artist: "Jaz",
    category: "ungkapan-sayang",
    url: "/music/ungkapan-sayang/jaz-bersamamu.mp3",
    durationLabel: "3:56",
    durationSeconds: 236,
    sizeKb: 3200,
  },
  {
    id: "birthday/bruno-mars-count-on-me",
    slug: "bruno-mars-count-on-me",
    title: "Count on Me",
    artist: "Bruno Mars",
    category: "birthday",
    url: "/music/birthday/bruno-mars-count-on-me.mp3",
    durationLabel: "3:17",
    durationSeconds: 197,
    sizeKb: 2700,
  },
  {
    id: "anniversary/ed-sheeran-perfect",
    slug: "ed-sheeran-perfect",
    title: "Perfect",
    artist: "Ed Sheeran",
    category: "anniversary",
    url: "/music/anniversary/ed-sheeran-perfect.mp3",
    durationLabel: "4:40",
    durationSeconds: 280,
    sizeKb: 3800,
  },
];

test("music-library: seluruh lagu di GALLERY_MUSIC_TRACKS memakai path /music/ lokal tanpa SoundHelix", () => {
  const ids = new Set<string>();
  for (const track of GALLERY_MUSIC_TRACKS) {
    assert.ok(!ids.has(track.id), `duplikat id ${track.id}`);
    ids.add(track.id);
    assert.ok(track.url.startsWith("/music/"));
    assert.ok(track.url.endsWith(".mp3"));
    assert.ok(!track.url.includes("soundhelix"), "tidak boleh mengandung URL demo SoundHelix");
    assert.ok(track.durationSeconds >= 0);
    assert.equal(isValidMediaUrl(track.url), true);
  }
  if (HERO_SAMPLE_MUSIC_URL !== undefined) {
    assert.ok(HERO_SAMPLE_MUSIC_URL.startsWith("/music/"));
    assert.equal(isValidMediaUrl(HERO_SAMPLE_MUSIC_URL), true);
  }
});

test("music-library: parseTrackFilename memisahkan Artis - Judul maupun Judul saja", () => {
  assert.deepEqual(parseTrackFilename("Sal Priadi - Kita Usahakan Rumah Itu.mp3"), {
    title: "Kita Usahakan Rumah Itu",
    artist: "Sal Priadi",
  });
  assert.deepEqual(parseTrackFilename("An Art Gallery Could Never Be As Unique As You.m4a"), {
    title: "An Art Gallery Could Never Be As Unique As You",
    artist: "",
  });
  assert.deepEqual(parseTrackFilename("lagu_kenangan_kita.wav"), {
    title: "lagu kenangan kita",
    artist: "",
  });
});

test("music-library: 24 preset YouTube mulai dari awal (0:00), punya reffStartSeconds & durasi, serta lolos isValidMediaUrl", () => {
  assert.equal(YOUTUBE_MUSIC_LIBRARY.length, 24);
  const perCategory = new Map<string, number>();
  const videoIds = new Set<string>();
  for (const preset of YOUTUBE_MUSIC_LIBRARY) {
    assert.match(preset.videoId, /^[a-zA-Z0-9_-]{11}$/);
    assert.ok(!videoIds.has(preset.videoId), `duplikat videoId ${preset.videoId}`);
    videoIds.add(preset.videoId);
    perCategory.set(preset.category, (perCategory.get(preset.category) ?? 0) + 1);
    assert.equal(preset.startSeconds, 0);
    assert.ok(preset.reffStartSeconds > 0 && preset.reffStartSeconds < preset.durationSeconds);
    assert.ok(preset.durationSeconds > 60);
    assert.equal(isValidMediaUrl(preset.url), true);
    assert.equal(preset.url, `https://www.youtube.com/watch?v=${preset.videoId}`);
    const parsed = parseYouTubeAudioUrl(preset.url);
    assert.deepEqual(parsed, {
      videoId: preset.videoId,
      startSeconds: 0,
    });
  }
  assert.deepEqual(
    [...perCategory.entries()].sort(([a], [b]) => a.localeCompare(b)),
    [
      ["anniversary", 6],
      ["birthday", 6],
      ["permintaan-maaf", 6],
      ["ungkapan-sayang", 6],
    ]
  );
});

test("music-library: utilitas waktu (parseDurationLabel, formatSeconds, parseTimeInput)", () => {
  assert.equal(parseDurationLabel("04:20"), 260);
  assert.equal(parseDurationLabel("1:02:05"), 3725);
  assert.equal(parseDurationLabel("invalid"), 0);

  assert.equal(formatSeconds(0), "0:00");
  assert.equal(formatSeconds(45), "0:45");
  assert.equal(formatSeconds(260), "4:20");
  assert.equal(formatSeconds(3725), "1:02:05");

  assert.equal(parseTimeInput("0:45"), 45);
  assert.equal(parseTimeInput("02:15"), 135);
  assert.equal(parseTimeInput("90"), 90);
  assert.equal(parseTimeInput("1m30s"), 90);
  assert.equal(parseTimeInput("abc"), null);
  assert.equal(parseTimeInput(""), null);

  assert.deepEqual(splitMinutesSeconds(0), { minutes: 0, seconds: 0 });
  assert.deepEqual(splitMinutesSeconds(135), { minutes: 2, seconds: 15 });
  assert.deepEqual(splitMinutesSeconds(-10), { minutes: 0, seconds: 0 });

  assert.deepEqual(clampAudioBoundary(30, 0, 260), { value: 30, clamped: null });
  assert.deepEqual(clampAudioBoundary(2, 5, 260), { value: 5, clamped: "min" });
  assert.deepEqual(clampAudioBoundary(400, 0, 260), { value: 260, clamped: "max" });
});

test("music-library: parseYouTubeStartParam dan parseYouTubeAudioUrl menangani start & end", () => {
  assert.equal(parseYouTubeStartParam("45"), 45);
  assert.equal(parseYouTubeStartParam("45s"), 45);
  assert.equal(parseYouTubeStartParam("1m30s"), 90);
  assert.equal(parseYouTubeStartParam("1h2m3s"), 3723);
  assert.equal(parseYouTubeStartParam("invalid"), 0);

  assert.deepEqual(
    parseYouTubeAudioUrl("https://www.youtube.com/watch?v=2Vv-BfVoq4g&t=1m2s&end=2m30s"),
    { videoId: "2Vv-BfVoq4g", startSeconds: 62, endSeconds: 150 }
  );
  // Abaikan end jika end <= start
  assert.deepEqual(
    parseYouTubeAudioUrl("https://www.youtube.com/watch?v=2Vv-BfVoq4g&t=90s&end=60s"),
    { videoId: "2Vv-BfVoq4g", startSeconds: 90 }
  );
  assert.deepEqual(
    parseYouTubeAudioUrl("https://youtu.be/jia3fhBQ8qI?t=45"),
    { videoId: "jia3fhBQ8qI", startSeconds: 45 }
  );
  assert.deepEqual(
    parseYouTubeAudioUrl("https://music.youtube.com/watch?v=dt4Ueda_h6Y&start=46"),
    { videoId: "dt4Ueda_h6Y", startSeconds: 46 }
  );
  assert.deepEqual(
    parseYouTubeAudioUrl("https://www.youtube.com/shorts/GxldQ9eX2wo"),
    { videoId: "GxldQ9eX2wo", startSeconds: 0 }
  );
  assert.equal(parseYouTubeAudioUrl("https://example.com/lagu.mp3"), null);
  assert.equal(parseYouTubeAudioUrl("/music/ungkapan-sayang/jaz-bersamamu.mp3"), null);
  assert.equal(parseYouTubeAudioUrl("not-a-url"), null);
});

test("music-library: buildYouTubeAudioUrl, buildYouTubeEmbedUrl, dan applyAudioRange/parseAudioRange", () => {
  assert.equal(
    buildYouTubeAudioUrl("2Vv-BfVoq4g", 62, 150),
    "https://www.youtube.com/watch?v=2Vv-BfVoq4g&t=62s&end=150s"
  );
  assert.equal(
    buildYouTubeAudioUrl("2Vv-BfVoq4g", 0, 120),
    "https://www.youtube.com/watch?v=2Vv-BfVoq4g&end=120s"
  );
  assert.equal(
    buildYouTubeAudioUrl("2Vv-BfVoq4g", 0),
    "https://www.youtube.com/watch?v=2Vv-BfVoq4g"
  );

  const embed = buildYouTubeEmbedUrl("2Vv-BfVoq4g", {
    startSeconds: 62,
    endSeconds: 150,
    autoplay: true,
    loop: true,
    enableJsApi: true,
  });
  assert.ok(embed.startsWith("https://www.youtube-nocookie.com/embed/2Vv-BfVoq4g?"));
  assert.ok(embed.includes("start=62"));
  assert.ok(embed.includes("end=150"));
  assert.ok(embed.includes("autoplay=1"));
  assert.ok(embed.includes("enablejsapi=1"));
  assert.ok(embed.includes("loop=1"));
  assert.ok(embed.includes("playlist=2Vv-BfVoq4g"));

  // Gallery / custom MP3 Media Fragment (#t=start,end)
  const rangedLocal = applyAudioRange(
    "/music/ungkapan-sayang/jaz-bersamamu.mp3",
    { startSeconds: 10, endSeconds: 45 },
    236
  );
  assert.equal(rangedLocal, "/music/ungkapan-sayang/jaz-bersamamu.mp3#t=10,45");
  assert.equal(isValidMediaUrl(rangedLocal), true);
  assert.deepEqual(parseAudioRange(rangedLocal), { startSeconds: 10, endSeconds: 45 });
  assert.equal(
    stripAudioRangeFragment(rangedLocal),
    "/music/ungkapan-sayang/jaz-bersamamu.mp3"
  );

  // Reset ke penuh menghilangkan fragment
  assert.equal(
    applyAudioRange(rangedLocal, { startSeconds: 0, endSeconds: 236 }, 236),
    "/music/ungkapan-sayang/jaz-bersamamu.mp3"
  );

  // YouTube range round-trip
  const rangedYt = applyAudioRange(
    "https://www.youtube.com/watch?v=jia3fhBQ8qI",
    { startSeconds: 45, endSeconds: 135 },
    260
  );
  assert.equal(rangedYt, "https://www.youtube.com/watch?v=jia3fhBQ8qI&t=45s&end=135s");
  assert.equal(isValidMediaUrl(rangedYt), true);
  assert.deepEqual(parseAudioRange(rangedYt), { startSeconds: 45, endSeconds: 135 });
});

test("music-library: filter galeri per kategori (kosong & terisi) dan deteksi getMusicDisplayInfo", () => {
  // Saat galeri kosong -> aman tanpa error
  assert.deepEqual(getGalleryTracksForCategory("ungkapan-sayang", []), []);
  assert.equal(getDefaultGalleryTrack("ungkapan-sayang", []), undefined);

  // Saat galeri terisi -> memilih track sesuai kategori & fallback ke track pertama bila kategori kosong
  assert.equal(getGalleryTracksForCategory("ungkapan-sayang", SAMPLE_GALLERY).length, 1);
  assert.equal(getDefaultGalleryTrack("ungkapan-sayang", SAMPLE_GALLERY)?.id, "ungkapan-sayang/jaz-bersamamu");
  assert.equal(getDefaultGalleryTrack("birthday", SAMPLE_GALLERY)?.id, "birthday/bruno-mars-count-on-me");
  assert.equal(getDefaultGalleryTrack("anniversary", SAMPLE_GALLERY)?.id, "anniversary/ed-sheeran-perfect");
  assert.equal(getDefaultGalleryTrack("permintaan-maaf", SAMPLE_GALLERY)?.id, "ungkapan-sayang/jaz-bersamamu");

  // getMusicDisplayInfo
  assert.equal(getMusicDisplayInfo("", SAMPLE_GALLERY), null);

  const galleryRanged = getMusicDisplayInfo(
    "/music/ungkapan-sayang/jaz-bersamamu.mp3#t=30,90",
    SAMPLE_GALLERY
  );
  assert.deepEqual(galleryRanged, {
    title: "Bersamamu",
    artist: "Jaz",
    source: "gallery",
    durationSeconds: 236,
    startSeconds: 30,
    endSeconds: 90,
  });

  // Fallback pengenalan path /music/ walau belum ada di manifest
  const orphanGallery = getMusicDisplayInfo("/music/birthday/lagu-spesial.mp3#t=5,30", []);
  assert.deepEqual(orphanGallery, {
    title: "Lagu Spesial",
    artist: "Galeri Musik",
    source: "gallery",
    startSeconds: 5,
    endSeconds: 30,
  });

  const ytPreset = getMusicDisplayInfo("https://www.youtube.com/watch?v=2Vv-BfVoq4g&t=62s&end=150s");
  assert.deepEqual(ytPreset, {
    title: "Perfect",
    artist: "Ed Sheeran",
    source: "youtube",
    durationSeconds: 280,
    reffStartSeconds: 62,
    startSeconds: 62,
    endSeconds: 150,
  });

  const ytCustom = getMusicDisplayInfo("https://youtu.be/dQw4w9WgXcQ?t=10");
  assert.deepEqual(ytCustom, {
    title: "Lagu YouTube",
    artist: "YouTube",
    source: "youtube",
    startSeconds: 10,
  });

  const uploaded = getMusicDisplayInfo(
    "https://demo.supabase.co/storage/v1/object/public/musik/11111111-1111-1111-1111-111111111111/550e8400-e29b-41d4-a716-446655440000-lagu-kita-berdua.mp3#t=15,75"
  );
  assert.deepEqual(uploaded, {
    title: "lagu kita berdua",
    artist: "File Audio",
    source: "upload",
    startSeconds: 15,
    endSeconds: 75,
  });

  const demoBlob = getMusicDisplayInfo("blob:http://localhost:3000/abc-123#t=5,35");
  assert.deepEqual(demoBlob, {
    title: "Audio Unggahan",
    artist: "File Audio",
    source: "upload",
    startSeconds: 5,
    endSeconds: 35,
  });

  const mp3Custom = getMusicDisplayInfo("https://cdn.example.com/song.mp3#t=15,90");
  assert.deepEqual(mp3Custom, {
    title: "Musik Latar",
    artist: "Audio Kustom",
    source: "custom",
    startSeconds: 15,
    endSeconds: 90,
  });
});
