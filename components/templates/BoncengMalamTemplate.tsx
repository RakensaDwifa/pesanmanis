"use client";

import { useState } from "react";
import type { TemplateRenderProps } from "@/lib/types";
import NarrativeEngine from "@/lib/narrative/NarrativeEngine";
import { BONCENG_MALAM_MANIFEST } from "@/lib/narrative/manifests/bonceng-malam";
import {
  RetroHelmetSVG,
  RetroScooterSVG,
  StreetLampSVG,
  FlowerBouquetSVG,
} from "./narrative-assets";
import { Heart, Sparkles, Navigation } from "lucide-react";
import Image from "next/image";

/**
 * Template Bonceng Malam:
 * Visual SVG custom: Helm retro, skuter vintage, tiang lampu jalan kota, dan buket mawar.
 */
export default function BoncengMalamTemplate({
  content,
  preview = false,
}: TemplateRenderProps) {
  const [storyFinished, setStoryFinished] = useState(false);
  const [rideProgress, setRideProgress] = useState(0);

  const toName = content.toName || "Sayang";
  const fromName = content.fromName || "Aku";
  const photos = content.photos || [];

  const activeLampIndex = Math.min(4, Math.floor((rideProgress / 100) * 5));

  const streetNotes = [
    "Angin malamnya sejuk banget...",
    "Lampu jalanan kota kuning hangat...",
    "Nyaman banget di boncengan berdua...",
    "Kota ini terasa pelan kalau sama kamu...",
    "Dan akhirnya kita sampai...",
  ];

  return (
    <div className="relative w-full min-h-screen bg-[#090D16] text-white font-sans overflow-x-hidden selection:bg-amber-500/30">
      {!storyFinished ? (
        /* MODE CERITA INTERAKTIF */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090D16]">
          <div className="w-full h-full max-w-md mx-auto relative flex flex-col justify-between">
            <NarrativeEngine
              chapters={BONCENG_MALAM_MANIFEST.chapters}
              toName={toName}
              fromName={fromName}
              onHoldProgress={(p) => setRideProgress(p)}
              onFinish={() => setStoryFinished(true)}
              renderUnderlay={(chapterIdx) => (
                <div className="absolute inset-0 bg-gradient-to-b from-[#090D16] via-[#0E1526] to-[#18120B] overflow-hidden">
                  {/* Langit malam bertabur bintang & partikel halus */}
                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:26px_26px]" />

                  {/* Babak 1: Ilustrasi Helm Bogo Menunggu Dikunci */}
                  {chapterIdx === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-85 -translate-y-20">
                      <div className="relative animate-bounce">
                        <RetroHelmetSVG visorOpen={false} className="w-32 h-32 drop-shadow-[0_12px_24px_rgba(245,158,11,0.25)]" />
                      </div>
                    </div>
                  )}

                  {/* Babak 2: Visor Helm Turun (Interaktif Naik Kaca) */}
                  {chapterIdx === 1 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-90 -translate-y-20">
                      <div className="relative">
                        <RetroHelmetSVG visorOpen={true} className="w-32 h-32 drop-shadow-[0_12px_24px_rgba(56,189,248,0.25)]" />
                      </div>
                    </div>
                  )}

                  {/* Babak 3: Night Ride Melaju di Bawah Lampu Jalan */}
                  {chapterIdx === 2 && (
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      {/* Tiang Lampu Jalan Kota Berjalan */}
                      <div className="relative w-full h-56 flex justify-center items-start pt-4 overflow-hidden">
                        <div
                          className="w-52 h-52 rounded-full bg-amber-400/20 blur-3xl transition-transform duration-300"
                          style={{
                            transform: `scale(${1 + (rideProgress % 25) / 40})`,
                          }}
                        />
                        <div className="absolute top-4 flex flex-col items-center">
                          <StreetLampSVG className="w-20 h-28 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
                          <span className="text-[11px] font-mono tracking-wider text-amber-300 bg-black/70 px-3 py-1 rounded-full border border-amber-400/40 shadow-lg mt-1">
                            Lampu {activeLampIndex + 1} dari 5
                          </span>
                          <span className="text-xs text-amber-100 font-medium mt-1.5 animate-fade-in drop-shadow italic">
                            &quot;{streetNotes[activeLampIndex]}&quot;
                          </span>
                        </div>
                      </div>

                      {/* Skuter Retro Vintage Melaju di Jalanan */}
                      <div className="relative w-full pb-10 flex flex-col items-center">
                        <div className="relative animate-pulse">
                          <RetroScooterSVG className="w-40 h-24 drop-shadow-[0_10px_20px_rgba(245,158,11,0.3)]" />
                        </div>
                        {/* Garis Jalanan Kota Aspal */}
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent mt-1" />
                        <div className="flex gap-4 mt-1 opacity-50">
                          <span className="w-8 h-0.5 bg-amber-200" />
                          <span className="w-8 h-0.5 bg-amber-200" />
                          <span className="w-8 h-0.5 bg-amber-200" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Siluet cahaya ambient kota di kejauhan */}
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
                </div>
              )}
            />
          </div>
        </div>
      ) : (
        /* SURAT UTAMA / REVEAL JOK MOTOR */
        <main className="relative z-10 max-w-md mx-auto px-5 py-12 flex flex-col items-center animate-fade-in">
          {/* Header Kartu */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide uppercase mb-3 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Dari Dalam Jok Motor
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-amber-100 tracking-tight">
              {content.title || `Untuk ${toName}`}
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center justify-center gap-1">
              <Navigation className="w-3 h-3 text-amber-400" />
              Dari {fromName} teman boncengan selamanya
            </p>
          </div>

          {/* Buket Mawar / Foto Kenangan */}
          {photos.length > 0 ? (
            <div className="w-full mb-8">
              <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <Image
                  src={photos[0]}
                  alt="Kenangan berdua"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 420px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-xs text-white/80">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                    Momen Malam Berdua
                  </span>
                  <span className="text-[10px] bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full">
                    {toName} & {fromName}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full mb-8 p-7 rounded-2xl bg-gradient-to-br from-amber-500/15 via-[#1E1914] to-rose-500/10 border border-amber-500/30 text-center flex flex-col items-center gap-3 shadow-xl backdrop-blur-md">
              <FlowerBouquetSVG className="w-24 h-24 drop-shadow-[0_8px_16px_rgba(225,29,72,0.3)] animate-pulse" />
              <div className="flex flex-col gap-1 mt-1">
                <span className="font-heading font-semibold text-amber-200 text-base">
                  Buket Mawar Tersembunyi
                </span>
                <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                  Sengaja disiapin dari rumah sebelum jemput kamu malam ini.
                </p>
              </div>
            </div>
          )}

          {/* Isi Surat Cinta Panjang */}
          <div className="w-full bg-[#0E1526]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl mb-8">
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-slate-200 leading-relaxed whitespace-pre-line font-serif">
              {content.message ||
                `Hai ${toName},\n\nTerima kasih sudah mau diajak keliling malam ini, nemenin menembus angin dingin kota sambil peluk erat di belakang jaket.\n\nSetiap jalan yang kita lewati berasa lebih tenang kalau ada kamu. Mau ke mana pun tujuannya, selama boncengannya sama kamu, aku selalu bahagia.\n\nJangan pernah bosan jadi teman perjalananku ya.`}
            </div>

            <div className="mt-8 pt-5 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
              <span>Sampai ketemu di perjalanan berikutnya,</span>
              <span className="font-heading font-semibold text-amber-200 text-sm">
                {fromName} 🛵❤️
              </span>
            </div>
          </div>

          {/* Tombol Ulangi Cerita */}
          <button
            type="button"
            onClick={() => {
              setStoryFinished(false);
              setRideProgress(0);
            }}
            className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-4 py-2"
          >
            ← Putar ulang perjalanan malam
          </button>
        </main>
      )}
    </div>
  );
}
