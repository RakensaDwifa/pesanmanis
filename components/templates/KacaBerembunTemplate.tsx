"use client";

import { useState } from "react";
import type { TemplateRenderProps } from "@/lib/types";
import NarrativeEngine from "@/lib/narrative/NarrativeEngine";
import { KACA_BEREMBUN_MANIFEST } from "@/lib/narrative/manifests/kaca-berembun";
import { Heart, Sparkles, MapPin, Calendar } from "lucide-react";
import Image from "next/image";

/**
 * Template Kaca Berembun:
 * 5 Babak naratif bertingkat sebelum masuk ke surat utama:
 * 1. Hujan di luar jendela (cinematic)
 * 2. Usap embun kaca (scratch gesture canvas)
 * 3. Ukiran nama rahasia terungkap (cinematic)
 * 4. Tahan kehangatan (hold button)
 * 5. Langit senja & buka pesan (climax reveal)
 */
export default function KacaBerembunTemplate({
  content,
  preview = false,
}: TemplateRenderProps) {
  const [storyFinished, setStoryFinished] = useState(false);

  const toName = content.toName || "Sayang";
  const fromName = content.fromName || "Aku";
  const photos = content.photos || [];

  return (
    <div className="relative w-full min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">
      {!storyFinished ? (
        /* MODE CERITA INTERAKTIF */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
          <div className="w-full h-full max-w-md mx-auto relative flex flex-col justify-between">
            <NarrativeEngine
              chapters={KACA_BEREMBUN_MANIFEST.chapters}
              toName={toName}
              fromName={fromName}
              onFinish={() => setStoryFinished(true)}
              renderUnderlay={(chapterIdx) => (
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 overflow-hidden">
                  {/* Efek rintik hujan animasi CSS sederhana */}
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:24px_24px]" />
                  {/* Efek cahaya bokeh lampu kota di luar jendela */}
                  <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl" />
                  <div className="absolute top-1/2 -right-10 w-60 h-60 rounded-full bg-rose-500/15 blur-3xl" />
                  {chapterIdx >= 3 && (
                    <div className="absolute inset-0 bg-gradient-to-t from-amber-600/20 to-transparent transition-opacity duration-1000" />
                  )}
                </div>
              )}
            />
          </div>
        </div>
      ) : (
        /* SURAT UTAMA / CLIMAX REVEAL */
        <main className="relative z-10 max-w-md mx-auto px-5 py-12 flex flex-col items-center animate-fade-in">
          {/* Header Kartu */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Surat Setelah Hujan Reda
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-amber-100">
              {content.title || `Untuk ${toName}`}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Dari {fromName} yang selalu mengingatmu
            </p>
          </div>

          {/* Galeri Foto Momen (jika ada) */}
          {photos.length > 0 && (
            <div className="w-full mb-8">
              <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <Image
                  src={photos[0]}
                  alt="Kenangan bersama"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 420px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-xs text-white/80">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                    Momen Bersama
                  </span>
                  <span className="text-[10px] bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
                    {toName} & {fromName}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Isi Pesan Panjang */}
          <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-7 shadow-xl mb-8">
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-slate-200 leading-relaxed whitespace-pre-line font-serif">
              {content.message ||
                `Hai ${toName},\n\nTiap kali rintik hujan turun, yang pertama kali terlintas di kepalaku adalah kamu. Terima kasih sudah selalu jadi tempat pulang paling hangat di hari-hari yang dingin.\n\nSemoga kita terus melangkah berdua, apa pun cuacanya nanti.`}
            </div>

            <div className="mt-8 pt-5 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
              <span>Dengan penuh cinta,</span>
              <span className="font-heading font-semibold text-amber-200 text-sm">
                {fromName} ❤️
              </span>
            </div>
          </div>

          {/* Tombol Ulangi Cerita */}
          <button
            type="button"
            onClick={() => setStoryFinished(false)}
            className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-4 py-2"
          >
            ← Putar ulang alur cerita
          </button>
        </main>
      )}
    </div>
  );
}
