"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  FileAudio,
  Info,
  Link2,
  Loader2,
  Music,
  Pause,
  Play,
  PlayCircle,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GALLERY_MUSIC_TRACKS,
  YOUTUBE_MUSIC_LIBRARY,
  applyAudioRange,
  buildYouTubeAudioUrl,
  buildYouTubeEmbedUrl,
  formatSeconds,
  getGalleryTracksForCategory,
  getMusicDisplayInfo,
  parseAudioRange,
  parseYouTubeAudioUrl,
  stripAudioRangeFragment,
  type GalleryMusicTrack,
  type YouTubeMusicPreset,
} from "@/lib/music-library";
import TimeSegmentInput from "./TimeSegmentInput";
import { CATEGORY_META, type TemplateCategory } from "@/lib/types";

type MusicTab = "gallery" | "upload" | "youtube";

/**
 * Stops and releases an HTMLAudioElement without emitting a spurious `error` event.
 * Setting `src = ""` directly fires MEDIA_ERR_SRC_NOT_SUPPORTED on the old element,
 * so handlers are detached first and the source attribute is removed instead.
 */
function releaseAudio(el: HTMLAudioElement) {
  el.onerror = null;
  el.ontimeupdate = null;
  el.onended = null;
  el.pause();
  el.removeAttribute("src");
  try {
    el.load();
  } catch {
    // ignore
  }
}

const MIN_CLIP_SECONDS = 5;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const ALLOWED_AUDIO_EXTS = /\.(mp3|m4a|wav|ogg|webm)$/i;

interface MusicPickerProps {
  musicUrl?: string;
  templateCategory?: TemplateCategory;
  onChange: (nextUrl: string) => void;
  /** Optional uploader provided by Builder (Supabase Storage in remote mode, blob URL in Demo Mode). */
  onUploadAudio?: (file: File) => Promise<{ url: string; fileName: string } | null>;
  uploadingAudio?: boolean;
  inputClass: string;
}

function inferTabFromUrl(rawUrl: string | undefined): MusicTab {
  if (!rawUrl || !rawUrl.trim()) return "gallery";
  const trimmed = rawUrl.trim();
  const stripped = stripAudioRangeFragment(trimmed);
  const isGallery =
    GALLERY_MUSIC_TRACKS.some((t) => t.url === stripped) ||
    stripped.startsWith("/music/");
  if (isGallery) return "gallery";

  const yt = parseYouTubeAudioUrl(trimmed);
  if (yt) return "youtube";

  return "upload";
}

export default function MusicPicker({
  musicUrl,
  templateCategory,
  onChange,
  onUploadAudio,
  uploadingAudio = false,
  inputClass,
}: MusicPickerProps) {
  const [tabOverride, setTabOverride] = useState<MusicTab | null>(null);
  const activeTab = tabOverride ?? inferTabFromUrl(musicUrl);

  const [showAllGallery, setShowAllGallery] = useState(false);
  const [gallerySearch, setGallerySearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadedLabel, setUploadedLabel] = useState<string | null>(null);
  const [localBlobFallback, setLocalBlobFallback] = useState<string | null>(null);
  const [ytCategoryFilter, setYtCategoryFilter] = useState<TemplateCategory | "all">(
    templateCategory ?? "ungkapan-sayang"
  );

  // Active preview state (stops cleanly at endSeconds inside Builder)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const ytPreviewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [localPreview, setLocalPreview] = useState<{
    baseUrl: string;
    elapsed: number;
    startSeconds: number;
    endSeconds?: number;
  } | null>(null);
  const [ytPreview, setYtPreview] = useState<{
    videoId: string;
    startSeconds: number;
    endSeconds?: number;
    title: string;
    sessionId: number;
    ended?: boolean;
  } | null>(null);

  // Detected real duration for uploaded / custom MP3 URLs via HTMLAudioElement metadata
  const [detectedMp3, setDetectedMp3] = useState<{
    url: string;
    duration: number;
  } | null>(null);

  // Uncontrolled draft while typing in YouTube input & gentle clamp hint
  const [ytInputDraft, setYtInputDraft] = useState<string | null>(null);
  const [rangeHint, setRangeHint] = useState<string | null>(null);

  const trimmedMusicUrl = musicUrl?.trim() ?? "";
  const strippedBaseUrl = trimmedMusicUrl
    ? stripAudioRangeFragment(trimmedMusicUrl)
    : "";
  const parsedYt = parseYouTubeAudioUrl(trimmedMusicUrl);
  const activeRange = parseAudioRange(trimmedMusicUrl);
  const displayInfo = getMusicDisplayInfo(trimmedMusicUrl);

  // Revoke any standalone fallback blob URL on unmount
  useEffect(() => {
    return () => {
      if (localBlobFallback) URL.revokeObjectURL(localBlobFallback);
    };
  }, [localBlobFallback]);

  // Auto-detect duration for uploaded/custom MP3 URLs when not already in catalog
  useEffect(() => {
    if (!strippedBaseUrl || parsedYt || displayInfo?.durationSeconds) return;
    let cancelled = false;
    const probe = new Audio();
    probe.preload = "metadata";
    const onLoaded = () => {
      if (cancelled) return;
      if (Number.isFinite(probe.duration) && probe.duration > 5) {
        setDetectedMp3({
          url: strippedBaseUrl,
          duration: Math.floor(probe.duration),
        });
      }
    };
    probe.addEventListener("loadedmetadata", onLoaded);
    probe.src = strippedBaseUrl;
    return () => {
      cancelled = true;
      probe.removeEventListener("loadedmetadata", onLoaded);
      probe.removeAttribute("src");
      try {
        probe.load();
      } catch {
        // ignore
      }
    };
  }, [strippedBaseUrl, parsedYt, displayInfo?.durationSeconds]);

  const knownDuration =
    displayInfo?.durationSeconds ??
    (detectedMp3?.url === strippedBaseUrl ? detectedMp3.duration : undefined);

  const sliderMax = useMemo(() => {
    if (knownDuration && knownDuration >= MIN_CLIP_SECONDS + 5) {
      return knownDuration;
    }
    return Math.max(
      180,
      (activeRange.endSeconds ?? 0) + 30,
      activeRange.startSeconds + 60
    );
  }, [knownDuration, activeRange.startSeconds, activeRange.endSeconds]);

  const effectiveStart = Math.min(
    Math.max(0, activeRange.startSeconds),
    Math.max(0, sliderMax - MIN_CLIP_SECONDS)
  );
  const effectiveEnd =
    activeRange.endSeconds !== undefined
      ? Math.min(
          sliderMax,
          Math.max(effectiveStart + MIN_CLIP_SECONDS, activeRange.endSeconds)
        )
      : sliderMax;

  const isTrimmed =
    effectiveStart > 0 ||
    (activeRange.endSeconds !== undefined && effectiveEnd < sliderMax);
  const clipLengthSeconds = Math.max(1, effectiveEnd - effectiveStart);

  const stopLocalPreview = useCallback(() => {
    const el = previewAudioRef.current;
    previewAudioRef.current = null;
    if (el) releaseAudio(el);
    setLocalPreview(null);
  }, []);

  const stopAllPreviews = useCallback(() => {
    stopLocalPreview();
    setYtPreview(null);
  }, [stopLocalPreview]);

  useEffect(() => {
    return () => {
      const el = previewAudioRef.current;
      previewAudioRef.current = null;
      if (el) releaseAudio(el);
    };
  }, []);

  // Detect YouTube ENDED state in Builder preview so UI reflects stopping cleanly at endSeconds
  useEffect(() => {
    if (!ytPreview) return;
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.youtube-nocookie.com" &&
        event.origin !== "https://www.youtube.com"
      ) {
        return;
      }
      const win = ytPreviewIframeRef.current?.contentWindow;
      if (!win || event.source !== win) return;

      let payload: { event?: string; info?: unknown } | null = null;
      if (typeof event.data === "string") {
        try {
          payload = JSON.parse(event.data) as { event?: string; info?: unknown };
        } catch {
          return;
        }
      } else if (typeof event.data === "object" && event.data !== null) {
        payload = event.data as { event?: string; info?: unknown };
      }
      if (!payload) return;

      const infoObj =
        typeof payload.info === "object" && payload.info !== null
          ? (payload.info as { playerState?: number })
          : null;
      const ended =
        (payload.event === "onStateChange" && payload.info === 0) ||
        (payload.event === "infoDelivery" && infoObj?.playerState === 0);

      if (ended) {
        setYtPreview((curr) => (curr ? { ...curr, ended: true } : null));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [ytPreview]);

  const startLocalPreviewAt = useCallback(
    (rawUrl: string, startSec: number, endSec?: number) => {
      stopLocalPreview();
      setYtPreview(null);
      const base = stripAudioRangeFragment(rawUrl);
      const audio = new Audio(base);
      audio.volume = 0.65;

      const beginPlay = () => {
        if (previewAudioRef.current !== audio) return;
        if (startSec > 0) {
          try {
            audio.currentTime = startSec;
          } catch {
            // ignore seek error before ready
          }
        }
        setLocalPreview({
          baseUrl: base,
          elapsed: startSec,
          startSeconds: startSec,
          endSeconds: endSec,
        });
        void audio.play().catch((err: unknown) => {
          // Ignore intentional interruptions (switching track / stopping preview quickly)
          if (previewAudioRef.current !== audio) return;
          if ((err as DOMException | undefined)?.name === "AbortError") return;
          stopLocalPreview();
          toast.error("Gagal memutar pratinjau lagu.");
        });
      };

      audio.ontimeupdate = () => {
        if (endSec !== undefined && audio.currentTime >= endSec) {
          audio.pause();
          setLocalPreview(null);
          return;
        }
        setLocalPreview((curr) =>
          curr && curr.baseUrl === base
            ? { ...curr, elapsed: Math.floor(audio.currentTime) }
            : curr
        );
      };
      audio.onended = () => {
        if (previewAudioRef.current === audio) setLocalPreview(null);
      };
      audio.onerror = () => {
        // Only report errors from the audio that is still the active preview
        if (previewAudioRef.current !== audio) return;
        stopLocalPreview();
        toast.error("Gagal memutar pratinjau lagu.");
      };

      previewAudioRef.current = audio;
      if (startSec > 0 && audio.readyState < 1) {
        const onMeta = () => {
          audio.removeEventListener("loadedmetadata", onMeta);
          beginPlay();
        };
        audio.addEventListener("loadedmetadata", onMeta);
        audio.load();
      } else {
        beginPlay();
      }
    },
    [stopLocalPreview]
  );

  const startYouTubePreviewAt = useCallback(
    (videoId: string, title: string, startSec: number, endSec?: number) => {
      stopLocalPreview();
      setYtPreview((prev) => ({
        videoId,
        title,
        startSeconds: startSec,
        endSeconds: endSec,
        sessionId: (prev?.sessionId ?? 0) + 1,
        ended: false,
      }));
    },
    [stopLocalPreview]
  );

  const switchTab = (next: MusicTab) => {
    stopAllPreviews();
    setYtInputDraft(null);
    setRangeHint(null);
    setTabOverride(next);
  };

  // Selecting a gallery track plays it from 0:00 right away
  const handleSelectGalleryTrack = (track: GalleryMusicTrack) => {
    setRangeHint(null);
    setUploadedLabel(null);
    const isAlreadySelected = strippedBaseUrl === track.url;
    if (isAlreadySelected) {
      if (localPreview?.baseUrl === track.url) {
        stopLocalPreview();
      } else {
        startLocalPreviewAt(
          track.url,
          activeRange.startSeconds,
          activeRange.endSeconds
        );
      }
      return;
    }
    onChange(track.url); // starts at 0:00 by default
    startLocalPreviewAt(track.url, 0, undefined);
  };

  const handleToggleGalleryPlay = (track: GalleryMusicTrack) => {
    setRangeHint(null);
    const isPlayingThis = localPreview?.baseUrl === track.url;
    if (isPlayingThis) {
      stopLocalPreview();
      return;
    }
    const isSelected = strippedBaseUrl === track.url;
    if (isSelected) {
      startLocalPreviewAt(
        track.url,
        effectiveStart,
        activeRange.endSeconds !== undefined ? effectiveEnd : undefined
      );
      return;
    }
    // Pressing Play on another row also selects it & plays from 0:00
    setUploadedLabel(null);
    onChange(track.url);
    startLocalPreviewAt(track.url, 0, undefined);
  };

  const handleAudioFile = async (file: File | null | undefined) => {
    if (!file) return;
    const isAudioType =
      file.type.startsWith("audio/") || ALLOWED_AUDIO_EXTS.test(file.name);
    if (!isAudioType) {
      toast.error("Format audio tidak didukung. Gunakan MP3, M4A, WAV, atau OGG.");
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      toast.error("Ukuran file audio maksimal 15 MB.");
      return;
    }

    stopAllPreviews();
    setRangeHint(null);

    if (onUploadAudio) {
      const result = await onUploadAudio(file);
      if (!result) return;
      setUploadedLabel(result.fileName);
      onChange(result.url);
      startLocalPreviewAt(result.url, 0, undefined);
      return;
    }

    // Standalone fallback without Builder handler
    if (localBlobFallback) URL.revokeObjectURL(localBlobFallback);
    const nextBlob = URL.createObjectURL(file);
    setLocalBlobFallback(nextBlob);
    setUploadedLabel(file.name);
    onChange(nextBlob);
    startLocalPreviewAt(nextBlob, 0, undefined);
  };

  const handleSelectYouTubePreset = (preset: YouTubeMusicPreset) => {
    setYtInputDraft(null);
    setRangeHint(null);
    onChange(preset.url); // starts at 0:00 by default
    startYouTubePreviewAt(
      preset.videoId,
      `${preset.title} — ${preset.artist}`,
      0,
      undefined
    );
  };

  const updateRange = (nextStart: number, nextEnd?: number) => {
    if (!trimmedMusicUrl) return;
    const clampedStart = Math.max(0, Math.floor(nextStart));
    const clampedEnd =
      nextEnd !== undefined && nextEnd > clampedStart
        ? Math.floor(nextEnd)
        : undefined;
    const nextUrl = applyAudioRange(
      trimmedMusicUrl,
      { startSeconds: clampedStart, endSeconds: clampedEnd },
      knownDuration
    );
    onChange(nextUrl);
  };

  const activeTargetEnd =
    activeRange.endSeconds !== undefined ? effectiveEnd : undefined;

  const isPreviewingCurrent = parsedYt
    ? ytPreview?.videoId === parsedYt.videoId &&
      !ytPreview.ended &&
      ytPreview.startSeconds === effectiveStart &&
      ytPreview.endSeconds === activeTargetEnd
    : Boolean(
        strippedBaseUrl &&
          localPreview?.baseUrl === strippedBaseUrl &&
          localPreview.startSeconds === effectiveStart &&
          localPreview.endSeconds === activeTargetEnd
      );

  const previewCurrentClip = () => {
    if (!trimmedMusicUrl || !displayInfo) return;

    if (parsedYt) {
      if (isPreviewingCurrent) {
        setYtPreview(null);
        return;
      }
      startYouTubePreviewAt(
        parsedYt.videoId,
        displayInfo.artist
          ? `${displayInfo.title} — ${displayInfo.artist}`
          : displayInfo.title,
        effectiveStart,
        activeTargetEnd
      );
      return;
    }

    if (isPreviewingCurrent) {
      stopLocalPreview();
      return;
    }
    startLocalPreviewAt(trimmedMusicUrl, effectiveStart, activeTargetEnd);
  };

  const applyFullRange = () => {
    if (!trimmedMusicUrl) return;
    setRangeHint(null);
    const nextUrl = applyAudioRange(
      trimmedMusicUrl,
      { startSeconds: 0 },
      knownDuration
    );
    onChange(nextUrl);
  };

  const applyReffShortcut = () => {
    if (!trimmedMusicUrl || !displayInfo?.reffStartSeconds) return;
    setRangeHint(null);
    const reffStart = displayInfo.reffStartSeconds;
    const nextUrl = applyAudioRange(
      trimmedMusicUrl,
      { startSeconds: reffStart },
      knownDuration
    );
    onChange(nextUrl);
    if (parsedYt) {
      startYouTubePreviewAt(
        parsedYt.videoId,
        `${displayInfo.title} — ${displayInfo.artist}`,
        reffStart,
        undefined
      );
    }
  };

  const handleStartSegmentChange = (nextStart: number) => {
    const nextEnd =
      activeRange.endSeconds !== undefined ? effectiveEnd : undefined;
    updateRange(nextStart, nextEnd);
  };

  const handleEndSegmentChange = (nextEnd: number) => {
    if (knownDuration !== undefined && nextEnd >= knownDuration) {
      updateRange(effectiveStart, undefined);
      return;
    }
    updateRange(effectiveStart, nextEnd);
  };

  const handleCustomYouTubeInput = (raw: string) => {
    setYtInputDraft(raw);
    setRangeHint(null);
    const trimmed = raw.trim();
    if (!trimmed) {
      stopAllPreviews();
      onChange("");
      return;
    }
    const parsed = parseYouTubeAudioUrl(trimmed);
    if (!parsed) return;
    onChange(
      buildYouTubeAudioUrl(parsed.videoId, parsed.startSeconds, parsed.endSeconds)
    );
  };

  const clearMusic = () => {
    stopAllPreviews();
    setYtInputDraft(null);
    setRangeHint(null);
    setUploadedLabel(null);
    onChange("");
  };

  const categoryTracks = useMemo(
    () => getGalleryTracksForCategory(templateCategory),
    [templateCategory]
  );

  const baseGalleryTracks = showAllGallery ? GALLERY_MUSIC_TRACKS : categoryTracks;

  const normalizedGallerySearch = gallerySearch.trim().toLowerCase();
  const visibleGalleryTracks = useMemo(() => {
    if (!normalizedGallerySearch) return baseGalleryTracks;
    return baseGalleryTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(normalizedGallerySearch) ||
        t.artist.toLowerCase().includes(normalizedGallerySearch)
    );
  }, [baseGalleryTracks, normalizedGallerySearch]);

  const filteredYouTubePresets = useMemo(() => {
    if (ytCategoryFilter === "all") return YOUTUBE_MUSIC_LIBRARY;
    return YOUTUBE_MUSIC_LIBRARY.filter((t) => t.category === ytCategoryFilter);
  }, [ytCategoryFilter]);

  const hasOtherCategoryTracks =
    Boolean(templateCategory) &&
    GALLERY_MUSIC_TRACKS.length > categoryTracks.length;

  const startPct = (effectiveStart / sliderMax) * 100;
  const endPct = (effectiveEnd / sliderMax) * 100;
  const reffPct =
    displayInfo?.reffStartSeconds && displayInfo.reffStartSeconds < sliderMax
      ? (displayInfo.reffStartSeconds / sliderMax) * 100
      : null;

  const isUploadedOrCustom =
    Boolean(trimmedMusicUrl) &&
    !parsedYt &&
    !GALLERY_MUSIC_TRACKS.some((t) => t.url === strippedBaseUrl) &&
    !strippedBaseUrl.startsWith("/music/");

  const subscribeYtPreviewEvents = () => {
    const win = ytPreviewIframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      JSON.stringify({ event: "listening", id: 2, channel: "widget" }),
      "*"
    );
    win.postMessage(
      JSON.stringify({
        event: "command",
        func: "addEventListener",
        args: ["onStateChange"],
      }),
      "*"
    );
  };

  const occasionLabel = templateCategory
    ? CATEGORY_META[templateCategory]?.label
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-primary shrink-0" />
          <span className="text-label-lg font-semibold text-on-surface">
            Lagu Pengiring
          </span>
        </div>
        {trimmedMusicUrl && (
          <button
            type="button"
            onClick={clearMusic}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-md font-semibold text-on-surface-variant hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span>Tanpa Musik</span>
          </button>
        )}
      </div>

      {/* Catatan lembut saat belum memilih lagu (bergaya UcapanPacar) */}
      {!trimmedMusicUrl && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2.5 text-xs text-amber-950/90 dark:text-amber-200/90 leading-relaxed">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p>
            Pilih lagu dari <strong>Galeri</strong>, <strong>Upload File</strong>, atau{" "}
            <strong>YouTube</strong> supaya musik latar ikut berputar saat ucapan dibuka.
          </p>
        </div>
      )}

      {/* Switcher 3 Tab: Galeri (Default) | Upload File | YouTube */}
      <div
        role="tablist"
        aria-label="Sumber lagu pengiring"
        className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-surface-container-low border border-outline-variant/35 mb-3"
      >
        {(
          [
            { id: "gallery", label: "Galeri", Icon: Sparkles },
            { id: "upload", label: "Upload File", Icon: Upload },
            { id: "youtube", label: "YouTube", Icon: PlayCircle },
          ] as const
        ).map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchTab(id)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl py-2 px-1.5 sm:px-2 text-xs font-semibold transition-all cursor-pointer",
                active
                  ? "bg-surface text-primary shadow-xs border border-outline-variant/40"
                  : "text-on-surface-variant hover:text-on-surface border border-transparent"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Galeri Musik MP3 Auto-Discover (murni <audio>, tanpa instrumental & tanpa video) */}
      {activeTab === "gallery" && (
        <div>
          {GALLERY_MUSIC_TRACKS.length === 0 ? (
            /* Empty state bersih ketika belum ada file MP3 di raw-music/<kategori>/ */
            <div className="rounded-2xl border border-outline-variant/45 bg-surface px-4 py-6 text-center space-y-3">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Music className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-label-lg font-semibold text-on-surface">
                  Galeri lagu belum diisi
                </p>
                <p className="text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto">
                  Kamu bisa unggah file MP3 sendiri atau tempel link YouTube sambil galeri lagu kami dilengkapi.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => switchTab("upload")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload File Audio</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchTab("youtube")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container-low px-3.5 py-2 text-xs font-semibold text-on-surface hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  <span>Pakai Link YouTube</span>
                </button>
              </div>
              {process.env.NODE_ENV === "development" && (
                <p className="pt-1 text-[11px] text-on-surface-variant/80">
                  Dev: taruh file ke <code>raw-music/{templateCategory ?? "ungkapan-sayang"}/</code> lalu jalankan{" "}
                  <code>npm run music:build</code>.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-on-surface">
                  Pilih lagu dari galeri musik kami
                </p>
                {hasOtherCategoryTracks && (
                  <button
                    type="button"
                    onClick={() => {
                      setGallerySearch("");
                      setShowAllGallery((prev) => !prev);
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline underline-offset-2 shrink-0 cursor-pointer"
                  >
                    {showAllGallery
                      ? `Sesuai ${occasionLabel ?? "momen"} (${categoryTracks.length})`
                      : `Lihat semua (${GALLERY_MUSIC_TRACKS.length})`}
                  </button>
                )}
              </div>

              {/* Pencarian cepat hanya muncul bila daftar > 6 lagu agar tetap minimalis */}
              {baseGalleryTracks.length > 6 && (
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant" />
                  <input
                    type="search"
                    value={gallerySearch}
                    onChange={(e) => setGallerySearch(e.target.value)}
                    placeholder="Cari judul lagu atau artis…"
                    aria-label="Cari lagu di galeri"
                    className={`${inputClass} pl-8.5 py-1.5 text-xs`}
                  />
                </div>
              )}

              {baseGalleryTracks.length === 0 ? (
                <div className="rounded-2xl border border-outline-variant/45 bg-surface px-4 py-5 text-center space-y-2.5">
                  <p className="text-xs text-on-surface-variant">
                    Belum ada lagu khusus untuk kategori <strong>{occasionLabel ?? "ini"}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAllGallery(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    <span>Lihat semua lagu di galeri ({GALLERY_MUSIC_TRACKS.length})</span>
                  </button>
                </div>
              ) : (
                <div
                  data-scroll-chain
                  className="rounded-2xl border border-outline-variant/45 bg-surface p-2 max-h-[280px] overflow-y-auto overscroll-y-auto space-y-1.5"
                >
                  {visibleGalleryTracks.map((t) => {
                    const selected = strippedBaseUrl === t.url;
                    const isPlaying = localPreview?.baseUrl === t.url;
                    const displayLabel = t.artist ? `${t.artist} - ${t.title}` : t.title;
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all",
                          selected
                            ? "border-primary bg-primary-fixed/15 dark:bg-primary/10 ring-1 ring-primary/35 shadow-2xs"
                            : "border-transparent hover:border-outline-variant/50 hover:bg-surface-container-low/60"
                        )}
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => handleSelectGalleryTrack(t)}
                          className="flex flex-1 min-w-0 items-center gap-2.5 text-left cursor-pointer"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                              selected
                                ? "border-primary"
                                : "border-outline-variant/80"
                            )}
                          >
                            {selected && (
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-label-lg font-semibold text-on-surface truncate leading-tight">
                              {displayLabel}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-on-surface-variant font-mono tabular-nums">
                              {isPlaying && localPreview
                                ? `${formatSeconds(localPreview.elapsed)} / ${t.durationLabel}`
                                : t.durationLabel}
                            </span>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleGalleryPlay(t)}
                          aria-label={isPlaying ? `Jeda ${displayLabel}` : `Putar ${displayLabel}`}
                          title={isPlaying ? `Jeda ${displayLabel}` : `Putar ${displayLabel}`}
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 cursor-pointer",
                            isPlaying
                              ? "bg-primary text-white shadow-xs"
                              : "bg-primary/12 text-primary hover:bg-primary/20"
                          )}
                        >
                          {isPlaying ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5 ml-0.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}

                  {visibleGalleryTracks.length === 0 && (
                    <p className="py-5 text-center text-xs text-on-surface-variant">
                      Tidak ada lagu yang cocok dengan &ldquo;{gallerySearch}&rdquo;.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: Upload File Audio Langsung (MP3, M4A, WAV, OGG · Maks. 15 MB) */}
      {activeTab === "upload" && (
        <div className="space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              void handleAudioFile(file);
            }}
            className={cn(
              "rounded-2xl border-2 border-dashed p-5 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary-fixed/20"
                : "border-outline-variant/60 bg-surface hover:border-primary/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/webm,.mp3,.m4a,.wav,.ogg"
              disabled={uploadingAudio}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void handleAudioFile(file);
              }}
            />
            <button
              type="button"
              disabled={uploadingAudio}
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-primary mb-0.5">
                {uploadingAudio ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
              </span>
              <span className="text-label-lg font-semibold text-on-surface">
                {uploadingAudio
                  ? "Mengunggah file audio…"
                  : "Pilih file audio atau tarik ke sini"}
              </span>
              <span className="text-xs text-on-surface-variant">
                MP3, M4A, WAV, OGG · Maks. 15 MB
              </span>
            </button>
          </div>

          {isUploadedOrCustom && displayInfo && (
            <div className="flex items-center justify-between gap-2.5 rounded-xl border border-primary/40 bg-primary-fixed/15 dark:bg-primary/10 px-3 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <FileAudio className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-label-lg font-semibold text-on-surface truncate">
                    {uploadedLabel ?? displayInfo.title}
                  </p>
                  <p className="text-[11px] text-on-surface-variant font-mono tabular-nums">
                    {knownDuration ? formatSeconds(knownDuration) : "Memuat durasi…"} ·{" "}
                    {displayInfo.source === "upload" ? "Audio Unggahan" : "URL MP3"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={previewCurrentClip}
                aria-label={isPreviewingCurrent ? "Jeda audio" : "Putar audio"}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer",
                  isPreviewingCurrent
                    ? "bg-primary text-white"
                    : "bg-primary/12 text-primary hover:bg-primary/20"
                )}
              >
                {isPreviewingCurrent ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 ml-0.5" />
                )}
              </button>
            </div>
          )}

          {/* Opsi lanjutan: tempel URL MP3 publik langsung */}
          <details className="rounded-xl border border-outline-variant/35 bg-surface px-3 py-2 text-xs">
            <summary className="flex items-center justify-between cursor-pointer font-semibold text-on-surface-variant hover:text-primary select-none list-none">
              <span className="inline-flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                <span>Atau tempel URL file MP3 langsung (HTTPS)</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <div className="pt-2.5">
              <input
                type="url"
                aria-label="URL file audio MP3 kustom"
                className={`${inputClass} text-xs py-2`}
                placeholder="https://…/lagu.mp3"
                maxLength={500}
                value={
                  isUploadedOrCustom && !strippedBaseUrl.startsWith("blob:")
                    ? strippedBaseUrl
                    : ""
                }
                onChange={(e) => {
                  stopAllPreviews();
                  setUploadedLabel(null);
                  onChange(e.target.value);
                }}
              />
            </div>
          </details>
        </div>
      )}

      {/* TAB 3: YouTube */}
      {activeTab === "youtube" && (
        <div className="space-y-2.5">
          <div className="relative">
            <PlayCircle className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              type="url"
              aria-label="Tautan YouTube lagu pengiring"
              className={`${inputClass} pl-10 text-xs`}
              placeholder="Paste link YouTube di sini…"
              maxLength={500}
              value={ytInputDraft ?? (parsedYt ? trimmedMusicUrl : "")}
              onChange={(e) => handleCustomYouTubeInput(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Contoh: <code>https://youtube.com/watch?v=...</code> — diputar resmi lewat embed YouTube.
          </p>

          {/* Pratinjau mini embed YouTube resmi (muncul saat menekan Preview) */}
          {ytPreview && (
            <div className="rounded-2xl overflow-hidden border border-outline-variant/40 bg-[#191210] shadow-md">
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#241914] text-[#FFF9F5]">
                <span className="text-xs font-semibold truncate">
                  {ytPreview.ended
                    ? `Selesai (${formatSeconds(ytPreview.endSeconds ?? sliderMax)}) · ${ytPreview.title}`
                    : `Pratinjau: ${ytPreview.title}`}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={buildYouTubeAudioUrl(
                      ytPreview.videoId,
                      ytPreview.startSeconds,
                      ytPreview.endSeconds
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#D9C3B5] hover:text-white transition-colors"
                    aria-label="Buka di YouTube"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setYtPreview(null)}
                    aria-label="Tutup pratinjau YouTube"
                    className="text-[#D9C3B5] hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="relative w-full aspect-video max-h-[180px] bg-black">
                <iframe
                  key={`${ytPreview.videoId}-${ytPreview.sessionId}`}
                  ref={ytPreviewIframeRef}
                  onLoad={subscribeYtPreviewEvents}
                  src={buildYouTubeEmbedUrl(ytPreview.videoId, {
                    startSeconds: ytPreview.startSeconds,
                    endSeconds: ytPreview.endSeconds,
                    autoplay: true,
                    enableJsApi: true,
                  })}
                  title={`Pratinjau ${ytPreview.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                />
              </div>
            </div>
          )}

          {/* Rekomendasi lagu pop YouTube opsional (tersusun rapi agar tab tetap bersih) */}
          <details className="rounded-xl border border-outline-variant/35 bg-surface px-3 py-2 text-xs">
            <summary className="flex items-center justify-between cursor-pointer font-semibold text-on-surface-variant hover:text-primary select-none list-none">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Rekomendasi lagu pop YouTube ({YOUTUBE_MUSIC_LIBRARY.length})</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <div className="pt-2.5 space-y-2">
              <div className="flex flex-wrap gap-1">
                {(
                  Object.entries(CATEGORY_META) as [
                    TemplateCategory,
                    (typeof CATEGORY_META)[TemplateCategory],
                  ][]
                )
                  .filter(([, meta]) => meta.active)
                  .map(([catKey, meta]) => (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setYtCategoryFilter(catKey)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer",
                        ytCategoryFilter === catKey
                          ? "bg-primary text-white border-primary"
                          : "bg-surface text-on-surface-variant border-outline-variant/50 hover:border-primary/50"
                      )}
                    >
                      {meta.label}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setYtCategoryFilter("all")}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer",
                    ytCategoryFilter === "all"
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-on-surface-variant border-outline-variant/50 hover:border-primary/50"
                  )}
                >
                  Semua
                </button>
              </div>
              <div
                data-scroll-chain
                className="max-h-[196px] overflow-y-auto overscroll-y-auto space-y-1 pr-0.5"
              >
                {filteredYouTubePresets.map((preset) => {
                  const selected = parsedYt?.videoId === preset.videoId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectYouTubePreset(preset)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer",
                        selected
                          ? "border-primary bg-primary-fixed/15 dark:bg-primary/10"
                          : "border-transparent hover:bg-surface-container-low/70"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-on-surface truncate">
                          {preset.title}
                        </span>
                        <span className="block text-[11px] text-on-surface-variant truncate">
                          {preset.artist}
                        </span>
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-on-surface-variant shrink-0">
                        {preset.durationLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </details>
        </div>
      )}

      {/* KARTU TRIMMER DI BAWAH DAFTAR LAGU (bergaya UcapanPacar + input angka MM : SS) */}
      {displayInfo && trimmedMusicUrl && (
        <div className="mt-3 rounded-2xl bg-surface border border-outline-variant/45 p-3.5 shadow-2xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-xs font-bold text-on-surface">
              Pilih bagian lagu yang mau diputar
            </span>
            <div className="flex items-center gap-1">
              {isTrimmed && (
                <button
                  type="button"
                  onClick={applyFullRange}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-surface-container-low text-on-surface-variant border border-outline-variant/60 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Penuh</span>
                </button>
              )}
              {displayInfo.reffStartSeconds !== undefined && (
                <button
                  type="button"
                  onClick={applyReffShortcut}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-colors cursor-pointer",
                    effectiveStart === displayInfo.reffStartSeconds &&
                      activeRange.endSeconds === undefined
                      ? "bg-primary text-white border-primary"
                      : "bg-surface-container-low text-on-surface-variant border-outline-variant/60 hover:border-primary/50 hover:text-primary"
                  )}
                  title={`Lompat langsung ke bagian reff (${formatSeconds(displayInfo.reffStartSeconds)})`}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Mulai Reff</span>
                </button>
              )}
            </div>
          </div>

          {/* Badge Mulai & Selesai sejajar di atas slider */}
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-on-surface-variant">
            <span className="rounded-lg bg-surface-container-low px-2 py-0.5 font-mono tabular-nums">
              Mulai: {formatSeconds(effectiveStart)}
            </span>
            <span className="rounded-lg bg-surface-container-low px-2 py-0.5 font-mono tabular-nums">
              Selesai:{" "}
              {activeRange.endSeconds !== undefined || knownDuration
                ? formatSeconds(effectiveEnd)
                : "Akhir"}
            </span>
          </div>

          {/* Dual-thumb range slider */}
          <div className="py-0.5">
            <div className="relative h-7 flex items-center select-none">
              <div className="h-1.5 w-full rounded-full bg-outline-variant/45" />
              <div
                className="absolute h-1.5 rounded-full bg-primary pointer-events-none"
                style={{
                  left: `${startPct}%`,
                  width: `${Math.max(0, endPct - startPct)}%`,
                }}
              />
              {reffPct !== null && (
                <span
                  aria-hidden
                  title={`Bagian reff (~${formatSeconds(displayInfo.reffStartSeconds ?? 0)})`}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2.5 w-1 rounded-full bg-primary/55 pointer-events-none"
                  style={{ left: `${reffPct}%` }}
                />
              )}
              <input
                type="range"
                min={0}
                max={sliderMax}
                step={1}
                value={effectiveStart}
                aria-label="Titik awal lagu"
                onChange={(e) => {
                  const nextStart = Math.min(
                    Number(e.target.value),
                    effectiveEnd - MIN_CLIP_SECONDS
                  );
                  updateRange(
                    nextStart,
                    activeRange.endSeconds !== undefined ? effectiveEnd : undefined
                  );
                }}
                className={cn(
                  "pm-range-input absolute inset-0 w-full m-0",
                  effectiveStart >= sliderMax - 20 ? "z-20" : "z-10"
                )}
              />
              <input
                type="range"
                min={0}
                max={sliderMax}
                step={1}
                value={effectiveEnd}
                aria-label="Titik akhir lagu"
                onChange={(e) => {
                  const nextEnd = Math.max(
                    Number(e.target.value),
                    effectiveStart + MIN_CLIP_SECONDS
                  );
                  updateRange(
                    effectiveStart,
                    nextEnd >= sliderMax ? undefined : nextEnd
                  );
                }}
                className="pm-range-input absolute inset-0 w-full m-0 z-[15]"
              />
            </div>
          </div>

          {/* Input angka terpisah MM : SS (presisi mengetik menit lalu detik) */}
          <div className="grid grid-cols-2 gap-2.5">
            <TimeSegmentInput
              idPrefix="music-range-start"
              label="Mulai"
              valueSeconds={effectiveStart}
              minSeconds={0}
              maxSeconds={Math.max(0, effectiveEnd - MIN_CLIP_SECONDS)}
              onChangeSeconds={handleStartSegmentChange}
              onHint={setRangeHint}
            />
            <TimeSegmentInput
              idPrefix="music-range-end"
              label="Berakhir"
              valueSeconds={effectiveEnd}
              minSeconds={effectiveStart + MIN_CLIP_SECONDS}
              maxSeconds={knownDuration ?? sliderMax}
              allowExpandMax={knownDuration === undefined}
              onChangeSeconds={handleEndSegmentChange}
              onHint={setRangeHint}
            />
          </div>

          {rangeHint && (
            <p
              role="status"
              aria-live="polite"
              className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1"
            >
              {rangeHint}
            </p>
          )}

          {/* Info durasi + tombol penuh Preview N detik */}
          <div className="space-y-2 pt-0.5">
            <p className="text-xs font-medium text-on-surface-variant">
              Durasi:{" "}
              <span className="font-mono tabular-nums font-semibold text-on-surface">
                {clipLengthSeconds} detik
              </span>
            </p>
            <button
              type="button"
              onClick={previewCurrentClip}
              className={cn(
                "w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer",
                isPreviewingCurrent
                  ? "bg-primary/10 text-primary border border-primary/45 hover:bg-primary/15"
                  : "bg-primary text-white shadow-xs hover:opacity-95"
              )}
            >
              {isPreviewingCurrent ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Berhenti Preview</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Preview {clipLengthSeconds} detik</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
