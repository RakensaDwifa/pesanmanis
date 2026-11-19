"use client";

import { useState } from "react";
import type { TemplateRenderProps } from "@/lib/types";
import NarrativeEngine from "@/lib/narrative/NarrativeEngine";
import { BONCENG_MALAM_MANIFEST } from "@/lib/narrative/manifests/bonceng-malam";
import { Heart, Sparkles } from "lucide-react";
import Image from "next/image";

/**
 * Template Bonceng Malam:
 * 1. Pasang tali helm (drag kunci ke slot kanan)
 * 2. Visor kaca helm turun (tap untuk naikkan)
 * 3. Night ride menembus lampu jalan kota (hold pegangan erat + lampu kota bergulir)
 * 4. Berhenti di tepi bukit / pengantar buka jok
 * 5. Jok motor terbuka (buket mawar digital + surat malam romantis)
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

  // Hitung indeks lampu kota (0 sampai 4) berdasarkan rideProgress (0-100)
  const activeLampIndex = Math.min(4, Math.floor((rideProgress / 100) * 5));

  const streetNotes = [
    "Angin malamnya sejuk banget...",
    "Lampu jalanan kota kuning hangat...",
    "Nyaman banget di boncengan berdua...",
    "Kota ini terasa pelan kalau sama kamu...",
    "Dan akhirnya kita sampai...",
  ];

  return (
    <div className="relative w-full min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">
      {!storyFinished ? (
        /* MODE CERITA INTERAKTIF */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
          <div className="w-full h-full max-w-md mx-auto relative flex flex-col justify-between">
            <NarrativeEngine
              chapters={BONCENG_MALAM_MANIFEST.chapters}
              toName={toName}
              fromName={fromName}
              onHoldProgress={(p) => setRideProgress(p)}
              onFinish={() => setStoryFinished(true)}
              renderUnderlay={(chapterIdx) => (
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/40 overflow-hidden">
                  {/* Langit malam bertabur bintang */}
                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:28px_28px]" />

                  {/* Efek visual khusus Babak 3 (Night Ride melaju) */}
                  {chapterIdx === 2 && (
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      {/* Tiang & Cahaya Lampu Jalan Hangat */}
                      <div className="relative w-full h-48 flex justify-center items-start pt-6">
                        <div
                          className="w-40 h-40 rounded-full bg-amber-400/25 blur-3xl transition-transform duration-300"
                          style={{
                            transform: `scale(${1 + (rideProgress % 25) / 50})`,
                          }}
                        />
                        <div className="absolute top-10 flex flex-col items-center">
                          <span className="text-3xl">💡</span>
                          <span className="text-[11px] font-mono tracking-wider text-amber-300/80 bg-black/60 px-2.5 py-0.5 rounded-full mt-2 border border-amber-400/30">
                            Lampu {activeLampIndex + 1} dari 5
                          </span>
                          <span className="text-xs text-amber-100 font-medium mt-1 animate-fade-in drop-shadow">
                            &quot;{streetNotes[activeLampIndex]}&quot;
                          </span>
                        </div>
                      </div>

                      {/* Siluet Jalan Raya & Motor Skuter */}
                      <div className="relative w-full pb-8 flex flex-col items-center">
                        <div className="text-4xl animate-bounce">🛵💨</div>
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent mt-2" />
                      </div>
                    </div>
                  )}

                  {/* Siluet silau lampu kota */}
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
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
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Dari Dalam Jok Motor
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-amber-100">
              {content.title || `Untuk ${toName}`}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
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
            <div className="w-full mb-6 p-6 rounded-2xl bg-gradient-to-br from-amber-500/15 to-rose-500/10 border border-amber-500/20 text-center flex flex-col items-center gap-2">
              <span className="text-5xl">💐</span>
              <span className="font-heading font-semibold text-amber-200 text-sm">
                Buket Mawar Tersembunyi
              </span>
              <p className="text-xs text-slate-300">
                Sengaja disiapin dari rumah sebelum jemput kamu malam ini.
              </p>
            </div>
          )}

          {/* Isi Surat Cinta Panjang */}
          <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-7 shadow-xl mb-8">
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
