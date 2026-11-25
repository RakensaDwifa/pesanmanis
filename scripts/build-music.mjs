#!/usr/bin/env node
/**
 * Build & optimize self-hosted MP3 music tracks from raw-music/<category>/ into public/music/<category>/.
 * - Auto-discovers all audio files across the 4 PesanManis occasion folders:
 *     ungkapan-sayang, birthday, anniversary, permintaan-maaf
 * - Keeps FULL song duration (no forced 60s truncation) so users can trim freely in Builder
 * - Normalizes loudness to -16 LUFS and strips metadata / embedded cover art
 * - Encodes lightweight stereo 44.1 kHz MP3 (default 112 kbps; override with --bitrate 96k)
 * - Incremental build: skips files whose output MP3 is newer than the source (use --force to rebuild)
 * - Preserves already-built public/music/ tracks when raw-music/ is absent (use --prune to remove orphans)
 * - Regenerates lib/music-manifest.ts automatically
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, "raw-music");
const OUT_DIR = path.join(ROOT, "public", "music");
const MANIFEST_PATH = path.join(ROOT, "lib", "music-manifest.ts");

const CATEGORIES = [
  "ungkapan-sayang",
  "birthday",
  "anniversary",
  "permintaan-maaf",
];

const SUPPORTED_EXTS = new Set([".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".mpeg", ".mpga"]);

const argv = process.argv.slice(2);
const FORCE = argv.includes("--force");
const PRUNE = argv.includes("--prune");

function readBitrateArg() {
  const idx = argv.indexOf("--bitrate");
  if (idx !== -1 && argv[idx + 1] && /^\d+k$/i.test(argv[idx + 1])) {
    return argv[idx + 1].toLowerCase();
  }
  const eq = argv.find((a) => a.startsWith("--bitrate="));
  if (eq) {
    const val = eq.slice("--bitrate=".length);
    if (/^\d+k$/i.test(val)) return val.toLowerCase();
  }
  return "112k";
}

const BITRATE = readBitrateArg();

function hasCommand(cmd) {
  const res = spawnSync(cmd, ["-version"], { stdio: "ignore" });
  return res.status === 0;
}

function slugify(text) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "lagu";
}

function titleCaseFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseFilenameMeta(fileName) {
  const base = fileName.replace(/\.[^/.]+$/, "").trim();
  const dashIdx = base.indexOf(" - ");
  if (dashIdx > 0) {
    const artist = base.slice(0, dashIdx).trim();
    const title = base.slice(dashIdx + 3).trim();
    if (artist && title) return { title, artist };
  }
  const clean = base.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return { title: clean || "Lagu Galeri", artist: "" };
}

function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const rounded = Math.round(sec);
  const hours = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const rem = rounded % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  }
  return `${mins}:${String(rem).padStart(2, "0")}`;
}

function probeAudioInfo(filePath) {
  const res = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration:format_tags=title,artist",
      "-of",
      "json",
      filePath,
    ],
    { encoding: "utf8" }
  );
  if (res.status !== 0 || !res.stdout) {
    return { durationSec: null, title: "", artist: "" };
  }
  try {
    const parsed = JSON.parse(res.stdout);
    const fmt = parsed?.format ?? {};
    const rawDur = Number.parseFloat(fmt.duration ?? "");
    const tags = fmt.tags ?? {};
    return {
      durationSec: Number.isFinite(rawDur) && rawDur > 0 ? Math.round(rawDur) : null,
      title: typeof tags.title === "string" ? tags.title.trim() : "",
      artist: typeof tags.artist === "string" ? tags.artist.trim() : "",
    };
  } catch {
    return { durationSec: null, title: "", artist: "" };
  }
}

function optimizeTrack(inputPath, outputPath) {
  const args = [
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-map_metadata",
    "-1",
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-ar",
    "44100",
    "-ac",
    "2",
    "-c:a",
    "libmp3lame",
    "-b:a",
    BITRATE,
    outputPath,
  ];
  const res = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(res.stderr || "ffmpeg failed");
  }
}

/**
 * Reads any previously generated manifest entries so existing public/music/ tracks
 * retain nice Title & Artist labels even when raw-music/ isn't present on disk.
 */
function readExistingManifestMap() {
  const map = new Map();
  if (!fs.existsSync(MANIFEST_PATH)) return map;
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
    const match = raw.match(
      /export const GALLERY_MUSIC_MANIFEST:\s*GalleryMusicManifestEntry\[\]\s*=\s*(\[[\s\S]*?\]);/
    );
    if (!match) return map;
    const entries = JSON.parse(match[1]);
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (entry && typeof entry.id === "string") {
          map.set(entry.id, entry);
        }
      }
    }
  } catch {
    // ignore unparseable legacy manifest
  }
  return map;
}

function writeManifest(entries) {
  const jsonBlock = JSON.stringify(entries, null, 2);
  const content = [
    "// Auto-generated by scripts/build-music.mjs. Do not edit manually; run `npm run music:build`.",
    "",
    "export type GalleryMusicCategory =",
    '  | "ungkapan-sayang"',
    '  | "birthday"',
    '  | "anniversary"',
    '  | "permintaan-maaf";',
    "",
    "export interface GalleryMusicManifestEntry {",
    "  id: string;",
    "  slug: string;",
    "  title: string;",
    "  artist: string;",
    "  category: GalleryMusicCategory;",
    "  url: string;",
    "  durationSeconds: number;",
    "  durationLabel: string;",
    "  sizeKb: number;",
    "}",
    "",
    `export const GALLERY_MUSIC_MANIFEST: GalleryMusicManifestEntry[] = ${jsonBlock};`,
    "",
  ].join("\n");
  fs.writeFileSync(MANIFEST_PATH, content, "utf8");
}

function main() {
  const ffmpegAvailable = hasCommand("ffmpeg") && hasCommand("ffprobe");
  const prevMap = readExistingManifestMap();

  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const entries = [];
  let builtCount = 0;
  let skippedCount = 0;
  let preservedCount = 0;
  let prunedCount = 0;

  console.log(`\n=== PesanManis Music Gallery Builder (bitrate ${BITRATE}) ===\n`);

  for (const category of CATEGORIES) {
    const rawCatDir = path.join(RAW_DIR, category);
    const outCatDir = path.join(OUT_DIR, category);
    fs.mkdirSync(rawCatDir, { recursive: true });

    const rawFiles = fs
      .readdirSync(rawCatDir, { withFileTypes: true })
      .filter(
        (d) =>
          d.isFile() && SUPPORTED_EXTS.has(path.extname(d.name).toLowerCase())
      )
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b, "id"));

    const handledSlugs = new Set();

    if (rawFiles.length > 0) {
      fs.mkdirSync(outCatDir, { recursive: true });
    }

    for (const fileName of rawFiles) {
      const rawPath = path.join(rawCatDir, fileName);
      const fromName = parseFilenameMeta(fileName);
      const rawSlug = slugify(fileName.replace(/\.[^/.]+$/, ""));
      let slug = rawSlug;
      let suffix = 2;
      while (handledSlugs.has(slug)) {
        slug = `${rawSlug}-${suffix++}`;
      }
      handledSlugs.add(slug);

      const id = `${category}/${slug}`;
      const outPath = path.join(outCatDir, `${slug}.mp3`);
      const outExists = fs.existsSync(outPath);
      const rawMtime = fs.statSync(rawPath).mtimeMs;
      const outMtime = outExists ? fs.statSync(outPath).mtimeMs : 0;
      const needsBuild = FORCE || !outExists || rawMtime > outMtime;

      let probedRaw = { durationSec: null, title: "", artist: "" };
      if (ffmpegAvailable) {
        probedRaw = probeAudioInfo(rawPath);
      }

      if (needsBuild) {
        if (!ffmpegAvailable) {
          console.error(
            `[ERROR] Ditemukan ${path.relative(ROOT, rawPath)}, tetapi ffmpeg/ffprobe tidak tersedia di PATH.`
          );
          process.exit(1);
        }
        process.stdout.write(`  [BUILD] ${id} <- ${fileName} ... `);
        optimizeTrack(rawPath, outPath);
        builtCount++;
        const outInfo = probeAudioInfo(outPath);
        const dur = outInfo.durationSec ?? probedRaw.durationSec ?? 0;
        const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
        const title = fromName.title;
        const artist = fromName.artist;
        const durationLabel = formatDuration(dur);

        entries.push({
          id,
          slug,
          title,
          artist,
          category,
          url: `/music/${category}/${slug}.mp3`,
          durationSeconds: dur,
          durationLabel,
          sizeKb,
        });
        console.log(`OK (${durationLabel}, ${sizeKb} KB)`);
      } else {
        skippedCount++;
        const prev = prevMap.get(id);
        const outInfo = ffmpegAvailable ? probeAudioInfo(outPath) : null;
        const dur = outInfo?.durationSec ?? prev?.durationSeconds ?? 0;
        const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
        const title = fromName.title;
        const artist = fromName.artist;
        const durationLabel = formatDuration(dur);

        entries.push({
          id,
          slug,
          title,
          artist,
          category,
          url: `/music/${category}/${slug}.mp3`,
          durationSeconds: dur,
          durationLabel,
          sizeKb,
        });
        console.log(`  [CACHE] ${id} (${durationLabel}, ${sizeKb} KB)`);
      }
    }

    // Handle pre-built MP3s in public/music/<category>/ not present in raw-music/<category>/
    if (fs.existsSync(outCatDir)) {
      const existingOutFiles = fs
        .readdirSync(outCatDir, { withFileTypes: true })
        .filter((d) => d.isFile() && d.name.toLowerCase().endsWith(".mp3"))
        .map((d) => d.name)
        .sort((a, b) => a.localeCompare(b, "id"));

      for (const mp3Name of existingOutFiles) {
        const slug = mp3Name.replace(/\.mp3$/i, "");
        if (handledSlugs.has(slug)) continue;

        const outPath = path.join(outCatDir, mp3Name);
        const id = `${category}/${slug}`;

        if (PRUNE) {
          fs.unlinkSync(outPath);
          prunedCount++;
          console.log(`  [PRUNE] ${id}`);
          continue;
        }

        const prev = prevMap.get(id);
        const outInfo = ffmpegAvailable ? probeAudioInfo(outPath) : null;
        const dur = outInfo?.durationSec ?? prev?.durationSeconds ?? 0;
        const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
        const durationLabel = formatDuration(dur);

        entries.push({
          id,
          slug,
          title: prev?.title || titleCaseFromSlug(slug),
          artist: prev?.artist || "",
          category,
          url: `/music/${category}/${slug}.mp3`,
          durationSeconds: dur,
          durationLabel,
          sizeKb,
        });
        preservedCount++;
        console.log(`  [READY] ${id} (${durationLabel}, ${sizeKb} KB)`);
      }
    }
  }

  entries.sort((a, b) => {
    const catDiff = CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
    if (catDiff !== 0) return catDiff;
    return a.title.localeCompare(b.title, "id");
  });

  writeManifest(entries);

  console.log(
    `\nRingkasan: ${builtCount} dikonversi, ${skippedCount} cache, ${preservedCount} sudah siap, ${prunedCount} dihapus (--prune). Total di galeri: ${entries.length} lagu.`
  );
  console.log(`Manifest diperbarui: ${path.relative(ROOT, MANIFEST_PATH)}\n`);
}

main();
