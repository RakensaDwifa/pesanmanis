"use client";

import { useState } from "react";
import type { TemplateRenderProps } from "@/lib/types";
import NarrativeEngine from "@/lib/narrative/NarrativeEngine";
import { BONCENG_MALAM_MANIFEST } from "@/lib/narrative/manifests/bonceng-malam";
import { useNightRideAudio } from "@/lib/narrative/useNightRideAudio";
import BoncengMalamArtwork, { type RideState } from "./BoncengMalamArtwork";
import BoncengMalamInteractive from "./BoncengMalamInteractive";
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
 * Template Bonceng Malam (Art Direction: Lo-Fi Neon Noir)
 * - Visual: BoncengMalamArtwork (Inline SVG modular 5-layer, skuter retro, pengendara berjaket, helm berlabel toName, jok mawar)
 * - Viewport: h-dvh w-full max-w-md mx-auto (100% mobile-first, no overflow)
 * - Audio: Web Audio API synth murni (snap, clack, engine hum, chime) + musicUrl BGM controller
 * - Micro-interactions: Visor tint turun, ghost affordance slider, polaroid gallery modal, surat glassmorphism
 */
export default function BoncengMalamTemplate({
  content,
  preview = false,
}: TemplateRenderProps) {
  const [storyFinished, setStoryFinished] = useState(false);
  const [rideProgress, setRideProgress] = useState(0);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);

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

  // Tentukan status rideState, status helm, dan visor berdasarkan alur babak
  let rideState: RideState = "parked";
  let helmetLocked = false;
  let visorDown = false;

  if (storyFinished) {
    rideState = "seat-open";
    helmetLocked = true;
    visorDown = true;
  } else if (currentChapterIdx === 0) {
    // Babak 0: Intro terparkir
    rideState = "parked";
    helmetLocked = false;
    visorDown = false;
  } else if (currentChapterIdx === 1) {
    // Babak 1: Pasang helm (sedang proses kunci)
    rideState = "parked";
    helmetLocked = false;
    visorDown = false;
  } else if (currentChapterIdx === 2) {
    // Babak 2: Visor kaca ditutup
    rideState = "parked";
    helmetLocked = true;
    visorDown = true;
  } else if (currentChapterIdx === 3) {
    // Babak 3: Night Ride melaju menembus lampu
    rideState = rideProgress > 65 ? "fast" : "cruising";
    helmetLocked = true;
    visorDown = true;
  } else if (currentChapterIdx >= 4) {
    // Babak 4: Tiba di bukit & buka jok motor
    rideState = "seat-open";
    helmetLocked = true;
    visorDown = true;
  }

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
        /* MODE CERITA INTERAKTIF (5 BABAK)                             */
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
              // Simpan chapter index ke state untuk sinkronisasi artwork
              if (chapterIdx !== currentChapterIdx) {
                setCurrentChapterIdx(chapterIdx);
                if (chapterIdx === 2) playVisorClack();
                if (chapterIdx === 1) playHelmetSnap();
              }

              return (
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Karya Seni Inline SVG Terpadu */}
                  <BoncengMalamArtwork
                    pov={chapterIdx === 0}
                    rideState={rideState}
                    helmetLocked={helmetLocked}
                    visorDown={visorDown}
                    receiverLabel={toName}
                    lampIndex={activeLampIndex}
                    lampNote={streetNotes[activeLampIndex]}
                  />

                  {/* Layer Interaktif Fisik per Babak */}
                  <div className="absolute inset-0 pointer-events-auto z-10">
                    <BoncengMalamInteractive
                      chapterIdx={chapterIdx}
                      toName={toName}
                      fromName={fromName}
                      rideProgress={rideProgress}
                      isVisorDown={visorDown}
                    />
                  </div>

                  {/* Catatan / Teks Narasi Lampu Kota Khusus Babak 3 */}
                  {chapterIdx === 3 && rideProgress > 0 && (
                    <div className="absolute top-20 inset-x-4 flex flex-col items-center pointer-events-none z-20 animate-fade-in">
                      <span className="text-[11px] font-mono tracking-wider text-amber-300 bg-black/75 px-3 py-1 rounded-full border border-amber-400/40 shadow-lg backdrop-blur-md">
                        Lampu {activeLampIndex + 1} dari 5
                      </span>
                      <p className="text-xs text-amber-100 font-medium mt-1.5 text-center drop-shadow-md italic max-w-xs">
                        &quot;{streetNotes[activeLampIndex]}&quot;
                      </p>
                    </div>
                  )}

                  {/* Efek Visor Tint Turun (Khusus Babak 2) */}
                  {chapterIdx === 2 && (
                    <div className="absolute inset-0 bg-blue-950/25 backdrop-blur-[0.5px] border-b-4 border-cyan-400/30 transition-all duration-700 pointer-events-none" />
                  )}
                </div>
              );
            }}
          />

          {/* Trigger audio unlock saat user pertama kali berinteraksi */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            onPointerDown={unlockAudio}
          />
        </div>
      ) : (
        /* ============================================================ */
        /* BABAK 5: SURAT UTAMA & KLIMAKS (REVEAL JOK MOTOR)            */
        /* ============================================================ */
        <main className="relative z-10 w-full h-full overflow-y-auto px-5 py-8 flex flex-col items-center animate-fade-in">
          {/* Latar Parallax Jok Terbuka */}
          <div className="fixed inset-0 z-0 pointer-events-none">
            <BoncengMalamArtwork
              rideState="seat-open"
              helmetLocked={true}
              visorDown={true}
              receiverLabel={toName}
            />
            <div className="absolute inset-0 bg-[#070B19]/85" />
          </div>

          <div className="relative z-10 w-full max-w-sm flex flex-col items-center my-auto">
            {/* Header Surat */}
            <div className="text-center mb-5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold tracking-wider uppercase mb-2 shadow-sm">
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

            {/* Galeri Foto Kenangan Polaroid (Jika Ada) */}
            {photos.length > 0 ? (
              <div className="w-full mb-5">
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

                  {/* Navigasi Carousel Foto */}
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
              /* Kado Mawar di Balik Jok (Jika Tanpa Foto) */
              <div className="w-full mb-5 p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-[#1E1914] to-rose-500/15 border border-amber-500/30 text-center flex flex-col items-center gap-1.5 shadow-2xl backdrop-blur-md">
                <span className="text-3xl">🌹</span>
                <span className="font-heading font-semibold text-amber-200 text-sm">
                  Mawar Rahasia di Balik Jok
                </span>
                <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                  Sengaja disiapin sebelum jemput kamu buat keliling malam ini.
                </p>
              </div>
            )}

            {/* Kotak Surat Glassmorphism Tenang */}
            <div className="w-full bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl mb-5">
              <div className="max-h-56 overflow-y-auto pr-1 prose prose-invert prose-sm text-slate-200 leading-relaxed whitespace-pre-line font-serif text-sm">
                {content.message ||
                  `Hai ${toName},\n\nTerima kasih sudah mau diajak keliling malam ini, nemenin menembus angin dingin kota sambil peluk erat di belakang jaket.\n\nSetiap jalan yang kita lewati berasa lebih tenang kalau ada kamu. Mau ke mana pun tujuannya, selama boncengannya sama kamu, aku selalu bahagia.\n\nJangan pernah bosan jadi teman perjalananku ya.`}
              </div>

              <div className="mt-5 pt-3.5 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
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
                setCurrentChapterIdx(0);
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
