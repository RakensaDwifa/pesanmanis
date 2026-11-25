import type { MoodKey } from "./mood.ts";
import type { TemplateCategory } from "./types.ts";
import {
  GALLERY_MUSIC_MANIFEST,
  type GalleryMusicManifestEntry,
} from "./music-manifest.ts";

export interface GalleryMusicTrack {
  id: string;
  slug: string;
  title: string;
  artist: string;
  category: TemplateCategory;
  /** Playable static path in public/music/<category>/<slug>.mp3 */
  url: string;
  durationLabel: string;
  durationSeconds: number;
  sizeKb: number;
}

export interface YouTubeMusicPreset {
  id: string;
  title: string;
  artist: string;
  videoId: string;
  /** Default start timestamp (0 = dari awal lagu). */
  startSeconds: number;
  /** Optional curated chorus timestamp used only when user clicks "Mulai Reff". */
  reffStartSeconds: number;
  category: TemplateCategory;
  mood: MoodKey;
  durationLabel: string;
  durationSeconds: number;
  /** Canonical stored URL that passes isValidMediaUrl() without schema changes. */
  url: string;
}

export interface AudioRange {
  startSeconds: number;
  endSeconds?: number;
}

export interface ParsedYouTubeAudio extends AudioRange {
  videoId: string;
}

export interface MusicDisplayInfo {
  title: string;
  artist: string;
  source: "gallery" | "upload" | "youtube" | "custom";
  durationSeconds?: number;
  reffStartSeconds?: number;
  startSeconds: number;
  endSeconds?: number;
}

/**
 * Parses a raw audio filename like "Sal Priadi - Kita Usahakan Rumah Itu.mp3"
 * into clean `{ title, artist }` labels.
 */
export function parseTrackFilename(fileName: string): {
  title: string;
  artist: string;
} {
  const base = fileName.trim().replace(/\.[^/.]+$/, "").trim();
  const dashIdx = base.indexOf(" - ");
  if (dashIdx > 0) {
    const artist = base.slice(0, dashIdx).trim();
    const title = base.slice(dashIdx + 3).trim();
    if (artist && title) return { title, artist };
  }
  const clean = base.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return { title: clean || "Lagu Galeri", artist: "" };
}

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const MAX_AUDIO_SECONDS = 36000;

/**
 * Parses duration labels like "04:20" or "1:02:15" into total integer seconds.
 */
export function parseDurationLabel(label: string | null | undefined): number {
  if (!label) return 0;
  const parts = label
    .trim()
    .split(":")
    .map((p) => Number.parseInt(p, 10));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  if (parts.length === 2) return Math.min(MAX_AUDIO_SECONDS, parts[0] * 60 + parts[1]);
  if (parts.length === 3) {
    return Math.min(MAX_AUDIO_SECONDS, parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }
  return 0;
}

/**
 * Splits integer total seconds into non-negative `{ minutes, seconds }` (`seconds` in `0..59`).
 */
export function splitMinutesSeconds(totalSeconds: number): {
  minutes: number;
  seconds: number;
} {
  const safe = Math.min(
    MAX_AUDIO_SECONDS,
    Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0))
  );
  return {
    minutes: Math.floor(safe / 60),
    seconds: safe % 60,
  };
}

/**
 * Clamps a candidate boundary timestamp to `[minSeconds, maxSeconds]` and reports
 * whether clamping occurred so UI components can display gentle inline hints.
 */
export function clampAudioBoundary(
  candidateSeconds: number,
  minSeconds: number,
  maxSeconds: number
): { value: number; clamped: "min" | "max" | null } {
  const safeMin = Math.max(0, Math.floor(minSeconds));
  const safeMax = Math.max(safeMin, Math.min(MAX_AUDIO_SECONDS, Math.floor(maxSeconds)));
  const safeCandidate = Math.floor(Number.isFinite(candidateSeconds) ? candidateSeconds : safeMin);
  if (safeCandidate < safeMin) return { value: safeMin, clamped: "min" };
  if (safeCandidate > safeMax) return { value: safeMax, clamped: "max" };
  return { value: safeCandidate, clamped: null };
}

/**
 * Formats integer seconds into compact "m:ss" (or "h:mm:ss" for >= 1 hour).
 */
export function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Parses user time inputs such as "1:30", "01:30", "90", "90s", or "1m30s" into integer seconds.
 * Returns null if the string cannot be parsed.
 */
export function parseTimeInput(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length < 2 || parts.length > 3) return null;
    if (parts.some((p) => !/^\d+$/.test(p))) return null;
    const nums = parts.map((p) => Number.parseInt(p, 10));
    if (parts.length === 2) {
      return Math.min(MAX_AUDIO_SECONDS, nums[0] * 60 + nums[1]);
    }
    return Math.min(MAX_AUDIO_SECONDS, nums[0] * 3600 + nums[1] * 60 + nums[2]);
  }

  if (/^\d+$/.test(trimmed)) {
    return Math.min(MAX_AUDIO_SECONDS, Number.parseInt(trimmed, 10));
  }

  const hmsMatch = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(trimmed);
  if (hmsMatch && (hmsMatch[1] || hmsMatch[2] || hmsMatch[3])) {
    const h = hmsMatch[1] ? Number.parseInt(hmsMatch[1], 10) : 0;
    const m = hmsMatch[2] ? Number.parseInt(hmsMatch[2], 10) : 0;
    const s = hmsMatch[3] ? Number.parseInt(hmsMatch[3], 10) : 0;
    return Math.min(MAX_AUDIO_SECONDS, h * 3600 + m * 60 + s);
  }

  return null;
}

/**
 * Parses YouTube `t`, `start`, or `end` timestamps like "45", "45s", "1m30s", or "1h2m3s".
 */
export function parseYouTubeStartParam(raw: string | null | undefined): number {
  const parsed = parseTimeInput(raw);
  return parsed === null ? 0 : parsed;
}

/**
 * Strips any W3C Media Fragment (`#t=...`) from a local or custom audio URL.
 */
export function stripAudioRangeFragment(rawUrl: string): string {
  return rawUrl.trim().replace(/#t=[^#]*$/i, "");
}

/**
 * Extracts YouTube video ID, start timestamp, and optional end timestamp from
 * watch, youtu.be, shorts, music, or embed URLs.
 */
export function parseYouTubeAudioUrl(
  rawUrl: string | undefined | null
): ParsedYouTubeAudio | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = parsed.pathname.slice(1).split("/")[0] || null;
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v");
      } else if (
        parsed.pathname.startsWith("/shorts/") ||
        parsed.pathname.startsWith("/embed/") ||
        parsed.pathname.startsWith("/live/")
      ) {
        videoId = parsed.pathname.split("/")[2] || null;
      }
    }

    if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) return null;
    const startSeconds = parseYouTubeStartParam(
      parsed.searchParams.get("t") ?? parsed.searchParams.get("start")
    );
    const rawEnd = parsed.searchParams.get("end");
    const parsedEnd = rawEnd ? parseYouTubeStartParam(rawEnd) : 0;
    const endSeconds = parsedEnd > startSeconds ? parsedEnd : undefined;

    return endSeconds !== undefined
      ? { videoId, startSeconds, endSeconds }
      : { videoId, startSeconds };
  } catch {
    return null;
  }
}

export function buildYouTubeAudioUrl(
  videoId: string,
  startSeconds = 0,
  endSeconds?: number
): string {
  const safeStart = Math.min(MAX_AUDIO_SECONDS, Math.max(0, Math.floor(startSeconds)));
  const safeEnd =
    endSeconds !== undefined && Number.isFinite(endSeconds)
      ? Math.min(MAX_AUDIO_SECONDS, Math.floor(endSeconds))
      : undefined;

  const params: string[] = [`v=${videoId}`];
  if (safeStart > 0) params.push(`t=${safeStart}s`);
  if (safeEnd !== undefined && safeEnd > safeStart) params.push(`end=${safeEnd}s`);
  return `https://www.youtube.com/watch?${params.join("&")}`;
}

export function buildYouTubeEmbedUrl(
  videoId: string,
  options?: {
    startSeconds?: number;
    endSeconds?: number;
    autoplay?: boolean;
    loop?: boolean;
    enableJsApi?: boolean;
  }
): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  const start = Math.min(MAX_AUDIO_SECONDS, Math.max(0, Math.floor(options?.startSeconds ?? 0)));
  if (start > 0) params.set("start", String(start));
  const rawEnd =
    options?.endSeconds !== undefined && Number.isFinite(options.endSeconds)
      ? Math.min(MAX_AUDIO_SECONDS, Math.floor(options.endSeconds))
      : undefined;
  if (rawEnd !== undefined && rawEnd > start) params.set("end", String(rawEnd));
  if (options?.autoplay) params.set("autoplay", "1");
  if (options?.enableJsApi) params.set("enablejsapi", "1");
  if (options?.loop) {
    params.set("loop", "1");
    params.set("playlist", videoId);
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Parses start and optional end timestamps from any supported music URL:
 * - YouTube watch/embed/youtu.be (`&t=&end=`)
 * - Local instrumental or custom MP3 (`#t=start,end` W3C Media Fragment)
 */
export function parseAudioRange(rawUrl: string | undefined | null): AudioRange {
  if (!rawUrl || typeof rawUrl !== "string") return { startSeconds: 0 };
  const trimmed = rawUrl.trim();
  if (!trimmed) return { startSeconds: 0 };

  const yt = parseYouTubeAudioUrl(trimmed);
  if (yt) {
    return yt.endSeconds !== undefined
      ? { startSeconds: yt.startSeconds, endSeconds: yt.endSeconds }
      : { startSeconds: yt.startSeconds };
  }

  const fragMatch = /#t=(\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?$/i.exec(trimmed);
  if (!fragMatch) return { startSeconds: 0 };

  const startSeconds = Math.min(
    MAX_AUDIO_SECONDS,
    Math.max(0, Math.floor(Number.parseFloat(fragMatch[1])))
  );
  const rawEnd =
    fragMatch[2] !== undefined
      ? Math.min(MAX_AUDIO_SECONDS, Math.max(0, Math.floor(Number.parseFloat(fragMatch[2]))))
      : undefined;
  const endSeconds = rawEnd !== undefined && rawEnd > startSeconds ? rawEnd : undefined;

  return endSeconds !== undefined ? { startSeconds, endSeconds } : { startSeconds };
}

/**
 * Encodes a start/end playback range onto any supported music URL without requiring
 * database schema changes. Passing `endSeconds >= maxDuration` omits `end` (plays to full end).
 */
export function applyAudioRange(
  rawUrl: string,
  range: AudioRange,
  maxDuration?: number
): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  const safeStart = Math.min(
    MAX_AUDIO_SECONDS,
    Math.max(0, Math.floor(Number.isFinite(range.startSeconds) ? range.startSeconds : 0))
  );
  const rawEnd =
    range.endSeconds !== undefined && Number.isFinite(range.endSeconds)
      ? Math.min(MAX_AUDIO_SECONDS, Math.floor(range.endSeconds))
      : undefined;
  const effectiveEnd =
    rawEnd !== undefined &&
    rawEnd > safeStart &&
    (maxDuration === undefined || rawEnd < Math.floor(maxDuration))
      ? rawEnd
      : undefined;

  const yt = parseYouTubeAudioUrl(trimmed);
  if (yt) {
    return buildYouTubeAudioUrl(yt.videoId, safeStart, effectiveEnd);
  }

  const base = stripAudioRangeFragment(trimmed);
  if (safeStart === 0 && effectiveEnd === undefined) {
    return base;
  }
  return effectiveEnd !== undefined
    ? `${base}#t=${safeStart},${effectiveEnd}`
    : `${base}#t=${safeStart}`;
}

/**
 * Galeri musik MP3 yang di-host di `public/music/<kategori>/` dan dihasilkan otomatis
 * oleh `npm run music:build` dari folder `raw-music/<kategori>/`.
 */
export const GALLERY_MUSIC_TRACKS: GalleryMusicTrack[] =
  GALLERY_MUSIC_MANIFEST.map((entry: GalleryMusicManifestEntry) => ({
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    artist: entry.artist,
    category: entry.category,
    url: entry.url,
    durationLabel: entry.durationLabel,
    durationSeconds: entry.durationSeconds,
    sizeKb: entry.sizeKb,
  }));

/**
 * Mengembalikan daftar lagu galeri MP3 untuk kategori momen tertentu.
 * Jika kategori tidak diisi, mengembalikan seluruh lagu galeri.
 */
export function getGalleryTracksForCategory(
  category?: TemplateCategory,
  tracks: readonly GalleryMusicTrack[] = GALLERY_MUSIC_TRACKS
): GalleryMusicTrack[] {
  if (!category) return [...tracks];
  return tracks.filter((t) => t.category === category);
}

/**
 * Mengembalikan track galeri MP3 pertama untuk kategori tertentu, atau fallback ke
 * track pertama galeri global, atau `undefined` jika belum ada file MP3 yang dibangun.
 */
export function getDefaultGalleryTrack(
  category?: TemplateCategory,
  tracks: readonly GalleryMusicTrack[] = GALLERY_MUSIC_TRACKS
): GalleryMusicTrack | undefined {
  if (tracks.length === 0) return undefined;
  const matching = category ? tracks.filter((t) => t.category === category) : tracks;
  return matching[0] ?? tracks[0];
}

interface YouTubePresetSpec {
  id: string;
  title: string;
  artist: string;
  videoId: string;
  reffStartSeconds: number;
  category: TemplateCategory;
  mood: MoodKey;
  durationLabel: string;
}

const YOUTUBE_PRESET_SPECS: YouTubePresetSpec[] = [
  // ── Love Message (6 lagu) ──
  {
    id: "yt-penjaga-hati",
    title: "Penjaga Hati",
    artist: "Nadhif Basalamah",
    videoId: "jia3fhBQ8qI",
    reffStartSeconds: 45,
    category: "ungkapan-sayang",
    mood: "romantic",
    durationLabel: "04:20",
  },
  {
    id: "yt-bergema-selamanya",
    title: "Bergema Sampai Selamanya",
    artist: "Nadhif Basalamah",
    videoId: "bAoxY1jQnqo",
    reffStartSeconds: 42,
    category: "ungkapan-sayang",
    mood: "romantic",
    durationLabel: "03:19",
  },
  {
    id: "yt-bersamamu",
    title: "Bersamamu",
    artist: "Jaz",
    videoId: "8hlcLyQ7sd4",
    reffStartSeconds: 50,
    category: "ungkapan-sayang",
    mood: "romantic",
    durationLabel: "03:56",
  },
  {
    id: "yt-rumah-itu",
    title: "Kita Usahakan Rumah Itu",
    artist: "Sal Priadi",
    videoId: "7SqNVv98e8Q",
    reffStartSeconds: 42,
    category: "ungkapan-sayang",
    mood: "sunset",
    durationLabel: "03:31",
  },
  {
    id: "yt-until-i-found-you",
    title: "Until I Found You",
    artist: "Stephen Sanchez",
    videoId: "GxldQ9eX2wo",
    reffStartSeconds: 48,
    category: "ungkapan-sayang",
    mood: "romantic",
    durationLabel: "02:56",
  },
  {
    id: "yt-nothing",
    title: "Nothing",
    artist: "Bruno Major",
    videoId: "Nv3bQao8l3I",
    reffStartSeconds: 36,
    category: "ungkapan-sayang",
    mood: "calm",
    durationLabel: "02:45",
  },

  // ── Birthday (6 lagu) ──
  {
    id: "yt-selamat-ulang-tahun",
    title: "Selamat Ulang Tahun",
    artist: "Jamrud",
    videoId: "QJ80jTm4K8I",
    reffStartSeconds: 20,
    category: "birthday",
    mood: "playful",
    durationLabel: "03:20",
  },
  {
    id: "yt-count-on-me",
    title: "Count on Me",
    artist: "Bruno Mars",
    videoId: "6k8cpUkKK4c",
    reffStartSeconds: 32,
    category: "birthday",
    mood: "playful",
    durationLabel: "03:17",
  },
  {
    id: "yt-just-the-way-you-are",
    title: "Just The Way You Are",
    artist: "Bruno Mars",
    videoId: "LjhCEhWiKXk",
    reffStartSeconds: 48,
    category: "birthday",
    mood: "playful",
    durationLabel: "03:56",
  },
  {
    id: "yt-tujuh-belas",
    title: "Tujuh Belas",
    artist: "TULUS",
    videoId: "zyLmavBAY7k",
    reffStartSeconds: 46,
    category: "birthday",
    mood: "sunset",
    durationLabel: "04:16",
  },
  {
    id: "yt-monokrom",
    title: "Monokrom",
    artist: "TULUS",
    videoId: "0qP6wknICCQ",
    reffStartSeconds: 44,
    category: "birthday",
    mood: "calm",
    durationLabel: "03:38",
  },
  {
    id: "yt-rehat",
    title: "Rehat",
    artist: "Kunto Aji",
    videoId: "e70MI91ycWg",
    reffStartSeconds: 52,
    category: "birthday",
    mood: "calm",
    durationLabel: "05:54",
  },

  // ── Anniversary (6 lagu) ──
  {
    id: "yt-perfect",
    title: "Perfect",
    artist: "Ed Sheeran",
    videoId: "2Vv-BfVoq4g",
    reffStartSeconds: 62,
    category: "anniversary",
    mood: "romantic",
    durationLabel: "04:40",
  },
  {
    id: "yt-a-thousand-years",
    title: "A Thousand Years",
    artist: "Christina Perri",
    videoId: "rtOvBOTyX00",
    reffStartSeconds: 54,
    category: "anniversary",
    mood: "romantic",
    durationLabel: "04:46",
  },
  {
    id: "yt-all-of-me",
    title: "All of Me",
    artist: "John Legend",
    videoId: "450p7goxZqg",
    reffStartSeconds: 55,
    category: "anniversary",
    mood: "romantic",
    durationLabel: "04:30",
  },
  {
    id: "yt-akad",
    title: "Akad",
    artist: "Payung Teduh",
    videoId: "viW0M5R2BLo",
    reffStartSeconds: 40,
    category: "anniversary",
    mood: "sunset",
    durationLabel: "04:16",
  },
  {
    id: "yt-teman-hidup",
    title: "Teman Hidup",
    artist: "TULUS",
    videoId: "dt4Ueda_h6Y",
    reffStartSeconds: 46,
    category: "anniversary",
    mood: "calm",
    durationLabel: "03:38",
  },
  {
    id: "yt-cinta-luar-biasa",
    title: "Cinta Luar Biasa",
    artist: "Andmesh Kamaleng",
    videoId: "FcOctsNXyjk",
    reffStartSeconds: 48,
    category: "anniversary",
    mood: "romantic",
    durationLabel: "04:31",
  },

  // ── Sorry Message (6 lagu) ──
  {
    id: "yt-bunga-maaf",
    title: "Bunga Maaf",
    artist: "The Lantis",
    videoId: "wn05Kgt73HA",
    reffStartSeconds: 52,
    category: "permintaan-maaf",
    mood: "lavender",
    durationLabel: "04:16",
  },
  {
    id: "yt-kutunggu-kabarmu",
    title: "Kutunggu Kabarmu",
    artist: "Maudy Ayunda",
    videoId: "ibCVwM34xgU",
    reffStartSeconds: 45,
    category: "permintaan-maaf",
    mood: "calm",
    durationLabel: "04:13",
  },
  {
    id: "yt-kali-kedua",
    title: "Kali Kedua",
    artist: "Raisa",
    videoId: "SHj2kJzVi_g",
    reffStartSeconds: 48,
    category: "permintaan-maaf",
    mood: "lavender",
    durationLabel: "04:20",
  },
  {
    id: "yt-evaluasi",
    title: "Evaluasi",
    artist: "Hindia",
    videoId: "01WhxHpsOyc",
    reffStartSeconds: 40,
    category: "permintaan-maaf",
    mood: "calm",
    durationLabel: "03:22",
  },
  {
    id: "yt-back-to-december",
    title: "Back To December",
    artist: "Taylor Swift",
    videoId: "QUwxKWT6m7U",
    reffStartSeconds: 58,
    category: "permintaan-maaf",
    mood: "lavender",
    durationLabel: "04:57",
  },
  {
    id: "yt-fix-you",
    title: "Fix You",
    artist: "Coldplay",
    videoId: "k4V3Mo61fJM",
    reffStartSeconds: 155,
    category: "permintaan-maaf",
    mood: "lavender",
    durationLabel: "04:55",
  },
];

/**
 * Kurasi 24 lagu pop populer via YouTube Embed resmi (6 lagu per kategori PesanManis).
 * Seluruh lagu dimulai dari awal (0:00) secara default; `reffStartSeconds` tersedia
 * sebagai pintasan opsional di pengatur range Builder.
 */
export const YOUTUBE_MUSIC_LIBRARY: YouTubeMusicPreset[] = YOUTUBE_PRESET_SPECS.map(
  (spec) => ({
    ...spec,
    startSeconds: 0,
    durationSeconds: parseDurationLabel(spec.durationLabel) || 240,
    url: buildYouTubeAudioUrl(spec.videoId, 0),
  })
);

/**
 * Sampel musik otomatis untuk kartu Hero & Kurir Kado:
 * memakai lagu pertama dari Galeri MP3 yang sudah dibangun, atau `undefined` saat masih kosong.
 */
export const HERO_SAMPLE_MUSIC_URL: string | undefined =
  getDefaultGalleryTrack("ungkapan-sayang")?.url;
export const KURIR_SAMPLE_MUSIC_URL: string | undefined =
  getDefaultGalleryTrack("birthday")?.url ?? getDefaultGalleryTrack()?.url;

/**
 * Mencari judul, artis, durasi, & range aktif dari URL musik apa pun
 * (galeri MP3 lokal, preset YouTube, YouTube bebas, audio unggahan, atau URL MP3 kustom).
 */
export function getMusicDisplayInfo(
  rawUrl: string | undefined | null,
  galleryTracks: readonly GalleryMusicTrack[] = GALLERY_MUSIC_TRACKS
): MusicDisplayInfo | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const trimmed = rawUrl.trim();
  const range = parseAudioRange(trimmed);

  const stripped = stripAudioRangeFragment(trimmed);
  const galleryMatch = galleryTracks.find((t) => t.url === stripped);
  if (galleryMatch) {
    return {
      title: galleryMatch.title,
      artist: galleryMatch.artist || "Galeri Musik",
      source: "gallery",
      durationSeconds: galleryMatch.durationSeconds,
      startSeconds: range.startSeconds,
      ...(range.endSeconds !== undefined ? { endSeconds: range.endSeconds } : {}),
    };
  }

  if (stripped.startsWith("/music/")) {
    const fileSeg = stripped.split("/").pop()?.split("?")[0] ?? "";
    const slugTitle = decodeURIComponent(fileSeg.replace(/\.[^/.]+$/, ""))
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
    return {
      title: slugTitle || "Lagu Galeri",
      artist: "Galeri Musik",
      source: "gallery",
      startSeconds: range.startSeconds,
      ...(range.endSeconds !== undefined ? { endSeconds: range.endSeconds } : {}),
    };
  }

  const ytParsed = parseYouTubeAudioUrl(trimmed);
  if (ytParsed) {
    const ytPreset = YOUTUBE_MUSIC_LIBRARY.find(
      (t) => t.videoId === ytParsed.videoId
    );
    if (ytPreset) {
      return {
        title: ytPreset.title,
        artist: ytPreset.artist,
        source: "youtube",
        durationSeconds: ytPreset.durationSeconds,
        reffStartSeconds: ytPreset.reffStartSeconds,
        startSeconds: ytParsed.startSeconds,
        ...(ytParsed.endSeconds !== undefined ? { endSeconds: ytParsed.endSeconds } : {}),
      };
    }
    return {
      title: "Lagu YouTube",
      artist: "YouTube",
      source: "youtube",
      startSeconds: ytParsed.startSeconds,
      ...(ytParsed.endSeconds !== undefined ? { endSeconds: ytParsed.endSeconds } : {}),
    };
  }

  if (stripped.startsWith("blob:") || stripped.includes("/storage/v1/object/public/musik/")) {
    let readableTitle = "Audio Unggahan";
    if (stripped.includes("/storage/v1/object/public/musik/")) {
      const lastSeg = stripped.split("/").pop()?.split("?")[0] ?? "";
      // Strip leading "<uuid>-" prefix if present and remove file extension
      const withoutUuid = lastSeg.replace(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-?/i,
        ""
      );
      const withoutExt = withoutUuid.replace(/\.[a-z0-9]{2,5}$/i, "");
      const cleaned = decodeURIComponent(withoutExt).replace(/[-_]+/g, " ").trim();
      if (cleaned) readableTitle = cleaned;
    }
    return {
      title: readableTitle,
      artist: "File Audio",
      source: "upload",
      startSeconds: range.startSeconds,
      ...(range.endSeconds !== undefined ? { endSeconds: range.endSeconds } : {}),
    };
  }

  return {
    title: "Musik Latar",
    artist: "Audio Kustom",
    source: "custom",
    startSeconds: range.startSeconds,
    ...(range.endSeconds !== undefined ? { endSeconds: range.endSeconds } : {}),
  };
}
