"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Gamepad2,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  RotateCcw,
  Volume2,
  VolumeX,
  Pause,
  Play,
  HelpCircle,
  Camera,
  Music,
  Mail,
  Check,
  Gift,
  Heart,
  X,
} from "lucide-react";
import type { Handle, Phase } from "./courier/game";
import { MAX_HP, type MomentId } from "./courier/physics";
import { ConfettiOverlay } from "./courier/ConfettiOverlay";
import { KURIR_SAMPLE_MUSIC_URL } from "@/lib/music-library";
import {
  EASE_WARM,
  MotionFadeUp,
  MotionTextReveal,
  SPRING_TACTILE,
} from "./MotionPrimitives";

const SAMPLE_MEMORIES = [
  {
    title: "Momen Pertama",
    caption: "Saat pertama kali kamu tersenyum di kedai kopi itu, rasanya dunia berhenti sejenak.",
    image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80",
    date: "14 Feb",
  },
  {
    title: "Senja Favorit",
    caption: "Menatap langit jingga berdua tanpa banyak kata, tapi hatiku rasanya begitu penuh.",
    image: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=800&q=80",
    date: "28 Jun",
  },
  {
    title: "Tawa Manismu",
    caption: "Tawamu adalah hal paling sederhana yang selalu berhasil merapikan hari-hariku yang lelah.",
    image: "https://images.unsplash.com/photo-1494774157365-9e04c6720e47?auto=format&fit=crop&w=800&q=80",
    date: "03 Okt",
  },
];

export default function CourierGame() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Handle | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ c: 0, t: 3 });
  const [collectedIds, setCollectedIds] = useState<MomentId[]>([]);
  const [hp, setHp] = useState(MAX_HP);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [nearMoment, setNearMoment] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<"foto" | "lagu" | "surat" | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
    if (phase === "playing") {
      document.documentElement.dataset.kurirPlaying = "1";
    } else {
      delete document.documentElement.dataset.kurirPlaying;
    }
    return () => {
      delete document.documentElement.dataset.kurirPlaying;
    };
  }, [phase]);

  const [cassettePlaying, setCassettePlaying] = useState(false);
  const cassetteAudioRef = useRef<HTMLAudioElement | null>(null);
  const cassetteTimerRef = useRef<number | null>(null);
  const cassetteCtxRef = useRef<AudioContext | null>(null);
  const cassetteGainRef = useRef<GainNode | null>(null);
  const cassetteFadeRafRef = useRef(0);
  const cassetteTokenRef = useRef(0);
  const ignoreOffscreenPauseUntilRef = useRef(0);

  const stopCassetteAudio = useCallback((instant = false) => {
    const token = ++cassetteTokenRef.current;
    if (cassetteFadeRafRef.current) {
      cancelAnimationFrame(cassetteFadeRafRef.current);
      cassetteFadeRafRef.current = 0;
    }
    if (cassetteTimerRef.current !== null) {
      window.clearInterval(cassetteTimerRef.current);
      cassetteTimerRef.current = null;
    }
    setCassettePlaying(false);

    // Smooth fade-out for WebAudio music-box fallback
    if (cassetteCtxRef.current && cassetteGainRef.current) {
      const ac = cassetteCtxRef.current;
      const gain = cassetteGainRef.current.gain;
      const now = ac.currentTime;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      if (instant) {
        gain.setValueAtTime(0, now);
      } else {
        gain.linearRampToValueAtTime(0, now + 0.32);
      }
    }

    // Smooth fade-out for HTMLAudioElement cassette track (when volume is writable)
    const el = cassetteAudioRef.current;
    if (!el) return;
    const finalizePause = () => {
      el.pause();
      el.volume = 0.6;
      if (el.readyState > 0 && el.currentTime > 0) {
        try {
          el.currentTime = 0;
        } catch {
          // ignore
        }
      }
    };

    const prevVol = el.volume;
    const probeVol = prevVol > 0.5 ? prevVol - 0.05 : prevVol + 0.05;
    el.volume = probeVol;
    const canFadeVolume = Math.abs(el.volume - probeVol) < 0.01;
    el.volume = prevVol;

    if (instant || el.paused || !canFadeVolume) {
      finalizePause();
      return;
    }

    const startVol = el.volume;
    const startedAt = performance.now();
    const fadeMs = 340;
    const stepFade = (now: number) => {
      if (cassetteTokenRef.current !== token) {
        cassetteFadeRafRef.current = 0;
        return;
      }
      const p = Math.min(1, (now - startedAt) / fadeMs);
      el.volume = Math.max(0, startVol * (1 - p) * (1 - p));
      if (p < 1) {
        cassetteFadeRafRef.current = requestAnimationFrame(stepFade);
      } else {
        cassetteFadeRafRef.current = 0;
        finalizePause();
      }
    };
    cassetteFadeRafRef.current = requestAnimationFrame(stepFade);
  }, []);

  const toggleCassetteAudio = useCallback(() => {
    if (cassettePlaying) {
      stopCassetteAudio();
      return;
    }
    const token = ++cassetteTokenRef.current;
    if (cassetteFadeRafRef.current) {
      cancelAnimationFrame(cassetteFadeRafRef.current);
      cassetteFadeRafRef.current = 0;
    }
    if (muted) {
      gameRef.current?.setMuted(false);
    }

    if (KURIR_SAMPLE_MUSIC_URL) {
      let audio = cassetteAudioRef.current;
      if (!audio) {
        audio = new Audio(KURIR_SAMPLE_MUSIC_URL);
        audio.loop = true;
        audio.volume = 0.6;
        cassetteAudioRef.current = audio;
      }
      audio.volume = 0.6;
      audio
        .play()
        .then(() => {
          if (cassetteTokenRef.current !== token) {
            audio?.pause();
            return;
          }
          setCassettePlaying(true);
        })
        .catch(() => {
          if (cassetteTokenRef.current === token) setCassettePlaying(false);
        });
      return;
    }

    // Gentle warm music-box preview fallback before raw-music/ audio is built
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    if (!cassetteCtxRef.current) {
      const created = new AudioCtx();
      const masterGain = created.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(created.destination);
      cassetteCtxRef.current = created;
      cassetteGainRef.current = masterGain;
    }
    const ac = cassetteCtxRef.current;
    const masterGain = cassetteGainRef.current;
    if (!masterGain) return;
    if (ac.state === "suspended") void ac.resume();
    masterGain.gain.cancelScheduledValues(ac.currentTime);
    masterGain.gain.setValueAtTime(1, ac.currentTime);

    const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 783.99];
    let stepIdx = 0;
    const playNote = () => {
      const freq = notes[stepIdx % notes.length];
      stepIdx++;
      const now = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc.connect(gain).connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.45);
    };
    playNote();
    cassetteTimerRef.current = window.setInterval(playNote, 420);
    setCassettePlaying(true);
  }, [cassettePlaying, muted, stopCassetteAudio]);

  useEffect(() => {
    return () => {
      cassetteTokenRef.current += 1;
      if (cassetteFadeRafRef.current) {
        cancelAnimationFrame(cassetteFadeRafRef.current);
        cassetteFadeRafRef.current = 0;
      }
      if (cassetteAudioRef.current) {
        cassetteAudioRef.current.pause();
        cassetteAudioRef.current.removeAttribute("src");
        try {
          cassetteAudioRef.current.load();
        } catch {
          // ignore
        }
        cassetteAudioRef.current = null;
      }
      if (cassetteTimerRef.current !== null) {
        window.clearInterval(cassetteTimerRef.current);
        cassetteTimerRef.current = null;
      }
      if (cassetteCtxRef.current) {
        void cassetteCtxRef.current.close();
        cassetteCtxRef.current = null;
        cassetteGainRef.current = null;
      }
    };
  }, []);

  const scrollToCenter = useCallback(() => {
    ignoreOffscreenPauseUntilRef.current = performance.now() + 750;
    wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const openModal = useCallback((type: "foto" | "lagu" | "surat") => {
    gameRef.current?.pause();
    setActiveModal(type);
  }, []);

  const closeModalAndContinue = useCallback(() => {
    stopCassetteAudio();
    if (activeModal) {
      const type = activeModal;
      setActiveModal(null);
      gameRef.current?.collect(type);
      gameRef.current?.resume();
      scrollToCenter();
    }
  }, [activeModal, scrollToCenter, stopCassetteAudio]);

  useEffect(() => {
    if (!activeModal && !showHelp) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (activeModal) {
        closeModalAndContinue();
      } else if (showHelp) {
        setShowHelp(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeModal, showHelp, closeModalAndContinue]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let handle: Handle | null = null;
    let cancelled = false;

    const load = () => {
      import("./courier/game")
        .then((mod) => {
          if (cancelled) return;
          handle = mod.mount(canvas, {
            onPhase: setPhase,
            onProgress: (c, t) => setProgress({ c, t }),
            onCollected: setCollectedIds,
            onHp: (nextHp) => setHp(nextHp),
            onMuted: setMuted,
            onNearMoment: (momentId) => {
              if (momentId && momentId.endsWith(":action")) {
                const type = momentId.replace(":action", "") as "foto" | "lagu" | "surat";
                openModal(type);
              } else {
                setNearMoment(momentId);
              }
            },
          });
          gameRef.current = handle;
          setMuted(handle.isMuted());
          setReady(true);
        })
        .catch(() => setFailed(true));
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          load();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(wrap);

    return () => {
      cancelled = true;
      io.disconnect();
      handle?.destroy();
      gameRef.current = null;
    };
  }, [reduced, openModal]);

  // Jeda game otomatis dengan fade-out ketika >50% area game mulai keluar dari layar saat di-scroll
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof IntersectionObserver === "undefined") return;

    const visibilityIo = new IntersectionObserver(
      ([entry]) => {
        if (performance.now() < ignoreOffscreenPauseUntilRef.current) return;
        const mostlyVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        if (!mostlyVisible) {
          if (phaseRef.current === "playing") {
            gameRef.current?.pause();
          }
          stopCassetteAudio();
        }
      },
      { threshold: [0, 0.5] }
    );

    visibilityIo.observe(wrap);
    return () => visibilityIo.disconnect();
  }, [stopCassetteAudio]);

  const press = useCallback((key: "left" | "right" | "jump", down: boolean) => {
    gameRef.current?.press(key, down);
  }, []);

  const start = useCallback(() => {
    stopCassetteAudio();
    setShowHelp(false);
    setActiveModal(null);
    setNearMoment(null);
    setCollectedIds([]);
    setHp(MAX_HP);
    gameRef.current?.start();
    scrollToCenter();
  }, [scrollToCenter, stopCassetteAudio]);

  const togglePause = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    if (phase === "playing") {
      game.pause();
    } else if (phase === "paused") {
      game.resume();
      scrollToCenter();
    }
  }, [phase, scrollToCenter]);

  const toggleMute = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    const nextMuted = !game.isMuted();
    game.setMuted(nextMuted);
    if (nextMuted) stopCassetteAudio();
  }, [stopCassetteAudio]);

  const playing = phase === "playing" || phase === "paused";
  const liveText =
    phase === "won"
      ? "Kado terkirim. Kejutan siap dibagikan."
      : phase === "lost"
        ? "Nyawa habis. Coba lagi untuk mengantar kado."
        : `${progress.c} dari ${progress.t} kejutan terkumpul. Sisa ${hp} dari ${MAX_HP} hati.`;

  return (
    <section
      id="kurir"
      className="w-full relative bg-surface-container-low overflow-hidden select-none pb-14 md:pb-20"
    >
      {/* Header section */}
      <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10 px-5 pt-16 md:pt-24">
        <MotionFadeUp y={10}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface text-primary text-label-md font-semibold rounded-full mb-5 border border-outline-variant/40 shadow-xs">
            <Gamepad2 className="h-4 w-4" />
            Coba dulu, gratis
          </span>
        </MotionFadeUp>
        <MotionTextReveal
          as="h2"
          text="Kurir Kado, main ~1 menit"
          className="font-heading text-headline-lg text-on-surface mb-3"
        />
        <MotionFadeUp delay={0.1} y={12}>
          <p className="text-body-lg font-medium text-on-surface-variant">
            Antar kado ke penerima — sambil mampir melihat foto, lagu, dan surat
            di sepanjang jalan. Ini rasa yang kamu kirim, dalam bentuk paling sederhana.
          </p>
        </MotionFadeUp>
      </div>

      <div
        ref={wrapRef}
        className="relative w-full h-[480px] sm:h-[520px] md:h-[540px] lg:h-[560px] overflow-hidden bg-[#FCE5D4] border-y border-outline-variant/40"
      >
        <canvas
          ref={canvasRef}
          role="application"
          tabIndex={0}
          aria-label="Mini-game Kurir Kado. Gunakan panah kiri dan kanan untuk bergerak, spasi untuk melompat."
          className="block w-full h-full touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ imageRendering: "pixelated" }}
          onKeyDown={(e) => {
            if (e.key === " " || e.code === "Space" || e.key.startsWith("Arrow")) {
              e.preventDefault();
            }
          }}
        />

        {/* HUD PesanManis Kiri Atas: 3 Slot Item Kado & 3 Nyawa Hati */}
        {playing && (
          <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/92 backdrop-blur-md border border-[#D9C3B5]/70 shadow-xs text-[#241914]">
              {(
                [
                  { id: "foto" as const, label: "Foto", Icon: Camera },
                  { id: "lagu" as const, label: "Lagu", Icon: Music },
                  { id: "surat" as const, label: "Surat", Icon: Mail },
                ] as const
              ).map(({ id, label, Icon }) => {
                const collected = collectedIds.includes(id);
                return (
                  <span
                    key={id}
                    title={label}
                    aria-label={`${label}: ${collected ? "terkumpul" : "belum diambil"}`}
                    className={`relative h-7 w-7 rounded-full grid place-items-center transition-all ${
                      collected
                        ? "bg-primary text-white shadow-2xs"
                        : "bg-[#FEF1EA] text-[#867366] border border-[#D9C3B5]/60"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {collected && (
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#4E8A54] text-white grid place-items-center ring-1 ring-white">
                        <Check className="h-2 w-2 stroke-[3]" />
                      </span>
                    )}
                  </span>
                );
              })}
              <span className="pl-1 pr-1.5 font-heading text-xs font-bold tracking-wide text-[#241914]">
                {progress.c}/{progress.t}
              </span>
            </div>

            <div
              aria-label={`Nyawa: ${hp} dari ${MAX_HP} hati`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/92 backdrop-blur-md border border-[#D9C3B5]/70 shadow-xs"
            >
              {Array.from({ length: MAX_HP }).map((_, i) => {
                const filled = i < hp;
                return (
                  <Heart
                    key={i}
                    className={`h-4 w-4 transition-all ${
                      filled
                        ? "fill-[#DC4A4A] text-[#DC4A4A]"
                        : "fill-transparent text-[#D9C3B5]"
                    }`}
                  />
                );
              })}
            </div>

            {progress.c === progress.t && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF9F5]/95 backdrop-blur-md border border-primary/50 text-primary text-xs font-bold shadow-xs">
                <Gift className="h-3.5 w-3.5" />
                Semua kado lengkap!
              </span>
            )}
          </div>
        )}

        {/* HUD PesanManis Kanan Atas: Kontrol Suara & Pause */}
        {playing && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
              className="h-10 w-10 grid place-items-center rounded-full bg-white/90 backdrop-blur-md text-[#241914] border border-[#D9C3B5]/60 shadow-xs hover:bg-white hover:text-primary active:scale-95 transition-all"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={togglePause}
              aria-label={phase === "paused" ? "Lanjutkan" : "Jeda"}
              className="h-10 w-10 grid place-items-center rounded-full bg-white/90 backdrop-blur-md text-[#241914] border border-[#D9C3B5]/60 shadow-xs hover:bg-white hover:text-primary active:scale-95 transition-all"
            >
              {phase === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setShowHelp((prev) => !prev)}
              aria-label="Bantuan cara main"
              className="h-10 w-10 grid place-items-center rounded-full bg-white/90 backdrop-blur-md text-[#241914] border border-[#D9C3B5]/60 shadow-xs hover:bg-white hover:text-primary active:scale-95 transition-all"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Floating Prompt Pill: Satu CTA terpadu saat Kurir menghampiri item */}
        <AnimatePresence>
          {playing && nearMoment && !activeModal && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.94 }}
              transition={{ duration: 0.2, ease: EASE_WARM }}
              className="absolute top-24 sm:top-auto sm:bottom-6 left-1/2 -translate-x-1/2 z-25 flex flex-col items-center gap-1"
            >
              <motion.button
                type="button"
                whileHover={{ y: -2, scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                transition={SPRING_TACTILE}
                onClick={() => openModal(nearMoment as "foto" | "lagu" | "surat")}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#FFF9F5]/95 backdrop-blur-md text-[#241914] font-heading font-bold text-xs sm:text-sm shadow-[0_10px_28px_rgba(36,25,20,0.22)] border-2 border-[#DE7038] hover:bg-white transition-colors cursor-pointer"
              >
                {nearMoment === "foto" && (
                  <>
                    <Camera className="h-4 w-4 text-primary shrink-0" />
                    <span>{collectedIds.includes("foto") ? "Buka Galeri Foto" : "Lihat Galeri Foto"}</span>
                  </>
                )}
                {nearMoment === "lagu" && (
                  <>
                    <Music className="h-4 w-4 text-primary shrink-0" />
                    <span>{collectedIds.includes("lagu") ? "Putar Lagu Cerita" : "Dengar Lagu Cerita"}</span>
                  </>
                )}
                {nearMoment === "surat" && (
                  <>
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <span>{collectedIds.includes("surat") ? "Baca Surat Manis" : "Buka Surat Manis"}</span>
                  </>
                )}
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-[#FEF1EA] text-[#DE7038] font-mono font-bold border border-[#DE7038]/30">
                  E
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal 1: Galeri Foto Polaroid */}
        <AnimatePresence>
          {activeModal === "foto" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeModalAndContinue}
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-3 sm:p-4 cursor-pointer"
            >
              <motion.div
                data-light-card
                data-lenis-prevent
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.25, ease: EASE_WARM }}
                className="relative w-full max-w-[320px] sm:max-w-[360px] max-h-full overflow-y-auto rounded-3xl bg-[#FFF9F5] p-4 sm:p-5 shadow-[0_25px_60px_rgba(36,25,20,0.3)] border border-[#E6D5CB] flex flex-col items-center cursor-default"
              >
              {/* Header Pita / Perangko */}
              <div className="w-full flex justify-between items-center gap-2 mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 shrink-0" />
                  <span>Galeri Kenangan</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#55443C] font-mono font-semibold">
                    {activeSlide + 1} / {SAMPLE_MEMORIES.length}
                  </span>
                  <button
                    type="button"
                    onClick={closeModalAndContinue}
                    aria-label="Tutup galeri dan lanjut bermain"
                    className="h-7 w-7 rounded-full bg-white border border-[#E6D5CB] grid place-items-center text-[#55443C] hover:text-primary active:scale-95 transition-all cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Polaroid Frame */}
              <div className="w-full bg-white p-2.5 sm:p-3 rounded-2xl shadow-xs border border-[#E6D5CB]/80 flex flex-col items-center">
                <div className="relative w-full aspect-[16/10] lg:aspect-4/3 rounded-xl overflow-hidden bg-slate-100 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={SAMPLE_MEMORIES[activeSlide].image}
                    alt={SAMPLE_MEMORIES[activeSlide].title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-mono font-medium">
                    {SAMPLE_MEMORIES[activeSlide].date}
                  </div>
                </div>

                <p className="font-heading font-bold text-title-sm text-[#241914] mb-0.5">
                  {SAMPLE_MEMORIES[activeSlide].title}
                </p>
                <p className="text-xs text-[#55443C] text-center italic leading-snug sm:leading-relaxed px-1">
                  &ldquo;{SAMPLE_MEMORIES[activeSlide].caption}&rdquo;
                </p>
              </div>

              {/* Navigasi Slide Dots & Arrows */}
              <div className="flex items-center gap-4 mt-2.5 mb-2.5">
                <button
                  type="button"
                  aria-label="Foto sebelumnya"
                  onClick={() =>
                    setActiveSlide((prev) => (prev > 0 ? prev - 1 : SAMPLE_MEMORIES.length - 1))
                  }
                  className="h-8 w-8 rounded-full bg-white border border-[#E6D5CB] grid place-items-center text-[#241914] hover:text-primary active:scale-95 transition-all text-xs font-bold cursor-pointer"
                >
                  ‹
                </button>
                <div className="flex gap-1.5">
                  {SAMPLE_MEMORIES.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => setActiveSlide(i)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeSlide === i ? "w-6 bg-primary" : "w-2 bg-[#E6D5CB]"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Foto berikutnya"
                  onClick={() =>
                    setActiveSlide((prev) => (prev < SAMPLE_MEMORIES.length - 1 ? prev + 1 : 0))
                  }
                  className="h-8 w-8 rounded-full bg-white border border-[#E6D5CB] grid place-items-center text-[#241914] hover:text-primary active:scale-95 transition-all text-xs font-bold cursor-pointer"
                >
                  ›
                </button>
              </div>

              {/* Tombol Lanjut Antar */}
              <button
                type="button"
                onClick={closeModalAndContinue}
                className="w-full py-2.5 bg-primary hover:bg-[#E88048] text-white text-label-md font-semibold rounded-full shadow-[0_6px_20px_rgba(222,112,56,0.28)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Simpan &amp; Lanjut Antar</span>
                <span className="text-base font-bold">›</span>
              </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal 2: Pemutar Kaset Pita Retro (Lagu Cerita) */}
        <AnimatePresence>
          {activeModal === "lagu" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeModalAndContinue}
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-3 sm:p-4 cursor-pointer"
            >
              <motion.div
                data-light-card
                data-lenis-prevent
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.25, ease: EASE_WARM }}
                className="relative w-full max-w-[320px] sm:max-w-[360px] max-h-full overflow-y-auto rounded-3xl bg-[#FFF9F5] p-4 sm:p-5 shadow-[0_25px_60px_rgba(36,25,20,0.3)] border border-[#E6D5CB] flex flex-col items-center cursor-default"
              >
              {/* Header */}
              <div className="w-full flex justify-between items-center gap-2 mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5 shrink-0" />
                  <span>Melodi Kenangan</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-[#55443C] font-mono font-semibold">
                    Side A • 03:24
                  </span>
                  <button
                    type="button"
                    onClick={closeModalAndContinue}
                    aria-label="Tutup pemutar melodi dan lanjut bermain"
                    className="h-7 w-7 rounded-full bg-white border border-[#E6D5CB] grid place-items-center text-[#55443C] hover:text-primary active:scale-95 transition-all cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Retro Cassette Shell */}
              <div className="w-full bg-[#2A2320] text-[#FFF9F5] p-3.5 sm:p-4 rounded-2xl shadow-md border-2 border-[#4A3B32] flex flex-col items-center relative overflow-hidden">
                {/* Cassette Top Label */}
                <div className="w-full flex justify-between items-center border-b border-[#4A3B32] pb-2 mb-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#D9C3B5]">
                    PesanManis Tape #01
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#DE7038] text-white font-mono font-bold">
                    STEREO
                  </span>
                </div>

                {/* Cassette Center Spool Window */}
                <div className="w-full bg-[#1A1513] rounded-xl p-2 border border-[#3A2D26] flex items-center justify-around mb-2.5">
                  {/* Left Spool */}
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#E6D5CB] border-4 border-[#2A2320] flex items-center justify-center ${
                      cassettePlaying ? "animate-spin [animation-duration:4s]" : ""
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2A2320]" />
                  </div>

                  {/* Tape window with equalizer bars */}
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-[#2A2320]/80 rounded border border-[#3A2D26]">
                    <span className={`w-1 h-3 bg-[#DE7038] rounded-full ${cassettePlaying ? "animate-pulse" : "opacity-50"}`} />
                    <span className={`w-1 h-5 bg-[#DE7038] rounded-full ${cassettePlaying ? "animate-pulse [animation-delay:0.2s]" : "opacity-50"}`} />
                    <span className={`w-1 h-2 bg-[#DE7038] rounded-full ${cassettePlaying ? "animate-pulse [animation-delay:0.4s]" : "opacity-50"}`} />
                    <span className={`w-1 h-4 bg-[#DE7038] rounded-full ${cassettePlaying ? "animate-pulse [animation-delay:0.1s]" : "opacity-50"}`} />
                  </div>

                  {/* Right Spool */}
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#E6D5CB] border-4 border-[#2A2320] flex items-center justify-center ${
                      cassettePlaying ? "animate-spin [animation-duration:4s]" : ""
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2A2320]" />
                  </div>
                </div>

                {/* Track Title & Subtitle */}
                <p className="font-heading font-bold text-title-sm text-[#FFF9F5] text-center">
                  Melodi Teman Cerita
                </p>
                <p className="text-[11px] text-[#D9C3B5] text-center mb-2">
                  Lagu Pengiring Suasana Hati
                </p>

                <button
                  type="button"
                  onClick={toggleCassetteAudio}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#DE7038] hover:bg-[#E88048] text-white text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  {cassettePlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      <span>Jeda Melodi</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 ml-0.5" />
                      <span>Putar Melodi</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quote / Caption */}
              <p className="text-xs text-[#55443C] text-center italic leading-snug sm:leading-relaxed px-1 my-2.5 sm:my-3">
                &ldquo;Lagu sederhana yang selalu kamu putar saat kita dalam perjalanan sore. Setiap nadanya selalu mengingatkanku pada senyummu.&rdquo;
              </p>

              {/* Tombol Lanjut Antar */}
              <button
                type="button"
                onClick={closeModalAndContinue}
                className="w-full py-2.5 bg-primary hover:bg-[#E88048] text-white text-label-md font-semibold rounded-full shadow-[0_6px_20px_rgba(222,112,56,0.28)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Simpan &amp; Lanjut Antar</span>
                <span className="text-base font-bold">›</span>
              </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal 3: Lembaran Surat Kertas Pos (Surat Manis) */}
        <AnimatePresence>
          {activeModal === "surat" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeModalAndContinue}
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-3 sm:p-4 cursor-pointer"
            >
              <motion.div
                data-light-card
                data-lenis-prevent
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.25, ease: EASE_WARM }}
                className="relative w-full max-w-[320px] sm:max-w-[360px] max-h-full overflow-y-auto rounded-3xl bg-[#FFF9F5] p-4 sm:p-5 shadow-[0_25px_60px_rgba(36,25,20,0.3)] border border-[#E6D5CB] flex flex-col items-center cursor-default"
              >
              {/* Header */}
              <div className="w-full flex justify-between items-center gap-2 mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>Surat Manis</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-[#55443C] font-mono font-semibold">
                    Pos Kilat Hati
                  </span>
                  <button
                    type="button"
                    onClick={closeModalAndContinue}
                    aria-label="Tutup surat dan lanjut bermain"
                    className="h-7 w-7 rounded-full bg-white border border-[#E6D5CB] grid place-items-center text-[#55443C] hover:text-primary active:scale-95 transition-all cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Surat Kertas Pos Vintage */}
              <div className="w-full bg-[#FFFDF9] p-4 rounded-2xl shadow-xs border-2 border-dashed border-[#E6D5CB] flex flex-col relative overflow-hidden">
                {/* Cap Pos Stempel */}
                <div className="absolute top-2.5 right-2.5 w-11 h-11 rounded-full border border-dashed border-[#DE7038]/60 flex flex-col items-center justify-center rotate-12 opacity-85 pointer-events-none">
                  <span className="text-[6.5px] font-mono font-bold text-[#DE7038] uppercase">POS HATI</span>
                  <span className="text-[10px]">❤️</span>
                  <span className="text-[5.5px] font-mono text-[#DE7038]">INDONESIA</span>
                </div>

                <p className="font-heading font-semibold text-xs text-primary mb-2 pr-12">
                  Untukmu yang selalu membawakan hangat,
                </p>

                <p className="text-xs text-[#3E3029] leading-relaxed mb-3">
                  Terima kasih sudah ada di setiap bab cerita ini. Kadang dunia terlalu bising dan terburu-buru, tapi bersamamu semuanya terasa begitu cukup, tenang, dan menyenangkan.
                </p>

                <div className="w-full text-right pt-2 border-t border-[#E6D5CB]/60">
                  <p className="text-[11px] font-serif italic text-[#55443C]">
                    — Dari seseorang yang selalu bersyukur memilikimu 🌷
                  </p>
                </div>
              </div>

              <div className="h-3" />

              {/* Tombol Lanjut Antar */}
              <button
                type="button"
                onClick={closeModalAndContinue}
                className="w-full py-2.5 bg-primary hover:bg-[#E88048] text-white text-label-md font-semibold rounded-full shadow-[0_6px_20px_rgba(222,112,56,0.28)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Simpan &amp; Lanjut Antar</span>
                <span className="text-base font-bold">›</span>
              </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Bantuan PesanManis */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowHelp(false)}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-3 sm:p-4 cursor-pointer"
            >
              <motion.div
                data-light-card
                data-lenis-prevent
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.22, ease: EASE_WARM }}
                className="relative w-full max-w-xs max-h-full overflow-y-auto rounded-3xl bg-white text-[#241914] p-5 sm:p-6 border border-[#E6D5CB] shadow-xl text-center cursor-default"
              >
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  aria-label="Tutup bantuan"
                  className="absolute top-3.5 right-3.5 h-7 w-7 rounded-full bg-[#FEF1EA] border border-[#E6D5CB] grid place-items-center text-[#55443C] hover:text-primary active:scale-95 transition-all cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-[#FEF1EA] text-primary mx-auto grid place-items-center mb-3">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <p className="font-heading text-title-md font-bold text-[#241914] mb-2">Cara Main</p>
                <p className="text-body-sm text-[#55443C] mb-5 leading-relaxed">
                  Tekan <b>← / →</b> untuk berjalan, <b>Spasi</b> untuk melompat (tahan sebentar untuk lompat lebih tinggi). Injak <b>Paket Bandel</b> dari atas, waspadai jurang, lewati lentera checkpoint, dan mampir buka foto, lagu, atau surat di jalan — atau langsung antar ke penerima!
                </p>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  className="w-full py-2.5 bg-primary hover:bg-[#E88048] text-white text-label-md font-semibold rounded-full shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Mengerti
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlay (Idle / Jeda / Menang) */}
        <AnimatePresence>
          {phase !== "playing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-4 bg-black/35"
            >
              <ConfettiOverlay
                active={phase === "won"}
                reduced={reduced}
                className="absolute inset-0 w-full h-full z-0"
              />
              {phase === "idle" && (
                <motion.div
                  key="idle"
                  data-light-card
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 6 }}
                  transition={{ duration: 0.26, ease: EASE_WARM }}
                  className="text-center max-w-[280px] sm:max-w-md rounded-3xl bg-white/95 backdrop-blur-md px-5 py-6 sm:px-8 sm:py-7 shadow-[0_16px_50px_rgba(36,25,20,0.18)] border border-[#E6D5CB] text-[#241914]"
                >
                  <p className="font-heading text-title-md sm:text-title-lg md:text-headline-md text-primary mb-2">
                    Kurir Kado
                  </p>
                  <p className="text-label-md md:text-body-md font-medium text-[#55443C] mb-4 sm:mb-5">
                    Panah kiri/kanan untuk jalan, spasi untuk lompat. Di HP: gunakan tombol arah &amp; lompat di bawah.
                  </p>
                  <motion.button
                    type="button"
                    onClick={start}
                    disabled={!ready}
                    whileHover={ready ? { y: -2, scale: 1.02 } : undefined}
                    whileTap={ready ? { scale: 0.96 } : undefined}
                    transition={SPRING_TACTILE}
                    className="inline-flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 rounded-full bg-primary hover:bg-[#E88048] text-white font-semibold shadow-[0_6px_20px_rgba(222,112,56,0.3)] transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {failed ? "Game gagal dimuat" : ready ? "Mulai main" : "Menyiapkan…"}
                  </motion.button>
                </motion.div>
              )}

              {/* Pop-up saat PAUSE: Kartu Pos Hangat PesanManis */}
              {phase === "paused" && (
                <motion.div
                  key="paused"
                  data-light-card
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.24, ease: EASE_WARM }}
                  className="relative w-full max-w-[320px] sm:max-w-[340px] rounded-3xl bg-[#FFF9F5] p-6 sm:p-7 flex flex-col items-center text-center shadow-[0_20px_50px_rgba(36,25,20,0.18)] border border-[#E6D5CB] text-[#241914]"
                >
                  {/* Aksen Motif Perangko Pos Surat Cinta */}
                  <div className="w-full flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1 pt-1 opacity-60">
                      <span className="h-0.5 w-10 bg-primary/40 rounded-full" />
                      <span className="h-0.5 w-14 bg-primary/30 rounded-full" />
                      <span className="h-0.5 w-8 bg-primary/20 rounded-full" />
                    </div>
                    <div className="p-1.5 bg-[#FEF1EA] border-2 border-dashed border-primary/40 rounded-lg shadow-2xs">
                      <span className="text-xl leading-none select-none">🎁</span>
                    </div>
                  </div>

                  <div className="w-full pb-1">
                    <h3 className="font-heading text-title-lg sm:text-headline-sm font-bold text-[#241914]">
                      Tarik napas dulu.
                    </h3>
                    <div className="h-0.5 w-12 bg-primary/20 mx-auto my-2.5 rounded-full" />
                    <p className="text-body-sm font-medium text-[#55443C] leading-relaxed">
                      Kadonya aman di tanganmu. Rahasianya juga.
                    </p>
                  </div>

                  <div className="w-full flex flex-col items-center gap-2.5 pt-4">
                    <button
                      type="button"
                      onClick={togglePause}
                      className="w-full py-3 bg-primary hover:bg-[#E88048] text-white text-label-lg font-semibold rounded-full shadow-[0_8px_24px_rgba(222,112,56,0.28)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Lanjut Antar</span>
                      <span className="text-lg leading-none font-bold">›</span>
                    </button>

                    <a
                      href="#cara-kerja"
                      className="text-label-sm font-medium text-[#55443C] hover:text-primary underline underline-offset-4 transition-colors"
                    >
                      Main nanti saja ↓
                    </a>
                  </div>
                </motion.div>
              )}

              {phase === "lost" && (
                <motion.div
                  key="lost"
                  data-light-card
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.24, ease: EASE_WARM }}
                  className="text-center max-w-[300px] sm:max-w-md rounded-3xl bg-[#FFF9F5] backdrop-blur-md px-5 py-6 sm:px-8 sm:py-7 shadow-[0_16px_50px_rgba(36,25,20,0.2)] border border-[#E6D5CB] text-[#241914]"
                >
                  <div className="w-11 h-11 rounded-full bg-[#FEF1EA] text-[#DC4A4A] mx-auto grid place-items-center mb-3 border border-[#E6D5CB]">
                    <Heart className="h-5 w-5" />
                  </div>
                  <p className="font-heading text-title-md sm:text-title-lg md:text-headline-md text-[#241914] mb-2">
                    Ups, Kadonya Terjatuh!
                  </p>
                  <p className="text-label-md md:text-body-md font-medium text-[#55443C] mb-5">
                    Paket Bandel dan jurangnya lumayan usil. Yuk antar ulang — kamu pasti bisa sampai ke penerima paket.
                  </p>
                  <button
                    type="button"
                    onClick={start}
                    className="inline-flex items-center justify-center gap-2 px-7 py-2.5 sm:px-8 sm:py-3 rounded-full bg-primary hover:bg-[#E88048] text-white font-semibold shadow-[0_6px_20px_rgba(222,112,56,0.3)] active:scale-95 transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" /> Coba Lagi
                  </button>
                </motion.div>
              )}

              {phase === "won" && (
                <motion.div
                  key="won"
                  data-light-card
                  data-lenis-prevent
                  initial={{ opacity: 0, scale: 0.92, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.3, ease: EASE_WARM }}
                  className="relative z-10 text-center w-full max-w-[310px] sm:max-w-md max-h-full overflow-y-auto rounded-3xl bg-white/95 backdrop-blur-md px-5 py-5 sm:px-8 sm:py-7 shadow-[0_16px_50px_rgba(36,25,20,0.18)] border border-[#E6D5CB] text-[#241914]"
                >
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF1EA] border border-[#E6D5CB] text-primary text-[11px] font-bold tracking-wide mb-2.5">
                    <Gift className="h-3.5 w-3.5" />
                    {collectedIds.length === progress.t
                      ? `Semua Kenangan Lengkap (${progress.c}/${progress.t})`
                      : collectedIds.length > 0
                        ? `${progress.c}/${progress.t} Kenangan Dibawa`
                        : "Pengantaran Kilat (0/3 Kenangan)"}
                  </span>
                  <p className="font-heading text-title-md sm:text-title-lg md:text-headline-md text-primary mb-2">
                    {collectedIds.length === progress.t
                      ? "Kado Lengkap Sampai!"
                      : "Kado Sampai!"}
                  </p>
                  <p className="text-label-md md:text-body-md font-medium text-[#55443C] mb-3.5 sm:mb-4">
                    {collectedIds.length === progress.t
                      ? "Sempurna! Semua foto, lagu, dan surat berhasil kamu bawa sampai ke penerima. Sekarang buat versi aslinya untuk orang tersayangmu."
                      : collectedIds.length > 0
                        ? `Manis sekali! Kamu sempat membuka ${collectedIds.length} dari ${progress.t} kenangan di perjalanan. Sekarang buat ucapan aslinya untuk orang tersayangmu.`
                        : "Pengantaran kilat berhasil! Lain kali kamu juga bisa mampir lihat foto, lagu, dan surat di jalan — atau langsung buat ucapan aslinya sekarang."}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4 sm:mb-5">
                    {(
                      [
                        { id: "foto" as const, label: "Foto", Icon: Camera },
                        { id: "lagu" as const, label: "Lagu", Icon: Music },
                        { id: "surat" as const, label: "Surat", Icon: Mail },
                      ] as const
                    ).map(({ id, label, Icon }) => {
                      const found = collectedIds.includes(id);
                      return (
                        <span
                          key={id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            found
                              ? "bg-[#EEF7EE] text-[#2F6A35] border-[#B8D9BA]"
                              : "bg-[#FAF4F0] text-[#867366] border-[#E6D5CB]/80"
                          }`}
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          <span>{label}</span>
                          {found && <Check className="h-3 w-3 stroke-[2.5] shrink-0" />}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <motion.div whileHover={{ y: -2, scale: 1.015 }} whileTap={{ scale: 0.97 }} transition={SPRING_TACTILE}>
                      <Link
                        href="/templates"
                        className="group inline-flex w-full items-center justify-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 rounded-full bg-primary hover:bg-[#E88048] text-white font-semibold shadow-[0_6px_20px_rgba(222,112,56,0.3)] transition-colors"
                      >
                        <span>Buat Ucapan Sekarang</span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </Link>
                    </motion.div>
                    <button
                      type="button"
                      onClick={start}
                      className="inline-flex items-center justify-center gap-1.5 py-1 text-label-sm font-semibold text-[#55443C] hover:text-primary transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Main lagi
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kontrol Sentuh di Mobile */}
        {playing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3 sm:hidden z-20">
            <div className="flex gap-2.5">
              <TouchButton label="Kiri" onDown={() => press("left", true)} onUp={() => press("left", false)}>
                <ArrowLeft className="h-5 w-5" />
              </TouchButton>
              <TouchButton label="Kanan" onDown={() => press("right", true)} onUp={() => press("right", false)}>
                <ArrowRight className="h-5 w-5" />
              </TouchButton>
            </div>
            <TouchButton label="Lompat" onDown={() => press("jump", true)} onUp={() => press("jump", false)}>
              <ArrowUp className="h-5 w-5" />
            </TouchButton>
          </div>
        )}

        {reduced && (
          <div className="absolute inset-0 grid place-items-center bg-surface/95 p-6 text-center z-30">
            <div className="max-w-sm text-on-surface">
              <p className="font-heading text-title-lg font-bold text-primary mb-2">Kurir Kado</p>
              <p className="text-body-sm text-on-surface-variant mb-4">
                Animasi dimatikan sesuai preferensi sistem. Kamu bisa langsung melihat katalog template ucapan.
              </p>
              <Link
                href="/templates"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-[#E88048] text-white text-label-sm font-semibold rounded-full shadow-sm"
              >
                Lihat template <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        <p aria-live="polite" className="sr-only">
          {liveText}
        </p>
      </div>

      <p className="hidden sm:flex items-center justify-center gap-4 pt-4 px-5 text-label-md text-on-surface-variant">
        <span>← / → Berjalan</span>
        <span aria-hidden className="text-outline-variant">•</span>
        <span>Spasi Melompat (tahan = lebih tinggi)</span>
        <span aria-hidden className="text-outline-variant">•</span>
        <span>Injak Paket Bandel dari atas</span>
      </p>
    </section>
  );
}

function TouchButton({
  label,
  children,
  onDown,
  onUp,
}: {
  label: string;
  children: React.ReactNode;
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDown();
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onUp();
      }}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      className="pointer-events-auto touch-none select-none h-14 w-14 grid place-items-center rounded-2xl bg-white/90 backdrop-blur-md text-[#241914] border border-[#D9C3B5]/60 shadow-md active:bg-primary active:text-white active:scale-95 transition-all"
    >
      {children}
    </button>
  );
}
