"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Pause, X, ExternalLink } from "lucide-react";
import type { UcapanContent } from "@/lib/types";
import { playSfx } from "@/lib/sfx";
import { isAnyVideoPlaying, subscribeMediaSync } from "@/lib/media-sync";
import {
  buildYouTubeEmbedUrl,
  getMusicDisplayInfo,
  parseAudioRange,
  parseYouTubeAudioUrl,
  stripAudioRangeFragment,
} from "@/lib/music-library";

const TARGET_VOLUME = 0.6;
const FADE_OUT_MS = 180;
const FADE_IN_MS = 260;
const FADE_STEP_MS = 30;

export default function CassettePlayer({
  content,
  autoPlay = false,
}: {
  content: UcapanContent;
  /** Auto-start direct audio (Galeri / Upload / MP3) on public & preview views once user gesture permits. */
  autoPlay?: boolean;
}) {
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [pausedByVideoUrl, setPausedByVideoUrl] = useState<string | null>(null);
  const [ytUserPausedUrl, setYtUserPausedUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const userPausedRef = useRef(false);
  const pausedByVideoRef = useRef(false);
  const playingUrlRef = useRef<string | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const suppressYtPauseUntilRef = useRef(0);
  const playTokenRef = useRef(0);

  const musicUrl = content.musicUrl?.trim() || undefined;
  const ytAudio = parseYouTubeAudioUrl(musicUrl);
  const isYouTubeMusic = Boolean(ytAudio);
  const audioRange = parseAudioRange(musicUrl);
  const displayInfo = getMusicDisplayInfo(musicUrl);

  const miniPlayerOpen = Boolean(musicUrl) && playingUrl === musicUrl;
  const pausedByVideo = Boolean(musicUrl) && pausedByVideoUrl === musicUrl;
  const ytUserPaused = Boolean(musicUrl) && ytUserPausedUrl === musicUrl;
  const playing = miniPlayerOpen && !pausedByVideo && !ytUserPaused;

  const hasCustomRange =
    audioRange.startSeconds > 0 || audioRange.endSeconds !== undefined;

  const rangeRef = useRef(audioRange);
  useEffect(() => {
    rangeRef.current = audioRange;
  }, [audioRange]);

  useEffect(() => {
    playingUrlRef.current = playingUrl;
  }, [playingUrl]);

  const cancelAudioFade = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      window.clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const fadeAudioTo = useCallback(
    (
      el: HTMLAudioElement,
      targetVolume: number,
      durationMs: number,
      onDone?: () => void
    ) => {
      cancelAudioFade();
      const clampedTarget = Math.max(0, Math.min(1, targetVolume));
      let startVolume = TARGET_VOLUME;
      try {
        startVolume = Number.isFinite(el.volume) ? el.volume : TARGET_VOLUME;
      } catch {
        startVolume = TARGET_VOLUME;
      }
      const steps = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
      let step = 0;

      fadeTimerRef.current = window.setInterval(() => {
        step += 1;
        const progress = Math.min(1, step / steps);
        const nextVol = startVolume + (clampedTarget - startVolume) * progress;
        try {
          el.volume = Math.max(0, Math.min(1, nextVol));
        } catch {
          // Ignore on browsers where HTMLAudioElement.volume is read-only (e.g. iOS Safari)
        }
        if (progress >= 1) {
          cancelAudioFade();
          onDone?.();
        }
      }, FADE_STEP_MS);
    },
    [cancelAudioFade]
  );

  const startDirectAudio = useCallback(
    (withSfx: boolean): Promise<boolean> => {
      if (!musicUrl || isYouTubeMusic) return Promise.resolve(false);
      if (!withSfx && isAnyVideoPlaying()) return Promise.resolve(false);

      const token = ++playTokenRef.current;
      const cleanSrc = stripAudioRangeFragment(musicUrl);
      let el = audioRef.current;

      if (!el || el.dataset.srcUrl !== musicUrl) {
        if (el) {
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
        el = new Audio(cleanSrc);
        el.dataset.srcUrl = musicUrl;
        el.loop = !hasCustomRange;
        el.volume = TARGET_VOLUME;
        el.ontimeupdate = () => {
          const { startSeconds, endSeconds } = rangeRef.current;
          if (endSeconds !== undefined && el && el.currentTime >= endSeconds) {
            el.currentTime = startSeconds;
            if (el.paused) {
              void el.play().catch(() => {});
            }
          }
        };
        el.onended = () => {
          const { startSeconds, endSeconds } = rangeRef.current;
          if (el && (startSeconds > 0 || endSeconds !== undefined)) {
            el.currentTime = startSeconds;
            void el.play().catch(() => {});
          }
        };
        audioRef.current = el;
      }

      return new Promise<boolean>((resolve) => {
        const begin = () => {
          if (playTokenRef.current !== token || !el) {
            resolve(false);
            return;
          }
          if (!withSfx && isAnyVideoPlaying()) {
            resolve(false);
            return;
          }
          cancelAudioFade();
          try {
            el.volume = TARGET_VOLUME;
          } catch {
            // ignore
          }
          const targetStart = rangeRef.current.startSeconds;
          if (targetStart > 0 && el.currentTime < targetStart) {
            try {
              el.currentTime = targetStart;
            } catch {
              // ignore if seekable range not ready yet
            }
          }
          el.play()
            .then(() => {
              if (playTokenRef.current !== token || (!withSfx && isAnyVideoPlaying())) {
                el?.pause();
                resolve(false);
                return;
              }
              playingUrlRef.current = musicUrl;
              setPlayingUrl(musicUrl);
              if (withSfx) playSfx("pop");
              resolve(true);
            })
            .catch(() => {
              if (playTokenRef.current === token) {
                playingUrlRef.current = null;
                setPlayingUrl(null);
              }
              resolve(false);
            });
        };

        if (audioRange.startSeconds > 0 && el.readyState < 1) {
          const onLoaded = () => {
            el?.removeEventListener("loadedmetadata", onLoaded);
            begin();
          };
          el.addEventListener("loadedmetadata", onLoaded);
          el.load();
        } else {
          begin();
        }
      });
    },
    [audioRange.startSeconds, cancelAudioFade, hasCustomRange, isYouTubeMusic, musicUrl]
  );

  // Clean up HTMLAudioElement whenever musicUrl changes or switches to YouTube/empty.
  useEffect(() => {
    userPausedRef.current = false;
    pausedByVideoRef.current = false;
    cancelAudioFade();
    const existing = audioRef.current;
    if (!existing) return;
    if (!musicUrl || isYouTubeMusic || existing.dataset.srcUrl !== musicUrl) {
      playTokenRef.current += 1;
      existing.ontimeupdate = null;
      existing.onended = null;
      existing.pause();
      existing.removeAttribute("src");
      try {
        existing.load();
      } catch {
        // ignore
      }
      audioRef.current = null;
    }
  }, [musicUrl, isYouTubeMusic, cancelAudioFade]);

  // Auto-play direct audio (Galeri / Upload / MP3) on receiver & preview pages.
  // If browser autoplay policy blocks initial playback, gracefully unlock on the first tap/keypress anywhere.
  useEffect(() => {
    if (!autoPlay || !musicUrl || isYouTubeMusic || userPausedRef.current) return;

    let cancelled = false;
    let gestureAttached = false;

    const detachGesture = () => {
      if (!gestureAttached) return;
      gestureAttached = false;
      window.removeEventListener("pointerdown", onFirstGesture, true);
      window.removeEventListener("keydown", onFirstGesture, true);
    };

    const onFirstGesture = (e: Event) => {
      if (e.target instanceof Element && e.target.closest("[data-video-block]")) {
        return;
      }
      if (isAnyVideoPlaying()) {
        return;
      }
      detachGesture();
      if (cancelled || userPausedRef.current) return;
      // If user clicked the music toggle itself, let its own onClick handle toggling.
      if (toggleBtnRef.current && e.target instanceof Node && toggleBtnRef.current.contains(e.target)) {
        return;
      }
      void startDirectAudio(false);
    };

    void startDirectAudio(false).then((started) => {
      if (cancelled || started || userPausedRef.current) return;
      gestureAttached = true;
      window.addEventListener("pointerdown", onFirstGesture, true);
      window.addEventListener("keydown", onFirstGesture, true);
    });

    return () => {
      cancelled = true;
      detachGesture();
    };
  }, [autoPlay, musicUrl, isYouTubeMusic, startDirectAudio]);

  // Synchronize background music with VideoBlock playback events.
  useEffect(() => {
    if (!musicUrl) return;

    return subscribeMediaSync({
      onVideoPlay: () => {
        if (userPausedRef.current) return;

        if (isYouTubeMusic) {
          if (playingUrlRef.current !== musicUrl || pausedByVideoRef.current) return;
          pausedByVideoRef.current = true;
          setPausedByVideoUrl(musicUrl);
          suppressYtPauseUntilRef.current = Date.now() + 800;
          ytIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
            "*"
          );
          return;
        }

        const el = audioRef.current;
        const isAudioActive = Boolean(
          el && (!el.paused || playingUrlRef.current === musicUrl)
        );
        if (!isAudioActive || pausedByVideoRef.current) {
          // Cancel any in-flight autoplay promise that has not started playing yet.
          playTokenRef.current += 1;
          return;
        }

        playTokenRef.current += 1;
        pausedByVideoRef.current = true;
        setPausedByVideoUrl(musicUrl);

        if (el && !el.paused) {
          fadeAudioTo(el, 0, FADE_OUT_MS, () => {
            if (pausedByVideoRef.current) {
              el.pause();
            }
          });
        }
      },

      onVideoStop: () => {
        if (userPausedRef.current || !pausedByVideoRef.current) return;

        pausedByVideoRef.current = false;
        setPausedByVideoUrl(null);

        if (isYouTubeMusic) {
          if (playingUrlRef.current !== musicUrl) return;
          suppressYtPauseUntilRef.current = Date.now() + 800;
          ytIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "playVideo", args: [] }),
            "*"
          );
          return;
        }

        const el = audioRef.current;
        if (!el) return;

        const token = ++playTokenRef.current;
        cancelAudioFade();

        if (!el.paused) {
          playingUrlRef.current = musicUrl;
          setPlayingUrl(musicUrl);
          fadeAudioTo(el, TARGET_VOLUME, FADE_IN_MS);
          return;
        }

        try {
          el.volume = 0;
        } catch {
          // ignore on iOS Safari
        }

        el.play()
          .then(() => {
            if (playTokenRef.current !== token) {
              el.pause();
              return;
            }
            playingUrlRef.current = musicUrl;
            setPlayingUrl(musicUrl);
            fadeAudioTo(el, TARGET_VOLUME, FADE_IN_MS);
          })
          .catch(() => {
            if (playTokenRef.current === token) {
              playingUrlRef.current = null;
              setPlayingUrl(null);
            }
          });
      },
    });
  }, [musicUrl, isYouTubeMusic, cancelAudioFade, fadeAudioTo]);

  // Pause audio cleanly if the user switches tabs/apps.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && audioRef.current && !audioRef.current.paused) {
        cancelAudioFade();
        playTokenRef.current += 1;
        pausedByVideoRef.current = false;
        setPausedByVideoUrl(null);
        audioRef.current.pause();
        playingUrlRef.current = null;
        setPlayingUrl(null);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [cancelAudioFade]);

  useEffect(() => {
    return () => {
      cancelAudioFade();
      playTokenRef.current += 1;
      if (audioRef.current) {
        audioRef.current.ontimeupdate = null;
        audioRef.current.onended = null;
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        try {
          audioRef.current.load();
        } catch {
          // ignore
        }
        audioRef.current = null;
      }
    };
  }, [cancelAudioFade]);

  // Segment looping & playback state tracking for official YouTube embed.
  useEffect(() => {
    if (!isYouTubeMusic || !miniPlayerOpen || !musicUrl) return;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.youtube-nocookie.com" &&
        event.origin !== "https://www.youtube.com"
      ) {
        return;
      }
      const win = ytIframeRef.current?.contentWindow;
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

      if (ended && hasCustomRange) {
        const start = rangeRef.current.startSeconds;
        win.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [start, true] }),
          "*"
        );
        win.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*"
        );
        return;
      }

      if (payload.event === "onStateChange" && typeof payload.info === "number") {
        if (payload.info === 2) {
          if (pausedByVideoRef.current || Date.now() < suppressYtPauseUntilRef.current) {
            return;
          }
          userPausedRef.current = true;
          setYtUserPausedUrl(musicUrl);
        } else if (payload.info === 1) {
          userPausedRef.current = false;
          setYtUserPausedUrl(null);
          if (pausedByVideoRef.current) {
            pausedByVideoRef.current = false;
            setPausedByVideoUrl(null);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isYouTubeMusic, miniPlayerOpen, musicUrl, hasCustomRange]);

  if (!musicUrl) return null;

  const stopAll = () => {
    cancelAudioFade();
    userPausedRef.current = true;
    pausedByVideoRef.current = false;
    setPausedByVideoUrl(null);
    setYtUserPausedUrl(null);
    playTokenRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    playingUrlRef.current = null;
    setPlayingUrl(null);
  };

  const toggle = () => {
    if (playing) {
      stopAll();
      return;
    }

    userPausedRef.current = false;
    pausedByVideoRef.current = false;
    setPausedByVideoUrl(null);
    setYtUserPausedUrl(null);

    if (ytAudio) {
      if (miniPlayerOpen) {
        suppressYtPauseUntilRef.current = Date.now() + 800;
        ytIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: [] }),
          "*"
        );
        playSfx("pop");
        return;
      }
      playingUrlRef.current = musicUrl;
      setPlayingUrl(musicUrl);
      playSfx("pop");
      return;
    }

    void startDirectAudio(true);
  };

  const trackLabel = displayInfo?.title ?? "Musik Latar";

  const subscribeYouTubeEvents = () => {
    const win = ytIframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
      "*"
    );
    win.postMessage(
      JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
      "*"
    );
    if (pausedByVideoRef.current) {
      suppressYtPauseUntilRef.current = Date.now() + 800;
      win.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
        "*"
      );
    }
  };

  return (
    <div className="relative">
      {/* Visible official YouTube mini-player (YouTube API ToS compliant — never hidden 0x0) */}
      <AnimatePresence>
        {ytAudio && miniPlayerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-full left-0 mb-2.5 w-[224px] sm:w-[244px] rounded-2xl overflow-hidden isolate [clip-path:inset(0_round_1rem)] bg-[#191210] border border-outline-variant/40 shadow-2xl z-40"
          >
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#241914] text-[#FFF9F5]">
              <span className="text-[11px] font-semibold truncate">
                {trackLabel}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={musicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Buka lagu di YouTube"
                  title="Buka di YouTube"
                  className="p-1 text-[#D9C3B5] hover:text-white transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={stopAll}
                  aria-label="Tutup pemutar YouTube"
                  className="p-1 text-[#D9C3B5] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="w-full h-[126px] sm:h-[137px] bg-black overflow-hidden">
              <iframe
                key={musicUrl}
                ref={ytIframeRef}
                onLoad={subscribeYouTubeEvents}
                src={buildYouTubeEmbedUrl(ytAudio.videoId, {
                  startSeconds: ytAudio.startSeconds,
                  endSeconds: ytAudio.endSeconds,
                  autoplay: true,
                  loop: !hasCustomRange,
                  enableJsApi: true,
                })}
                title={`Pemutar musik ${trackLabel}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="block w-full h-full border-0"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tombol bulat ringkas ala pemutar ucapan modern dengan cincin denyut halus saat aktif */}
      <button
        ref={toggleBtnRef}
        type="button"
        onClick={toggle}
        aria-label={playing ? `Jeda musik ${trackLabel}` : `Putar musik ${trackLabel}`}
        title={playing ? `Jeda · ${trackLabel}` : `Putar · ${trackLabel}`}
        className={`relative flex items-center justify-center rounded-full w-11 h-11 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer border ${
          playing
            ? "bg-primary text-white border-primary/30 ring-4 ring-primary/25"
            : "bg-white/90 backdrop-blur-md text-primary border-outline-variant/40"
        }`}
      >
        {playing && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary/50 animate-ping motion-reduce:hidden"
          />
        )}
        {playing ? (
          <Pause className="relative z-10 h-4.5 w-4.5" />
        ) : (
          <Play className="relative z-10 h-4.5 w-4.5 ml-0.5" />
        )}
      </button>
    </div>
  );
}
