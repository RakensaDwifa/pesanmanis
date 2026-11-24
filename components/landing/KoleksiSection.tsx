"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Cake, Heart, MessageCircleHeart, Sparkles } from "lucide-react";
import TemplateCarousel, {
  type TemplateCarouselHandle,
} from "@/components/templates/TemplateCarousel";
import {
  CATEGORY_META,
  type TemplateCategory,
  type TemplateMeta,
} from "@/lib/types";

const CATEGORY_ICONS: Record<
  TemplateCategory,
  React.ComponentType<{ className?: string }>
> = {
  "ungkapan-sayang": Heart,
  birthday: Cake,
  anniversary: Sparkles,
  "permintaan-maaf": MessageCircleHeart,
};

export default function KoleksiSection({
  templates,
}: {
  templates: TemplateMeta[];
}) {
  const carouselRef = useRef<TemplateCarouselHandle | null>(null);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>(
    templates[0]?.type ?? "ungkapan-sayang"
  );

  const handleCategoryClick = (category: TemplateCategory) => {
    setActiveCategory(category);
    const idx = templates.findIndex((t) => t.type === category);
    if (idx >= 0) {
      carouselRef.current?.jumpTo(idx);
    }
  };

  const handleActiveIndexChange = useCallback(
    (index: number) => {
      const active = templates[index];
      if (active) {
        setActiveCategory(active.type);
      }
    },
    [templates]
  );

  const activeCategoryLabel = CATEGORY_META[activeCategory]?.label;

  return (
    <section
      className="w-full relative bg-surface-container-low overflow-hidden"
      id="koleksi"
    >
      <div className="relative z-[1] py-16 md:py-24">
        <div className="px-5 md:px-16 max-w-[1200px] mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <div>
              <h2 className="font-heading text-headline-md md:text-headline-lg text-primary mb-2">
                Pilih Vibes-nya, Sesuaikan Ceritanya
              </h2>
              <p className="text-body-md md:text-body-lg font-medium text-on-surface-variant max-w-xl">
                Setiap template punya karakter berbeda — klik kategori atau putar untuk melihat semuanya.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/templates?kategori=${activeCategory}`}
                className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors"
              >
                Kategori {activeCategoryLabel} →
              </Link>
              <Link
                href="/templates"
                className="inline-flex items-center gap-1.5 text-label-lg font-semibold text-primary hover:gap-2.5 transition-all"
              >
                Lihat semua <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Filter kategori koleksi template"
            className="flex gap-2.5 mb-7 flex-wrap"
          >
            {(
              Object.entries(CATEGORY_META) as [
                TemplateCategory,
                (typeof CATEGORY_META)[TemplateCategory],
              ][]
            )
              .filter(([, c]) => c.active)
              .map(([catKey, cat]) => {
                const Icon = CATEGORY_ICONS[catKey];
                const isActive = activeCategory === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleCategoryClick(catKey)}
                    className={`inline-flex items-center gap-2 px-4.5 py-2 rounded-full text-label-md font-semibold transition-all cursor-pointer border ${
                      isActive
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-on-surface border-outline-variant/30 hover:border-primary/50 hover:text-primary"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${
                        isActive ? "text-white" : "text-primary"
                      }`}
                    />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
          </div>
        </div>

        <TemplateCarousel
          templates={templates}
          carouselRef={carouselRef}
          onActiveIndexChange={handleActiveIndexChange}
        />
      </div>
    </section>
  );
}
