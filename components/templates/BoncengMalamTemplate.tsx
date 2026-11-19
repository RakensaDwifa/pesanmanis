"use client";

import { useState, useEffect } from "react";
import type { TemplateRenderProps } from "@/lib/types";
import NarrativeEngine from "@/lib/narrative/NarrativeEngine";
import { BONCENG_MALAM_MANIFEST } from "@/lib/narrative/manifests/bonceng-malam";
import { useNightRideAudio } from "@/lib/narrative/useNightRideAudio";
import NightParallaxScene from "./NightParallaxScene";
import {
  RetroHelmetSVG,
  FlowerBouquetSVG,
} from "./narrative-assets";
import {
  Heart,
  Sparkles,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  Navigation,
} from "lucide-react";
import Image from "next/image";

/**
 * Template Bonceng Malam (Redesign Lo-Fi Neon Noir)
 * - Viewport: h-dvh w-full max-w-md mx-auto (100% mobile-first)
 * - Audio: Web Audio API synth murni (snap, clack, engine hum, chime) + musicUrl BGM controller
 * - Parallax: 5-layer CSS translate3d hardware accelerated
 * - Micro-interactions: Visor tint turun, ghost affordance slider, polaroid gallery modal, surat glassmorphism
 */
export default function BoncengMalamTemplate({
  content,
  preview = false,
}: TemplateRenderProps) {
  const [storyFinished, setStoryFinished] = useState(false);
  const [rideProgress, setRideProgress] = useState(0);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [visorDown, setVisorDown] = useState(false);

  const toName = content.toName || "Sayang";
  const fromName = content.fromName || "Aku";
  const photos = content.photos || [];

  const {
    isMuted,
    unlockAudio,
    toggleMute,
    playHelmetSnap,
    playVisorClack,
    startEngineHum,
    updateEngineSpeed,
    stopEngineHum,
    playFlowerChime,
  } = useNightRideAudio(content.musicUrl, preview);

  const activeLampIndex = Math.min(4, Math.floor((rideProgress / 100) * 5));

  const streetNotes = [
    "Angin malamnya sejuk banget...",
    "Lampu jalanan kota kuning hangat...",
    "Nyaman banget di boncengan berdua...",
    "Kota ini terasa pelan kalau sama kamu...",
    "Dan akhirnya kita sampai di tepi bukit...",
  ];

  // Efek visor kaca helm turun di babak 2
  useEffect(() => {
    if (visorDown) {
      playVisorClack();
    }
  }, [visorDown, playVisorClack]);

  return (
    <div className="relative w-full h-dvh max-w-md mx-auto overflow-hidden bg-[#070B19] text-slate-100 font-sans select-none">
      {/* Top Bar Floating: Mute Toggle */}
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Bunyikan Audio" : "Bisukan Audio"}
          className="w-8 h-8 rounded-full bg-slate-900/75 border border-white/20 backdrop-blur-md flex items-center justify-center text-amber-200 hover:text-white transition-colors shadow-lg active:scale-95"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {!storyFinished ? (
        /* ============================================================ */
        /* MODE CERITA INTERAKTIF (5-6 BABAK)                           */
        /* ============================================================ */
        <div className="relative w-full h-full flex flex-col justify-between">
          <NarrativeEngine
            chapters={BONCENG_MALAM_MANIFEST.chapters}
            toName={toName}
            fromName={fromName}
            onHoldProgress={(progress) => {
              setRideProgress(progress);
              if (progress > 0) {
                startEngineHum();
                updateEngineSpeed(progress);
              } else {
                stopEngineHum();
              }
            }}
            onFinish={() => {
              stopEngineHum();
              playFlowerChime();
              setStoryFinished(true);
            }}
            renderUnderlay={(chapterIdx) => {
              // Babak 0: Intro terparkir (speed 0)
              // Babak 1: Pasang helm (speed 0)
              // Babak 2: Visor turun (speed 0)
              // Babak 3: Night ride melaju (speed sesuai progress hold)
              // Babak 4: Berhenti di tepi bukit (speed 0)
              const isRidingChapter = chapterIdx === 3;
              const currentSpeed = isRidingChapter
                ? Math.max(0.8, (rideProgress / 100) * 2.2)
                : 0;

              return (
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Parallax 5 Layer */}
                  <NightParallaxScene
                    speedMultiplier={currentSpeed}
                    activeLampIndex={activeLampIndex}
                    streetNote={streetNotes[activeLampIndex]}
                    showRider={chapterIdx >= 1}
                  />

                  {/* Efek Visor Tint Turun (Khusus Babak 2 ke atas) */}
                  {chapterIdx === 2 && (
                    <div className="absolute inset-0 bg-blue-950/30 backdrop-blur-[0.5px] border-b-8 border-cyan-400/30 transition-all duration-700 pointer-events-none" />
                  )}

                  {/* Visual SVG Helm saat babak pasang helm */}
                  {chapterIdx === 1 && (
                    <div className="absolute inset-0 flex items-center justify-center -translate-y-20 pointer-events-none">
                      <div className="relative animate-bounce">
                        <RetroHelmetSVG visorOpen={false} className="w-32 h-32 drop-shadow-[0_12px_24px_rgba(251,191,36,0.25)]" />
                      </div>
                    </div>
                  )}

                  {/* Visual SVG Helm saat babak tutup visor */}
                  {chapterIdx === 2 && (
                    <div className="absolute inset-0 flex items-center justify-center -translate-y-20 pointer-events-none">
                      <div className="relative">
                        <RetroHelmetSVG visorOpen={true} className="w-32 h-32 drop-shadow-[0_12px_24px_rgba(56,189,248,0.3)]" />
                      </div>
                    </div>
                  )}
                </div>
              );
            }}
          />

          {/* Trigger audio unlock saat user pertama kali menyentuh layar */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            onPointerDown={unlockAudio}
          />
        </div>
      ) : (
        /* ============================================================ */
        /* BABAK 5: SURAT UTAMA & KLIMAKS (REVEAL JOK MOTOR)            */
        /* ============================================================ */
        <main className="relative z-10 w-full h-full overflow-y-auto px-5 py-10 flex flex-col items-center animate-fade-in">
          {/* Latar Parallax Statis Senyap */}
          <div className="fixed inset-0 z-0 pointer-events-none">
            <NightParallaxScene speedMultiplier={0} showRider={false} />
            <div className="absolute inset-0 bg-[#070B19]/80 backdrop-blur-sm" />
          </div>

          <div className="relative z-10 w-full max-w-sm flex flex-col items-center my-auto">
            {/* Header Surat */}
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold tracking-wider uppercase mb-2.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                Dari Dalam Jok Motor
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-amber-100 tracking-tight">
                {content.title || `Untuk ${toName}`}
              </h1>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                <Navigation className="w-3 h-3 text-amber-400" />
                Dari {fromName} teman boncenganmu
              </p>
            </div>

            {/* Mawar Rahasia / Galeri Foto Kenangan Polaroid */}
            {photos.length > 0 ? (
              <div className="w-full mb-6">
                <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-slate-900/80">
                  <Image
                    src={photos[activePhotoIdx]}
                    alt={`Momen kenangan ${activePhotoIdx + 1}`}
                    fill
                    className="object-cover transition-opacity duration-300"
                    sizes="(max-width: 768px) 100vw, 380px"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />

                  {/* Navigasi Carousel Foto jika lebih dari 1 */}
                  {photos.length > 1 && (
                    <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-auto">
                      <button
                        type="button"
                        onClick={() =>
                          setActivePhotoIdx((prev) =>
                            prev === 0 ? photos.length - 1 : prev - 1
                          )
                        }
                        className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/90 hover:bg-black/80 transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActivePhotoIdx((prev) =>
                            prev === photos.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/90 hover:bg-black/80 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center text-xs text-white/90">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                      Momen Berdua
                    </span>
                    <span className="text-[10px] bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10">
                      {activePhotoIdx + 1} / {photos.length}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Ilustrasi Mawar Rahasia jika tidak ada foto */
              <div className="w-full mb-6 p-6 rounded-2xl bg-gradient-to-br from-amber-500/15 via-[#1E1914] to-rose-500/15 border border-amber-500/30 text-center flex flex-col items-center gap-2 shadow-2xl backdrop-blur-md">
                <FlowerBouquetSVG className="w-24 h-24 drop-shadow-[0_8px_16px_rgba(244,63,94,0.35)]" />
                <span className="font-heading font-semibold text-amber-200 text-sm mt-1">
                  Mawar Rahasia di Balik Jok
                </span>
                <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                  Sengaja disiapin sebelum jemput kamu buat keliling malam ini.
                </p>
              </div>
            )}

            {/* Kotak Surat Glassmorphism Tenang */}
            <div className="w-full bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl mb-6">
              <div className="max-h-60 overflow-y-auto pr-1 prose prose-invert prose-sm text-slate-200 leading-relaxed whitespace-pre-line font-serif text-sm">
                {content.message ||
                  `Hai ${toName},\n\nTerima kasih sudah mau diajak keliling malam ini, nemenin menembus angin dingin kota sambil peluk erat di belakang jaket.\n\nSetiap jalan yang kita lewati berasa lebih tenang kalau ada kamu. Mau ke mana pun tujuannya, selama boncengannya sama kamu, aku selalu bahagia.\n\nJangan pernah bosan jadi teman perjalananku ya.`}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
                <span>Sampai jumpa di jalan berikutnya,</span>
                <span className="font-heading font-semibold text-amber-200 text-sm">
                  {fromName} 🛵❤️
                </span>
              </div>
            </div>

            {/* Tombol Ulangi Perjalanan */}
            <button
              type="button"
              onClick={() => {
                setStoryFinished(false);
                setRideProgress(0);
                setVisorDown(false);
                stopEngineHum();
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-4 py-2"
            >
              ← Putar ulang perjalanan malam
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
