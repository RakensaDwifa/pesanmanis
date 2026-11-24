"use client";

import { useEffect, useImperativeHandle, useRef, useState, useCallback, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type MotionValue,
} from "framer-motion";
import { templateEmoji } from "@/lib/templates";
import { CATEGORY_META, type TemplateMeta } from "@/lib/types";

/**
 * Coverflow Item dengan Infinite Wrapping:
 * - Menghitung jarak melingkar terpendek (wrappedDiff) terhadap posisi scroll virtual
 * - Kartu terakhir otomatis berada di sebelah kiri kartu pertama tanpa reset
 * - Kartu pertama otomatis berada di sebelah kanan kartu terakhir tanpa jeda
 */
function CoverflowItem({
  template,
  index,
  total,
  scrollX,
  itemWidth,
  slotGap,
  stackGap,
  cardWidth,
  isActive,
  onSelect,
  isDragging,
}: {
  template: TemplateMeta;
  index: number;
  total: number;
  scrollX: MotionValue<number>;
  itemWidth: number;
  slotGap: number;
  stackGap: number;
  cardWidth: number;
  isActive: boolean;
  onSelect: () => void;
  isDragging: () => boolean;
}) {
  // Hitung selisih jarak melingkar pada lingkaran N kartu
  const getDiff = (sX: number) => {
    const vIdx = -sX / itemWidth;
    const raw = (index - vIdx) % total;
    return ((((raw + total / 2) % total) + total) % total) - total / 2;
  };

  // Posisi horizontal dengan celah tengah terbuka (slotGap)
  const x = useTransform(scrollX, (sX) => {
    const diff = getDiff(sX);
    if (diff < -1) {
      return -slotGap + (diff + 1) * stackGap;
    }
    if (diff < 0) {
      return -slotGap * -diff;
    }
    if (diff <= 1) {
      return slotGap * diff;
    }
    return slotGap + (diff - 1) * stackGap;
  });

  // Rotasi miring ke arah kartu tengah
  const rotateY = useTransform(scrollX, (sX) => {
    const diff = getDiff(sX);
    if (diff <= -1) return 30;
    if (diff < 0) return 30 * -diff;
    if (diff <= 1) return -30 * diff;
    return -30;
  });

  // Skala: kartu aktif di tengah 100%, kartu samping mengecil proporsional
  const scale = useTransform(scrollX, (sX) => {
    const diff = getDiff(sX);
    const absDiff = Math.abs(diff);
    if (absDiff >= 1) return 0.76;
    return 1 - 0.24 * absDiff;
  });

  // Urutan tumpukan: kartu aktif terdepan
  const zIndex = useTransform(scrollX, (sX) => {
    const diff = getDiff(sX);
    return Math.max(0, Math.round(1000 - Math.abs(diff) * 100));
  });

  // Opasitas bertingkat: saat kartu berputar di bagian belakang (diff > 3.6), opasitas 0
  const opacity = useTransform(scrollX, (sX) => {
    const diff = getDiff(sX);
    const absDiff = Math.abs(diff);
    if (absDiff > 3.6) return 0;
    if (absDiff > 2.2) return 1 - (absDiff - 2.2) / 1.4;
    return 1;
  });

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging()) {
      e.preventDefault();
      return;
    }
    if (!isActive) {
      e.preventDefault();
      onSelect();
    }
  };

  const preventWhenDragging = (e: React.MouseEvent) => {
    if (isDragging()) {
      e.preventDefault();
    }
  };

  return (
    <motion.div
      style={{
        zIndex,
        position: "absolute",
        left: "50%",
        marginLeft: -cardWidth / 2,
        width: cardWidth,
        x,
        rotateY,
        scale,
        opacity,
        transformPerspective: 600,
      }}
      className="flex items-center justify-center shrink-0 cursor-pointer will-change-transform"
      onClick={handleClick}
    >
      <div className="w-full bg-[#FFF9F5] dark:bg-[#281C17] rounded-3xl border border-[#E6D5CB] dark:border-[#4E3930] shadow-[0_16px_40px_rgba(36,25,20,0.18)] overflow-hidden flex flex-col select-none">
        <Link
          href={`/preview/${template.slug}`}
          onClick={preventWhenDragging}
          tabIndex={isActive ? 0 : -1}
          aria-label={`Lihat Template ${template.name}`}
          className="relative m-3 mb-0 block aspect-[4/5] rounded-2xl overflow-hidden bg-surface-container-low shadow-inner"
        >
          {/* Fallback kalau screenshot belum ada: gradient + emoji */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${template.gradient} flex items-center justify-center text-6xl`}
          >
            {templateEmoji(template.slug)}
          </div>
          <Image
            src={`/templates/${template.slug}.png`}
            alt={template.name}
            width={390}
            height={780}
            sizes="(min-width: 640px) 260px, 220px"
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            priority={index <= 2}
          />
        </Link>

        <div className="px-3.5 pb-4 pt-3 text-center flex-1 flex flex-col gap-2">
          <h3 className="font-heading text-title-md font-bold text-[#241914] dark:text-[#FCEEE6] line-clamp-1">
            {template.name}
          </h3>
          <p className="text-xs font-medium text-[#685247] dark:text-[#D6BFB4] flex items-center justify-center gap-1">
            <span>{CATEGORY_META[template.type].emoji}</span>
            <span>{CATEGORY_META[template.type].label}</span>
          </p>
          <div className="mt-1 flex flex-col gap-1.5 pt-1">
            <Link
              href={`/preview/${template.slug}`}
              onClick={preventWhenDragging}
              tabIndex={isActive ? 0 : -1}
              className="block w-full rounded-full bg-primary py-2 text-label-md font-semibold text-white hover:bg-primary/90 transition shadow-xs hover:shadow-sm"
            >
              Lihat Template
            </Link>
            <Link
              href={`/buat/${template.slug}`}
              onClick={preventWhenDragging}
              tabIndex={isActive ? 0 : -1}
              className="text-label-md font-semibold text-[#685247] dark:text-[#D6BFB4] hover:text-primary dark:hover:text-primary transition py-0.5"
            >
              Buat sekarang
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export type TemplateCarouselHandle = {
  jumpTo: (index: number) => void;
};

export default function TemplateCarousel({
  templates,
  carouselRef,
  onActiveIndexChange,
}: {
  templates: TemplateMeta[];
  carouselRef?: RefObject<TemplateCarouselHandle | null>;
  onActiveIndexChange?: (index: number) => void;
}) {
  const n = templates.length || 1;
  // virtualIndex bergerak terus (..., -1, 0, 1, 2, ...) tanpa mentok
  const [virtualIndex, setVirtualIndex] = useState(0);

  // Ukuran responsif
  const [metrics, setMetrics] = useState({
    itemWidth: 260,
    slotGap: 215,
    stackGap: 52,
    cardWidth: 260,
  });

  const scrollX = useMotionValue(0);
  const dragDistance = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        const isMobile = window.innerWidth < 640;
        setMetrics({
          itemWidth: isMobile ? 220 : 260,
          slotGap: isMobile ? 170 : 215,
          stackGap: isMobile ? 42 : 52,
          cardWidth: isMobile ? 220 : 260,
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Animasi halus ke virtualIndex target (tanpa reset balik, dipastikan integer)
  const goTo = useCallback(
    (targetVirtual: number) => {
      const target = Math.round(targetVirtual);
      setVirtualIndex(target);
      const nextActive = ((target % n) + n) % n;
      onActiveIndexChange?.(nextActive);
      animate(scrollX, -target * metrics.itemWidth, {
        type: "spring",
        stiffness: 300,
        damping: 30,
      });
    },
    [metrics.itemWidth, n, onActiveIndexChange, scrollX]
  );

  // Sinkronisasi posisi saat itemWidth berubah (resize layar)
  useEffect(() => {
    scrollX.set(-virtualIndex * metrics.itemWidth);
  }, [metrics.itemWidth, virtualIndex, scrollX]);

  // Gestur Pan/Drag bebas batas ujung (Infinite Scrolling)
  const handlePanStart = () => {
    dragDistance.current = 0;
    isDraggingRef.current = false;
  };

  const handlePan = (_: unknown, info: { delta: { x: number } }) => {
    dragDistance.current += Math.abs(info.delta.x);
    if (dragDistance.current > 6) {
      isDraggingRef.current = true;
    }
    // Langsung majukan scrollX tanpa batas dinding (infinite)
    scrollX.set(scrollX.get() + info.delta.x);
  };

  const handlePanEnd = (_: unknown, info: { velocity: { x: number } }) => {
    const current = scrollX.get();
    const target = Math.round((-current - info.velocity.x * 0.16) / metrics.itemWidth);
    goTo(target);

    setTimeout(() => {
      isDraggingRef.current = false;
    }, 60);
  };

  // Navigasi panah: terus maju (+1) atau terus mundur (-1) secara melingkar
  const handlePrev = () => {
    goTo(virtualIndex - 1);
  };

  const handleNext = () => {
    goTo(virtualIndex + 1);
  };

  // Navigasi titik indikator (dots): hitung integer delta putaran terpendek
  const goToDot = useCallback(
    (dotIndex: number) => {
      const currentMod = ((virtualIndex % n) + n) % n;
      let delta = ((dotIndex - currentMod) % n + n) % n;
      if (delta > n / 2) delta -= n;
      goTo(virtualIndex + delta);
    },
    [goTo, n, virtualIndex]
  );

  useImperativeHandle(
    carouselRef,
    () => ({
      jumpTo: goToDot,
    }),
    [goToDot]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  };

  // Klik langsung pada kartu: putar ke kartu yang diklik via rute terpendek
  const handleCardSelect = (cardIndex: number) => {
    const currentV = Math.round(-scrollX.get() / metrics.itemWidth);
    const currentMod = ((currentV % n) + n) % n;
    let delta = ((cardIndex - currentMod) % n + n) % n;
    if (delta > n / 2) delta -= n;
    goTo(currentV + delta);
  };

  // Index kartu aktif saat ini (0..n-1)
  const activeIndex = Math.round(((virtualIndex % n) + n) % n);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Koleksi template PesanManis. Gunakan panah kiri dan kanan untuk memilih template."
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative w-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-3xl"
    >
      {/* Mask Container: linear gradient di kiri dan kanan untuk fade out samping */}
      <div
        className="relative w-full overflow-hidden flex items-center justify-center py-4 select-none touch-pan-y"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
        }}
      >
        <motion.div
          onPanStart={handlePanStart}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
          className="relative flex items-center justify-center h-[500px] w-full cursor-grab active:cursor-grabbing"
        >
          {templates.map((template, index) => (
            <CoverflowItem
              key={template.slug}
              template={template}
              index={index}
              total={n}
              scrollX={scrollX}
              itemWidth={metrics.itemWidth}
              slotGap={metrics.slotGap}
              stackGap={metrics.stackGap}
              cardWidth={metrics.cardWidth}
              isActive={index === activeIndex}
              onSelect={() => handleCardSelect(index)}
              isDragging={() => isDraggingRef.current}
            />
          ))}
        </motion.div>
      </div>

      {/* Kontrol Navigasi: Panah Kiri, Dot Indikator, dan Panah Kanan */}
      <div className="mt-6 flex items-center justify-center gap-4 sm:gap-6 z-10 relative">
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Template sebelumnya"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 dark:bg-[#2E241F] text-primary border border-outline-variant/30 dark:border-[#4E3930] shadow-[0_8px_20px_rgba(222,112,56,0.18)] transition-all duration-200 hover:scale-105 active:scale-95 hover:border-primary/40 cursor-pointer"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-2 bg-white/80 dark:bg-[#281C17]/80 backdrop-blur-xs rounded-full border border-outline-variant/20 shadow-2xs">
          {templates.map((t, i) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => goToDot(i)}
              aria-label={`Ke template ${t.name}`}
              aria-current={i === activeIndex}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                i === activeIndex
                  ? "w-6 bg-primary"
                  : "w-2 bg-primary/25 hover:bg-primary/50"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Template berikutnya"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 dark:bg-[#2E241F] text-primary border border-outline-variant/30 dark:border-[#4E3930] shadow-[0_8px_20px_rgba(222,112,56,0.18)] transition-all duration-200 hover:scale-105 active:scale-95 hover:border-primary/40 cursor-pointer"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
