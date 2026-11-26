"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Cake, Heart, MessageCircleHeart, Sparkles } from "lucide-react";
import TemplateCarousel, {
  type TemplateCarouselHandle,
} from "@/components/templates/TemplateCarousel";
import {
  CATEGORY_META,
  type TemplateCategory,
  type TemplateMeta,
} from "@/lib/types";
import { MotionFadeUp, MotionTextReveal, SPRING_TACTILE } from "./MotionPrimitives";

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
      className="w-full relative bg-surface-container-low overflow-x-clip scroll-mt-20"
      id="koleksi"
    >
      <div className="relative z-[1] py-16 md:py-24">
        <div className="px-5 md:px-16 max-w-[1200px] mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <div>
              <MotionTextReveal
                as="h2"
                text="Pilih Vibes-nya, Sesuaikan Ceritanya"
                className="font-heading text-headline-md md:text-headline-lg text-primary mb-2"
              />
              <MotionFadeUp delay={0.1} y={10}>
                <p className="text-body-md md:text-body-lg font-medium text-on-surface-variant max-w-xl">
                  Setiap template punya karakter berbeda — klik kategori atau putar untuk melihat semuanya.
                </p>
              </MotionFadeUp>
            </div>
            <MotionFadeUp delay={0.12} y={10} className="flex items-center gap-4">
              <Link
                href={`/templates?kategori=${activeCategory}`}
                className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors"
              >
                Kategori {activeCategoryLabel} →
              </Link>
              <Link
                href="/templates"
                className="group inline-flex items-center gap-1.5 text-label-lg font-semibold text-primary transition-all"
              >
                <span>Lihat semua</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </MotionFadeUp>
          </div>

          <MotionFadeUp delay={0.14} y={10}>
            <div
              role="tablist"
              aria-label="Filter kategori koleksi template"
              className="flex gap-2 mb-6 flex-nowrap overflow-x-auto no-scrollbar pb-1 -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap"
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
                    <motion.button
                      key={catKey}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleCategoryClick(catKey)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.96 }}
                      transition={SPRING_TACTILE}
                      className={`relative shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-label-md font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
                        isActive
                          ? "text-white border-primary"
                          : "bg-white text-on-surface border-outline-variant/30 hover:border-primary/50 hover:text-primary"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="koleksi-category-pill"
                          transition={SPRING_TACTILE}
                          className="absolute inset-0 rounded-full bg-primary shadow-sm"
                        />
                      )}
                      <Icon
                        className={`relative z-[1] h-3.5 w-3.5 ${
                          isActive ? "text-white" : "text-primary"
                        }`}
                      />
                      <span className="relative z-[1]">{cat.label}</span>
                    </motion.button>
                  );
                })}
            </div>
          </MotionFadeUp>
        </div>

        <MotionFadeUp delay={0.12} y={0}>
          <TemplateCarousel
            templates={templates}
            carouselRef={carouselRef}
            onActiveIndexChange={handleActiveIndexChange}
          />
        </MotionFadeUp>
      </div>
    </section>
  );
}
