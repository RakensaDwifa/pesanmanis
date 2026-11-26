"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import StoryFlow from "@/components/story/StoryFlow";
import TemplateRenderer from "@/components/templates/registry";
import FlowerTransition, { type FlowerTransitionRef } from "@/components/effects/FlowerTransition";
import { fillContentDefaults, getTemplate } from "@/lib/templates";
import { getDefaultGalleryTrack } from "@/lib/music-library";
import { CATEGORY_META, MOCK_CONTENT } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";

export default function TemplatePreview({ slug }: { slug: string }) {
  const t = getTemplate(slug);
  // Template naratif punya alurnya sendiri, jadi StoryFlow (ketuk hati) dilewati.
  const skipStory = Boolean(t?.hasNarrative);
  const [storyDone, setStoryDone] = useState(skipStory);
  // Remount template saat "Putar ulang alur" ditekan untuk template naratif.
  const [replayKey, setReplayKey] = useState(0);
  // Konten baru dirender setelah petal menutup layar, jadi tidak ada
  // halaman yang terlihat mendahului transisi.
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const flowerRef = useRef<FlowerTransitionRef | null>(null);

  // Halaman preview: sembunyikan chrome situs + intro bunga setiap refresh.
  // Atribut di <html> diset lebih awal oleh script di app/layout.tsx; di sini
  // dijaga untuk navigasi client-side dan dibersihkan saat keluar halaman.
  useLayoutEffect(() => {
    document.documentElement.dataset.immersive = "1";
    flowerRef.current?.play(() => setReady(true));
    return () => {
      delete document.documentElement.dataset.immersive;
    };
  }, []);

  useEffect(() => {
    trackEvent("template_previewed", { template_slug: slug });
  }, [slug]);

  if (!t) return null;

  const handleBack = () => {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer &&
      document.referrer.includes(window.location.host)
    ) {
      router.back();
    } else {
      router.push("/templates");
    }
  };

  // Isi demo: nama, pesan contoh, & lagu galeri sesuai momen (bila file MP3 sudah tersedia).
  const defaultTrack = getDefaultGalleryTrack(t.type);
  const content = fillContentDefaults({
    ...MOCK_CONTENT,
    templateSlug: slug,
    ...(defaultTrack ? { musicUrl: defaultTrack.url } : {}),
  });

  return (
    <div className="relative min-h-screen bg-surface">
      <FlowerTransition ref={flowerRef} />
      {ready && !storyDone ? (
        <>
          {/* Selama alur berjalan: hanya tombol kembali */}
          <button
            type="button"
            data-light-card
            onClick={handleBack}
            aria-label="Kembali"
            className="fixed top-4 left-4 z-[80] inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur-md border border-white/60 px-3 py-2 text-label-md font-semibold text-primary shadow-sm hover:bg-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>

          <StoryFlow
            id={`${slug}-demo`}
            category={t.type}
            toName={content.toName}
            persist={false}
            onDone={() => {
              if (flowerRef.current) flowerRef.current.play(() => setStoryDone(true));
              else setStoryDone(true);
            }}
          />
        </>
      ) : ready ? (
        <>
          {/* Template asli, interaksi aslinya (klik amplop, pecah botol, dst) */}
          <div className="relative">
            <TemplateRenderer key={replayKey} content={content} />
          </div>

          {/* Bar navigasi preview */}
          <div
            data-preview-bar
            data-light-card
            className="fixed top-0 inset-x-0 z-[80] bg-gradient-to-b from-white/90 to-white/60 text-[#241914] backdrop-blur-md"
          >
            <div className="flex items-center gap-2 px-3 sm:px-5 py-3">
              <button
                type="button"
                onClick={handleBack}
                aria-label="Kembali"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-label-md font-semibold text-primary hover:bg-white/70 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Kembali</span>
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="truncate font-heading text-label-lg sm:text-title-md font-bold text-on-surface">
                  {t.name}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {CATEGORY_META[t.type].emoji} {CATEGORY_META[t.type].label}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (skipStory) {
                    setReplayKey((k) => k + 1);
                    return;
                  }
                  if (flowerRef.current) flowerRef.current.play(() => setStoryDone(false));
                  else setStoryDone(false);
                }}
                aria-label="Putar ulang alur"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-outline-variant/50 bg-white/80 px-3 py-2 text-label-md font-semibold text-on-surface-variant hover:bg-white transition"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Putar ulang</span>
              </button>

              <Link
                href={`/buat/${slug}`}
                className="shrink-0 inline-flex items-center rounded-full bg-primary px-3.5 py-2 text-label-md font-semibold text-white shadow hover:bg-primary/90 transition"
              >
                Pakai<span className="hidden sm:inline">&nbsp;Template Ini</span>
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
