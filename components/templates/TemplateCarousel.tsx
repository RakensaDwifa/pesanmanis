"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { templateEmoji } from "@/lib/templates";
import { CATEGORY_META, type TemplateMeta } from "@/lib/types";

/**
 * Carousel koleksi template: scroll native + snap, panah ±320px,
 * dot mengikuti kartu yang paling dekat dengan titik tengah viewport.
 */
export default function TemplateCarousel({ templates }: { templates: TemplateMeta[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const syncActive = useCallback(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    // Di ujung scroll, kartu pertama/terakhir tidak bisa berada di titik tengah
    // viewport, jadi index-nya dipaksa supaya dot ikut mentok.
    const maxLeft = sc.scrollWidth - sc.clientWidth;
    if (sc.scrollLeft <= 4) {
      setActive(0);
      return;
    }
    if (sc.scrollLeft >= maxLeft - 4) {
      setActive(sc.children.length - 1);
      return;
    }
    const center = sc.scrollLeft + sc.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(sc.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const dist = Math.abs(el.offsetLeft + el.clientWidth / 2 - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(best);
  }, []);

  const scrollBy = (left: number) =>
    scrollerRef.current?.scrollBy({ left, behavior: "smooth" });

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={syncActive}
        className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar px-5 md:px-16 pb-6"
      >
        {templates.map((t) => (
          <div
            key={t.slug}
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
      </div>

      <button
        type="button"
        onClick={() => scrollBy(-320)}
        aria-label="Template sebelumnya"
        className="hidden sm:flex absolute top-1/2 -translate-y-1/2 left-2 md:left-6 z-10 h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg text-primary hover:bg-white hover:scale-105 transition-all"
      >
        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(320)}
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
