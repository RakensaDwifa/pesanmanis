"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toPng } from "html-to-image";
import { Download, Share2, X, Sparkles } from "lucide-react";
import type { StoredUcapan } from "@/lib/store";
import { BRAND } from "@/lib/brand";
import { trackEvent } from "@/lib/analytics";

const CARD_W = 360;
const CARD_H = 640;

function StoryCard({ ucapan }: { ucapan: StoredUcapan }) {
  const c = ucapan;
  return (
    <div
      style={{ width: CARD_W, height: CARD_H }}
      className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#FFF1F6] via-[#FFE0EC] to-[#FFCDB8] text-[#7A2E45] shadow-2xl"
    >
      {/* decorative hearts */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <span className="absolute left-6 top-10 text-3xl">💖</span>
        <span className="absolute right-8 top-24 text-2xl">✨</span>
        <span className="absolute left-10 bottom-28 text-2xl">🌸</span>
        <span className="absolute right-12 bottom-16 text-3xl">💕</span>
      </div>

      <div className="relative z-10 flex h-full flex-col items-center px-8 py-12 text-center">
        <p className="text-[15px] font-semibold text-[#B5496B]">Untuk</p>
        <h2 className="mt-1 font-heading text-[34px] leading-tight text-[#7A2E45]">
          {c.toName}
        </h2>

        <div className="my-7 h-px w-16 bg-[#E79DB3]" />

        <p className="font-heading text-[22px] text-[#A23A5C]">{c.title}</p>
        <p className="mt-4 line-clamp-7 text-[15px] leading-relaxed text-[#7A2E45]/90 whitespace-pre-line">
          {c.message}
        </p>

        <div className="mt-auto flex flex-col items-center">
          <p className="font-heading text-[20px] italic text-[#A23A5C]">— {c.fromName}</p>
          {!c.paid && (
            <p className="mt-3 text-[12px] text-[#B5496B]/80">
              {BRAND.name} · versi gratis
            </p>
          )}
          <div className="mt-3 rounded-full bg-white/60 px-4 py-1 text-[12px] font-semibold text-[#A23A5C]">
            {BRAND.name}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoryCardButton({ ucapan }: { ucapan: StoredUcapan }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const exportPng = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    try {
      return await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
    } catch {
      return null;
    }
  };

  const onDownload = async () => {
    setBusy(true);
    const url = await exportPng();
    setBusy(false);
    if (!url) return;
    const link = document.createElement("a");
    link.download = `pesanmanis-${(ucapan.id ?? "story").slice(0, 8)}.png`;
    link.href = url;
    link.click();
    trackEvent("story_downloaded", { paid: ucapan.paid });
  };

  const onShare = async () => {
    setBusy(true);
    const url = await exportPng();
    setBusy(false);
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "pesanmanis.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
      };
      if (typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: BRAND.name, text: `Untuk ${ucapan.toName} 💌` });
        trackEvent("story_shared", { paid: ucapan.paid });
        return;
      }
    } catch {
      /* user cancel atau tidak didukung */
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buat Story Card"
        className="fixed bottom-6 left-5 z-50 flex items-center justify-center gap-2 rounded-full bg-primary text-white shadow-lg px-4 h-12 hover:scale-105 transition-transform text-label-md font-semibold"
      >
        <Sparkles className="h-5 w-5" />
        Story
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            data-lenis-prevent
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="relative flex flex-col items-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="absolute -top-3 -right-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white text-[#7A2E45] shadow-lg"
              >
                <X className="h-5 w-5" />
              </button>

              <div
                className="max-h-[78vh] overflow-hidden"
                style={{
                  transform: `scale(${Math.min(1, (typeof window !== "undefined" ? window.innerHeight : 800) * 0.74 / CARD_H)})`,
                  transformOrigin: "center",
                }}
              >
                <div ref={cardRef}>
                  <StoryCard ucapan={ucapan} />
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={onDownload}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-label-md font-semibold text-[#7A2E45] shadow-lg disabled:opacity-60"
                >
                  <Download className="h-5 w-5" />
                  Unduh PNG
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-label-md font-semibold text-white shadow-lg disabled:opacity-60"
                >
                  <Share2 className="h-5 w-5" />
                  Bagikan
                </button>
              </div>
              <p className="mt-3 text-label-sm text-white/70">Siap posting ke IG / TikTok 📲</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
