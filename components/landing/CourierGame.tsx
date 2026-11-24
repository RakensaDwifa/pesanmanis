"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import type { Handle, Phase } from "./courier/game";
import { MAX_HP, type MomentId } from "./courier/physics";
import { ConfettiOverlay } from "./courier/ConfettiOverlay";

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

  const scrollToCenter = useCallback(() => {
    wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const openModal = useCallback((type: "foto" | "lagu" | "surat") => {
    gameRef.current?.pause();
    setActiveModal(type);
  }, []);

  const closeModalAndContinue = useCallback(() => {
    if (activeModal) {
      const type = activeModal;
      setActiveModal(null);
      gameRef.current?.collect(type);
      gameRef.current?.resume();
      scrollToCenter();
    }
  }, [activeModal, scrollToCenter]);

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
      { rootMargin: "1200px" }
    );
    io.observe(wrap);

    return () => {
      cancelled = true;
      io.disconnect();
      handle?.destroy();
      gameRef.current = null;
    };
  }, [reduced, openModal]);

  // Jeda game otomatis ketika kanvas keluar dari layar pengguna (offscreen)
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof IntersectionObserver === "undefined") return;

    const visibilityIo = new IntersectionObserver(
      ([entry]) => {
        // ponytail: offscreen pause menjaga progres pemain saat menjelajah section lain
        if (!entry.isIntersecting && phaseRef.current === "playing") {
          gameRef.current?.pause();
        }
      },
      { threshold: 0 }
    );

    visibilityIo.observe(wrap);
    return () => visibilityIo.disconnect();
  }, []);

  const press = useCallback((key: "left" | "right" | "jump", down: boolean) => {
    gameRef.current?.press(key, down);
  }, []);

  const start = useCallback(() => {
    setShowHelp(false);
    setActiveModal(null);
    setNearMoment(null);
    setCollectedIds([]);
    setHp(MAX_HP);
    gameRef.current?.start();
    scrollToCenter();
  }, [scrollToCenter]);

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
    game.setMuted(!game.isMuted());
  }, []);

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
      className="w-full relative bg-surface-container-low overflow-hidden select-none"
    >
      {/* Header section sesuai Figma */}
      <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10 px-5 pt-16 md:pt-24">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface text-primary text-label-md font-semibold rounded-full mb-5 border border-outline-variant/40 shadow-xs">
          <Gamepad2 className="h-4 w-4" />
          Coba dulu, gratis
        </span>
        <h2 className="font-heading text-headline-lg text-on-surface mb-3">
          Kurir Kado, main 20 detik
        </h2>
        <p className="text-body-lg font-medium text-on-surface-variant">
          Kumpulkan foto, lagu, dan surat — lalu antar ke penerima. Ini
          rasa yang kamu kirim, dalam bentuk paling sederhana.
        </p>
      </div>

      <div
        ref={wrapRef}
        className="relative w-full h-[400px] sm:h-[460px] md:h-[500px] lg:h-[540px] overflow-hidden bg-[#FCE5D4] border-y border-outline-variant/40"
      >
        <canvas
          ref={canvasRef}
          role="application"
          tabIndex={0}
          aria-label="Mini-game Kurir Kado. Gunakan panah kiri dan kanan untuk bergerak, spasi untuk melompat."
          className="block w-full h-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ imageRendering: "pixelated" }}
          onKeyDown={(e) => {
            if (e.key === " " || e.code === "Space" || e.key.startsWith("Arrow")) {
              e.preventDefault();
            }
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse") return;
            e.preventDefault();
            press("jump", true);
          }}
          onPointerUp={(e) => {
            if (e.pointerType === "mouse") return;
            press("jump", false);
          }}
          onPointerCancel={(e) => {
            if (e.pointerType === "mouse") return;
            press("jump", false);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") return;
            press("jump", false);
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
                Antar ke penerima
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
        {playing && nearMoment && !activeModal && (
          <div className="absolute top-24 sm:top-auto sm:bottom-6 left-1/2 -translate-x-1/2 z-25 flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => openModal(nearMoment as "foto" | "lagu" | "surat")}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#FFF9F5]/95 backdrop-blur-md text-[#241914] font-heading font-bold text-xs sm:text-sm shadow-[0_10px_28px_rgba(36,25,20,0.22)] border-2 border-[#DE7038] hover:bg-white hover:-translate-y-0.5 active:scale-95 transition-all"
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
            </button>
          </div>
        )}

        {/* Modal 1: Galeri Foto Polaroid */}
        {activeModal === "foto" && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
            <div
              data-light-card
              className="relative w-full max-w-[320px] sm:max-w-[360px] rounded-3xl bg-[#FFF9F5] p-5 sm:p-6 shadow-[0_25px_60px_rgba(36,25,20,0.3)] border border-[#E6D5CB] flex flex-col items-center"
            >
              {/* Header Pita / Perangko */}
              <div className="w-full flex justify-between items-center mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <span>📸</span> Galeri Kenangan
                </span>
                <span className="text-xs text-[#55443C] font-mono font-semibold">
                  {activeSlide + 1} / {SAMPLE_MEMORIES.length}
                </span>
              </div>

              {/* Polaroid Frame */}
              <div className="w-full bg-white p-3 rounded-2xl shadow-xs border border-[#E6D5CB]/80 flex flex-col items-center">
                <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={SAMPLE_MEMORIES[activeSlide].image}
                    alt={SAMPLE_MEMORIES[activeSlide].title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-xs text-white text-[10px] font-mono font-medium">
                    {SAMPLE_MEMORIES[activeSlide].date}
                  </div>
                </div>

                <p className="font-heading font-bold text-title-sm text-[#241914] mb-1">
                  {SAMPLE_MEMORIES[activeSlide].title}
                </p>
                <p className="text-xs text-[#55443C] text-center italic leading-relaxed px-1">
                  &ldquo;{SAMPLE_MEMORIES[activeSlide].caption}&rdquo;
                </p>
              </div>

              {/* Navigasi Slide Dots & Arrows */}
              <div className="flex items-center gap-4 mt-3.5 mb-3">
                <button
                  type="button"
                  aria-label="Foto sebelumnya"
                  onClick={() =>
                    setActiveSlide((prev) => (prev > 0 ? prev - 1 : SAMPLE_MEMORIES.length - 1))
                  }
                  className="h-8 w-8 rounded-full bg-white border border-[#E6D5CB] grid place-items-center text-[#241914] hover:text-primary active:scale-95 transition-all text-xs font-bold"
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
                      className={`h-2 rounded-full transition-all ${
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
                  className="h-8 w-8 rounded-full bg-white border border-[#E6D5CB] grid place-items-center text-[#241914] hover:text-primary active:scale-95 transition-all text-xs font-bold"
                >
                  ›
                </button>
              </div>

              {/* Tombol Lanjut Antar */}
              <button
                type="button"
                onClick={closeModalAndContinue}
                className="w-full py-2.5 bg-primary hover:bg-[#E88048] text-white text-label-md font-semibold rounded-full shadow-[0_6px_20px_rgba(222,112,56,0.28)] active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Simpan &amp; Lanjut Antar</span>
                <span className="text-base font-bold">›</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal 2: Pemutar Kaset Pita Retro (Lagu Cerita) */}
        {activeModal === "lagu" && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
            <div
              data-light-card
              className="relative w-full max-w-[320px] sm:max-w-[360px] rounded-3xl bg-[#FFF9F5] p-5 sm:p-6 shadow-[0_25px_60px_rgba(36,25,20,0.3)] border border-[#E6D5CB] flex flex-col items-center"
            >
              {/* Header */}
              <div className="w-full flex justify-between items-center mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <span>🎵</span> Melodi Kenangan
                </span>
                <span className="text-xs text-[#55443C] font-mono font-semibold">
                  Side A • 03:24
                </span>
              </div>

              {/* Retro Cassette Shell */}
              <div className="w-full bg-[#2A2320] text-[#FFF9F5] p-4 rounded-2xl shadow-md border-2 border-[#4A3B32] flex flex-col items-center relative overflow-hidden">
                {/* Cassette Top Label */}
                <div className="w-full flex justify-between items-center border-b border-[#4A3B32] pb-2 mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#D9C3B5]">
                    PesanManis Tape #01
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#DE7038] text-white font-mono font-bold">
                    STEREO
                  </span>
                </div>

                {/* Cassette Center Spool Window */}
                <div className="w-full bg-[#1A1513] rounded-xl p-2.5 border border-[#3A2D26] flex items-center justify-around mb-3">
                  {/* Left Spool */}
                  <div className="w-9 h-9 rounded-full bg-[#E6D5CB] border-4 border-[#2A2320] flex items-center justify-center animate-spin [animation-duration:4s]">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2A2320]" />
                  </div>

                  {/* Tape window with equalizer bars */}
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-[#2A2320]/80 rounded border border-[#3A2D26]">
                    <span className="w-1 h-3 bg-[#DE7038] rounded-full animate-pulse" />
                    <span className="w-1 h-5 bg-[#DE7038] rounded-full animate-pulse [animation-delay:0.2s]" />
                    <span className="w-1 h-2 bg-[#DE7038] rounded-full animate-pulse [animation-delay:0.4s]" />
                    <span className="w-1 h-4 bg-[#DE7038] rounded-full animate-pulse [animation-delay:0.1s]" />
                  </div>

                  {/* Right Spool */}
                  <div className="w-9 h-9 rounded-full bg-[#E6D5CB] border-4 border-[#2A2320] flex items-center justify-center animate-spin [animation-duration:4s]">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2A2320]" />
                  </div>
                </div>

                {/* Track Title & Subtitle */}
                <p className="font-heading font-bold text-title-sm text-[#FFF9F5] text-center">
                  Melodi Teman Cerita
                </p>
                <p className="text-[11px] text-[#D9C3B5] text-center mb-1">
                  Lagu Pengiring Suasana Hati
                </p>
              </div>

              {/* Quote / Caption */}
              <p className="text-xs text-[#55443C] text-center italic leading-relaxed px-1 my-3.5">
                &ldquo;Lagu sederhana yang selalu kamu putar saat kita dalam perjalanan sore. Setiap nadanya selalu mengingatkanku pada senyummu.&rdquo;
              </p>

              {/* Tombol Lanjut Antar */}
              <button
                type="button"
                onClick={closeModalAndContinue}
                className="w-full py-2.5 bg-primary hover:bg-[#E88048] text-white text-label-md font-semibold rounded-full shadow-[0_6px_20px_rgba(222,112,56,0.28)] active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Simpan &amp; Lanjut Antar</span>
                <span className="text-base font-bold">›</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal 3: Lembaran Surat Kertas Pos (Surat Manis) */}
        {activeModal === "surat" && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-black/50 backdrop-blur-xs p-4">
            <div
              data-light-card
              className="relative w-full max-w-[320px] sm:max-w-[360px] rounded-3xl bg-[#FFF9F5] p-5 sm:p-6 shadow-[0_25px_60px_rgba(36,25,20,0.3)] border border-[#E6D5CB] flex flex-col items-center"
            >
              {/* Header */}
              <div className="w-full flex justify-between items-center mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <span>💌</span> Surat Manis
                </span>
                <span className="text-xs text-[#55443C] font-mono font-semibold">
                  Pos Kilat Hati
                </span>
              </div>

              {/* Surat Kertas Pos Vintage */}
              <div className="w-full bg-[#FFFDF9] p-4 rounded-2xl shadow-xs border-2 border-dashed border-[#E6D5CB] flex flex-col relative overflow-hidden">
                {/* Cap Pos Stempel */}
                <div className="absolute top-2.5 right-2.5 w-11 h-11 rounded-full border border-dashed border-[#DE7038]/60 flex flex-col items-center justify-center rotate-12 opacity-85 pointer-events-none">
                  <span className="text-[6.5px] font-mono font-bold text-[#DE7038] uppercase">POS HATI</span>
                  <span className="text-[10px]">❤️</span>
                  <span className="text-[5.5px] font-mono text-[#DE7038]">INDONESIA</span>
                </div>

                <p className="font-heading font-semibold text-xs text-primary mb-2">
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

              <div className="h-3.5" />

              {/* Tombol Lanjut Antar */}
              <button
                type="button"
                onClick={closeModalAndContinue}
                className="w-full py-2.5 bg-primary hover:bg-[#E88048] text-white text-label-md font-semibold rounded-full shadow-[0_6px_20px_rgba(222,112,56,0.28)] active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Simpan &amp; Lanjut Antar</span>
                <span className="text-base font-bold">›</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Bantuan PesanManis */}
        {showHelp && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-black/40 backdrop-blur-xs p-4">
            <div
              data-light-card
              className="w-full max-w-xs rounded-3xl bg-white text-[#241914] p-6 border border-[#E6D5CB] shadow-xl text-center"
            >
              <div className="w-10 h-10 rounded-full bg-[#FEF1EA] text-primary mx-auto grid place-items-center mb-3">
                <HelpCircle className="h-5 w-5" />
              </div>
              <p className="font-heading text-title-md font-bold text-[#241914] mb-2">Cara Main</p>
              <p className="text-body-sm text-[#55443C] mb-5 leading-relaxed">
                Tekan <b>← / →</b> untuk berjalan, <b>Spasi</b> untuk melompat (bisa 2x lompat ganda). Injak <b>Paket Bandel</b> dari atas, waspadai jurang, lewati lentera checkpoint, lalu antar ke penerima di akhir rute!
              </p>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="w-full py-2.5 bg-primary hover:bg-[#E88048] text-white text-label-md font-semibold rounded-full shadow-sm active:scale-95 transition-all"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}

        {/* Overlay (Idle / Jeda / Menang) */}
        {phase !== "playing" && (
          <div className="absolute inset-0 z-20 grid place-items-center p-4 bg-black/35 backdrop-blur-xs">
            <ConfettiOverlay
              active={phase === "won"}
              reduced={reduced}
              className="absolute inset-0 w-full h-full z-0"
            />
            {phase === "idle" && (
              <div
                data-light-card
                className="text-center max-w-[280px] sm:max-w-md rounded-3xl bg-white/95 backdrop-blur-md px-5 py-6 sm:px-8 sm:py-7 shadow-[0_16px_50px_rgba(36,25,20,0.18)] border border-[#E6D5CB] text-[#241914]"
              >
                <p className="font-heading text-title-md sm:text-title-lg md:text-headline-md text-primary mb-2">
                  Kurir Kado
                </p>
                <p className="text-label-md md:text-body-md font-medium text-[#55443C] mb-4 sm:mb-5">
                  Panah kiri/kanan untuk jalan, spasi untuk lompat. Di HP: tombol di bawah atau ketuk layar.
                </p>
                <button
                  type="button"
                  onClick={start}
                  disabled={!ready}
                  className="inline-flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 rounded-full bg-primary hover:bg-[#E88048] text-white font-semibold shadow-[0_6px_20px_rgba(222,112,56,0.3)] active:scale-95 transition-all disabled:opacity-60"
                >
                  {failed ? "Game gagal dimuat" : ready ? "Mulai main" : "Menyiapkan…"}
                </button>
              </div>
            )}

            {/* Pop-up saat PAUSE: Kartu Pos Hangat PesanManis */}
            {phase === "paused" && (
              <div
                data-light-card
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
                    className="w-full py-3 bg-primary hover:bg-[#E88048] text-white text-label-lg font-semibold rounded-full shadow-[0_8px_24px_rgba(222,112,56,0.28)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
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
              </div>
            )}

            {phase === "lost" && (
              <div
                data-light-card
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
                  className="inline-flex items-center justify-center gap-2 px-7 py-2.5 sm:px-8 sm:py-3 rounded-full bg-primary hover:bg-[#E88048] text-white font-semibold shadow-[0_6px_20px_rgba(222,112,56,0.3)] active:scale-95 transition-all"
                >
                  <RotateCcw className="h-4 w-4" /> Coba Lagi
                </button>
              </div>
            )}

            {phase === "won" && (
              <div
                data-light-card
                className="relative z-10 text-center max-w-[300px] sm:max-w-md rounded-3xl bg-white/95 backdrop-blur-md px-5 py-6 sm:px-8 sm:py-7 shadow-[0_16px_50px_rgba(36,25,20,0.18)] border border-[#E6D5CB] text-[#241914]"
              >
                <p className="font-heading text-title-md sm:text-title-lg md:text-headline-md text-primary mb-2">
                  Kado Sampai! 🎁
                </p>
                <p className="text-label-md md:text-body-md font-medium text-[#55443C] mb-4 sm:mb-5">
                  Begitu manisnya mengirim rasa. Sekarang buat versi aslinya untuk orang tersayangmu.
                </p>
                <div className="flex flex-col gap-2.5">
                  <Link
                    href="/templates"
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 rounded-full bg-primary hover:bg-[#E88048] text-white font-semibold shadow-[0_6px_20px_rgba(222,112,56,0.3)] active:scale-95 transition-all"
                  >
                    Buat Ucapan Sekarang <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={start}
                    className="inline-flex items-center justify-center gap-1.5 py-1 text-label-sm font-semibold text-[#55443C] hover:text-primary transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Main lagi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Kontrol Sentuh di Mobile */}
        {playing && (
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 sm:hidden z-20">
            <div className="flex gap-2">
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
      className="h-12 w-12 grid place-items-center rounded-2xl bg-white/90 backdrop-blur-md text-[#241914] border border-[#D9C3B5]/60 shadow-md active:bg-primary active:text-white active:scale-95 transition-all"
    >
      {children}
    </button>
  );
}
