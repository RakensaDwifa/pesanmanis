"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MousePointerClick, Pause, Play, RotateCcw } from "lucide-react";
import TemplateRenderer from "@/components/templates/registry";
import type { UcapanContent } from "@/lib/types";
import { getMusicDisplayInfo, stripAudioRangeFragment } from "@/lib/music-library";
import { EASE_WARM, MotionFloat, SPRING_TACTILE } from "./MotionPrimitives";

const HERO_AUDIO_VOLUME = 0.55;
const FADE_OUT_MS = 380;

/**
 * Checks whether the browser allows programmatic volume control on HTMLAudioElement.
 * On iOS Safari, `volume` is read-only (always 1.0); detecting this avoids a dead delay
 * before pausing while preserving smooth fade-out on desktop and Android.
 */
function supportsElementVolume(el: HTMLAudioElement): boolean {
  const prev = el.volume;
  const probe = prev > 0.5 ? prev - 0.05 : prev + 0.05;
  el.volume = probe;
  const writable = Math.abs(el.volume - probe) < 0.01;
  el.volume = prev;
  return writable;
}

export default function HeroPreviewMockup({
  content,
}: {
  content: UcapanContent;
}) {
  const [opened, setOpened] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pillBtnRef = useRef<HTMLButtonElement | null>(null);
  const playTokenRef = useRef(0);
  const fadeRafRef = useRef(0);
  const openedRef = useRef(false);
  const isPlayingRef = useRef(false);
  const leftViewportRef = useRef(false);
  const detachRetryRef = useRef<(() => void) | null>(null);

  const musicUrl = content.musicUrl?.trim() || undefined;
  const cleanSrc = musicUrl ? stripAudioRangeFragment(musicUrl) : undefined;
  const trackInfo = getMusicDisplayInfo(musicUrl);
  const trackTitle = trackInfo?.title ?? "Musik Latar";

  const cancelFade = useCallback(() => {
    if (fadeRafRef.current) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = 0;
    }
  }, []);

  const detachRetryUnlock = useCallback(() => {
    detachRetryRef.current?.();
    detachRetryRef.current = null;
  }, []);

  const stopAudio = useCallback(
    (resetTime = true, instant = false) => {
      const token = ++playTokenRef.current;
      detachRetryUnlock();
      cancelFade();

      isPlayingRef.current = false;
      setIsPlaying(false);

      const el = audioRef.current;
      if (!el) return;

      const finalizePause = () => {
        el.pause();
        el.volume = HERO_AUDIO_VOLUME;
        if (resetTime && el.readyState > 0 && el.currentTime > 0) {
          try {
            el.currentTime = 0;
          } catch {
            // ignore if seekable range is unavailable
          }
        }
      };

      if (instant || el.paused || !supportsElementVolume(el)) {
        finalizePause();
        return;
      }

      const startVol = el.volume;
      const startedAt = performance.now();

      const stepFade = (now: number) => {
        if (playTokenRef.current !== token) {
          fadeRafRef.current = 0;
          return;
        }
        const progress = Math.min(1, (now - startedAt) / FADE_OUT_MS);
        const eased = (1 - progress) * (1 - progress);
        el.volume = Math.max(0, startVol * eased);

        if (progress < 1) {
          fadeRafRef.current = requestAnimationFrame(stepFade);
        } else {
          fadeRafRef.current = 0;
          finalizePause();
        }
      };

      fadeRafRef.current = requestAnimationFrame(stepFade);
    },
    [cancelFade, detachRetryUnlock]
  );

  const startAudio = useCallback(
    (fromStart = false) => {
      if (!cleanSrc) return;
      const el = audioRef.current;
      if (!el) return;

      detachRetryUnlock();
      cancelFade();
      const token = ++playTokenRef.current;

      el.volume = HERO_AUDIO_VOLUME;
      // Avoid touching currentTime before metadata loads (readyState === 0) so iOS Safari
      // does not stall or reject first-tap playback on a freshly mounted <audio> element.
      if (fromStart && el.readyState > 0 && el.currentTime > 0) {
        try {
          el.currentTime = 0;
        } catch {
          // ignore if seekable range not ready yet
        }
      }

      const playPromise = el.play();
      if (playPromise) {
        playPromise
          .then(() => {
            if (playTokenRef.current !== token) {
              el.pause();
              return;
            }
            isPlayingRef.current = true;
            setIsPlaying(true);
          })
          .catch(() => {
            if (playTokenRef.current !== token) return;
            isPlayingRef.current = false;
            setIsPlaying(false);

            // If iOS Safari rejected cold first-tap playback due to slow initial buffering,
            // unlock seamlessly on the user's next tap while the letter stays open.
            if (!openedRef.current) return;
            const onRetryGesture = (e: Event) => {
              detachRetryUnlock();
              if (!openedRef.current || isPlayingRef.current) return;
              if (
                pillBtnRef.current &&
                e.target instanceof Node &&
                pillBtnRef.current.contains(e.target)
              ) {
                return;
              }
              const retryEl = audioRef.current;
              if (!retryEl) return;
              const retryToken = ++playTokenRef.current;
              retryEl.volume = HERO_AUDIO_VOLUME;
              void retryEl
                .play()
                .then(() => {
                  if (playTokenRef.current !== retryToken) {
                    retryEl.pause();
                    return;
                  }
                  isPlayingRef.current = true;
                  setIsPlaying(true);
                })
                .catch(() => {
                  if (playTokenRef.current === retryToken) {
                    isPlayingRef.current = false;
                    setIsPlaying(false);
                  }
                });
            };

            window.addEventListener("pointerdown", onRetryGesture, true);
            window.addEventListener("keydown", onRetryGesture, true);
            detachRetryRef.current = () => {
              window.removeEventListener("pointerdown", onRetryGesture, true);
              window.removeEventListener("keydown", onRetryGesture, true);
            };
          });
      }
    },
    [cancelFade, cleanSrc, detachRetryUnlock]
  );

  const resetLetter = useCallback(() => {
    stopAudio(true);
    openedRef.current = false;
    setOpened(false);
    setReplayKey((k) => k + 1);
  }, [stopAudio]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      openedRef.current = nextOpen;
      setOpened(nextOpen);
      if (nextOpen) {
        startAudio(true);
      } else {
        stopAudio(true);
      }
    },
    [startAudio, stopAudio]
  );

  const toggleAudio = useCallback(() => {
    if (isPlayingRef.current) {
      stopAudio(false);
    } else {
      startAudio(false);
    }
  }, [startAudio, stopAudio]);

  // Fade out music & reset envelope/animation when scrolling past the Hero card,
  // then replay entrance animation visibly when scrolling back into view.
  useEffect(() => {
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          leftViewportRef.current = true;
          if (openedRef.current || isPlayingRef.current) {
            stopAudio(true);
            openedRef.current = false;
            setOpened(false);
            setReplayKey((k) => k + 1);
          }
        } else if (leftViewportRef.current) {
          leftViewportRef.current = false;
          setReplayKey((k) => k + 1);
        }
      },
      { threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [stopAudio]);

  // Pause audio if the browser tab becomes hidden so sound never leaks in background tabs.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && isPlayingRef.current) {
        stopAudio(false, true);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [stopAudio]);

  // Clean up timers, listeners, and audio playback on unmount or track change.
  useEffect(() => {
    const el = audioRef.current;
    return () => {
      playTokenRef.current += 1;
      detachRetryUnlock();
      cancelFade();
      if (el) {
        el.pause();
      }
      isPlayingRef.current = false;
    };
  }, [cancelFade, cleanSrc, detachRetryUnlock]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay: 0.14, ease: EASE_WARM }}
      className="relative"
    >
      {/* Persistent DOM <audio> with preload="metadata" & playsInline so iOS Safari plays on first tap */}
      {cleanSrc && (
        <audio
          ref={audioRef}
          src={cleanSrc}
          preload="metadata"
          playsInline
          loop
          aria-hidden="true"
          className="hidden"
        />
      )}

      <MotionFloat distance={6} duration={4.6} paused={opened}>
        <div ref={cardRef} className="relative touch-pan-y">
          <div
            aria-hidden
            className="absolute -inset-8 rounded-[3rem] pointer-events-none opacity-85 dark:opacity-55"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(222,112,56,0.24) 0%, rgba(255,219,203,0.16) 46%, transparent 74%)",
            }}
          />
          <div className="relative w-[300px] sm:w-[340px] h-[490px] sm:h-[520px] rounded-[2.5rem] border-[10px] border-white dark:border-[#3A2B24] shadow-[0_30px_80px_rgba(222,112,56,0.24)] overflow-hidden bg-surface touch-pan-y">
            <div
              data-light-card
              className="h-full w-full overflow-hidden touch-pan-y flex items-center justify-center"
            >
              <TemplateRenderer
                key={replayKey}
                content={content}
                preview
                interactive
                hideAudioControls
                onOpenChange={handleOpenChange}
              />
            </div>

            <AnimatePresence>
              {opened && cleanSrc && (
                <motion.button
                  ref={pillBtnRef}
                  type="button"
                  onClick={toggleAudio}
                  initial={{ opacity: 0, y: 10, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.94 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.28, ease: EASE_WARM }}
                  aria-label={isPlaying ? `Jeda lagu ${trackTitle}` : `Putar lagu ${trackTitle}`}
                  title={isPlaying ? `Jeda ${trackTitle}` : `Putar ${trackTitle}`}
                  className="absolute bottom-3 left-3 z-30 h-8 max-w-[122px] sm:max-w-[150px] inline-flex items-center gap-1.5 pl-1 pr-2.5 rounded-full bg-white/95 text-[#241914] border border-[#E6D5CB] shadow-sm hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <span className="h-6 w-6 rounded-full bg-primary text-white grid place-items-center shrink-0">
                    {isPlaying ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3 ml-0.5" />
                    )}
                  </span>
                  <span
                    aria-hidden
                    className={`block w-2.5 h-2.5 rounded-full shrink-0 ${
                      isPlaying ? "animate-spin [animation-duration:2.2s] motion-reduce:animate-none" : ""
                    }`}
                    style={{
                      background:
                        "conic-gradient(#FFD8C2 0 25%, #DE7038 0 50%, #FFD8C2 0 75%, #DE7038 0)",
                    }}
                  />
                  <span className="text-[10.5px] font-semibold text-[#55443C] truncate">
                    {trackTitle}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {opened && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.94 }}
                  transition={{ duration: 0.28, ease: EASE_WARM }}
                  className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5"
                >
                  <motion.button
                    type="button"
                    onClick={resetLetter}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.92 }}
                    transition={SPRING_TACTILE}
                    aria-label="Tutup surat dan ulangi pratinjau"
                    title="Ulangi"
                    className="h-8 w-8 rounded-full bg-white/95 text-[#55443C] border border-[#E6D5CB] shadow-sm grid place-items-center hover:text-primary transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </motion.button>
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    transition={SPRING_TACTILE}
                  >
                    <Link
                      href={`/buat/${content.templateSlug}`}
                      className="group inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary hover:bg-[#E88048] text-white text-[11px] font-semibold shadow-sm transition-colors"
                    >
                      <span>Pakai ini</span>
                      <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {!opened && (
              <motion.span
                initial={{ opacity: 0, y: -6, scale: 0.9, rotate: 6 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 6 }}
                exit={{ opacity: 0, y: -8, scale: 0.86 }}
                transition={{ duration: 0.3, ease: EASE_WARM }}
                className="pointer-events-none absolute -right-2 sm:-right-4 -top-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-[#2E241F] border border-outline-variant/30 dark:border-[#4E3930] rounded-full shadow-card text-label-md font-semibold text-on-surface"
              >
                <MousePointerClick className="h-3.5 w-3.5 text-primary animate-pulse motion-reduce:animate-none" />
                <span>Coba klik suratnya</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </MotionFloat>
    </motion.div>
  );
}
