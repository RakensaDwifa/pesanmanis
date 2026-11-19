"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { templateEmoji } from "@/lib/templates";
import { CATEGORY_META, type TemplateMeta } from "@/lib/types";

/**
 * Carousel koleksi template: scroll native + snap, panah geser satu kartu
 * (dot ikut maju/mundur satu), kartu berhenti tepat di tengah viewport.
 */
export default function TemplateCarousel({ templates }: { templates: TemplateMeta[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Target index yang sedang dianimasikan (biar klik cepat tetap maju 1 kartu).
  const pendingRef = useRef<number | null>(null);
  const [active, setActive] = useState(0);
  // Ruang kosong kiri & kanan sebesar (viewport - kartu) / 2 supaya kartu
  // pertama dan terakhir juga bisa berhenti tepat di tengah.
  const [side, setSide] = useState(0);

  // Posisi kartu relatif kiri scroller.
  const cardLeft = (sc: HTMLElement, el: HTMLElement) => el.offsetLeft - sc.offsetLeft;
  const cardCenter = (sc: HTMLElement, el: HTMLElement) =>
    cardLeft(sc, el) + el.clientWidth / 2;
  const cards = (sc: HTMLElement) =>
    Array.from(sc.querySelectorAll<HTMLElement>("[data-card]"));

  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const measure = () => {
      const first = cards(sc)[0];
      if (!first) return;
      // Minus gap: ada jarak antar-flex-item sebelum kartu pertama.
      const gap = parseFloat(getComputedStyle(sc).columnGap) || 0;
      setSide(Math.max(0, (sc.clientWidth - first.clientWidth) / 2 - gap));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sc);
    return () => ro.disconnect();
  }, [templates]);

  // Index kartu yang paling dekat dengan titik tengah viewport.
  const activeIndex = useCallback(() => {
    const sc = scrollerRef.current;
    if (!sc) return 0;
    const list = cards(sc);
    if (!list.length) return 0;
    const center = sc.scrollLeft + sc.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    list.forEach((el, i) => {
      const dist = Math.abs(cardCenter(sc, el) - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }, []);

  const syncActive = useCallback(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    setActive(activeIndex());
    // Lepas target geseran sekali posisinya sudah tercapai, supaya klik
    // berikutnya mulai dari kartu yang benar.
    if (pendingRef.current !== null) {
      const el = cards(sc)[pendingRef.current];
      if (!el) {
        pendingRef.current = null;
        return;
      }
      // Lepas target geseran sekali kartunya sudah tepat di tengah, supaya
      // klik berikutnya mulai dari kartu yang benar.
      const mid = sc.scrollLeft + sc.clientWidth / 2;
      if (Math.abs(cardCenter(sc, el) - mid) < 4) pendingRef.current = null;
    }
  }, [activeIndex]);

  // Geser tepat satu kartu, berhenti dengan kartu target di tengah.
  const step = (dir: 1 | -1) => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const list = cards(sc);
    if (!list.length) return;
    const base = pendingRef.current ?? activeIndex();
    const target = Math.min(list.length - 1, Math.max(0, base + dir));
    const el = list[target];
    if (!el) return;
    pendingRef.current = target;
    setActive(target);
    sc.scrollTo({
      left: cardCenter(sc, el) - sc.clientWidth / 2,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={syncActive}
        className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pb-6"
      >
        <div aria-hidden="true" className="shrink-0" style={{ width: side }} />
        {templates.map((t) => (
          <div
            key={t.slug}
            data-card
            className="snap-center shrink-0 w-[220px] sm:w-[260px] bg-white rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden hover:-translate-y-2 transition-transform duration-300 flex flex-col"
          >
            <Link
              href={`/preview/${t.slug}`}
              aria-label={`Lihat Template ${t.name}`}
              className="relative m-3 mb-0 block aspect-[9/16] rounded-xl overflow-hidden bg-surface-container-low"
            >
              {/* Fallback kalau screenshot belum ada: gradient + emoji */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${t.gradient} flex items-center justify-center text-6xl`}
              >
                {templateEmoji(t.slug)}
              </div>
              <Image
                src={`/templates/${t.slug}.png`}
                alt={t.name}
                width={390}
                height={780}
                sizes="(min-width: 640px) 260px, 220px"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </Link>

            <div className="px-3 pb-3 pt-2.5 text-center flex-1 flex flex-col gap-2">
              <h3 className="font-heading text-title-md text-on-surface">{t.name}</h3>
              <p className="text-xs text-on-surface-variant">
                {CATEGORY_META[t.type].emoji} {CATEGORY_META[t.type].label}
              </p>
              <Link
                href={`/preview/${t.slug}`}
                className="mt-auto block w-full rounded-full bg-primary py-2 text-label-md font-semibold text-white hover:bg-primary/90 transition"
              >
                Lihat Template
              </Link>
              <Link
                href={`/buat/${t.slug}`}
                className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition"
              >
                Buat sekarang
              </Link>
            </div>
          </div>
        ))}
        {/* Spacer: beri ruang supaya kartu terakhir bisa berhenti di tengah */}
        <div aria-hidden="true" className="shrink-0" style={{ width: side }} />
      </div>

      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Template sebelumnya"
        className="hidden sm:flex absolute top-1/2 -translate-y-1/2 left-2 md:left-6 z-10 h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg text-primary hover:bg-white hover:scale-105 transition-all"
      >
        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Template berikutnya"
        className="hidden sm:flex absolute top-1/2 -translate-y-1/2 right-2 md:right-6 z-10 h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg text-primary hover:bg-white hover:scale-105 transition-all"
      >
        <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
      </button>

      <div className="flex justify-center gap-1.5 mt-1">
        {templates.map((t, i) => (
          <span
            key={t.slug}
            aria-hidden="true"
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              i === active ? "bg-primary" : "bg-primary/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
