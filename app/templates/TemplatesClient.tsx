"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RotateCcw, Search, Sparkles, Wand2, X } from "lucide-react";
import Link from "next/link";
import { CATEGORY_ORDER } from "@/lib/templates";
import { getTemplateTier } from "@/lib/pricing";
import {
  CATEGORY_META,
  type TemplateCategory,
  type TemplateMeta,
} from "@/lib/types";
import { usePricing } from "@/lib/use-pricing";
import { useIsTouchOrMobile } from "@/lib/use-coarse-pointer";
import { EASE_WARM, SPRING_TACTILE } from "@/components/landing/MotionPrimitives";
import SortDropdown, { type SortOptionValue } from "./SortDropdown";
import TemplateCard from "./TemplateCard";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface TemplatesClientProps {
  templates: TemplateMeta[];
  initialCategory?: string | null;
}

export default function TemplatesClient({
  templates,
  initialCategory = null,
}: TemplatesClientProps) {
  const pricing = usePricing();
  const reduced = Boolean(useReducedMotion());
  const isTouchOrMobile = useIsTouchOrMobile();

  const containerRef = useRef<HTMLDivElement>(null);
  const hasInteractedRef = useRef(false);
  const gsapCtxRef = useRef<gsap.Context | null>(null);

  // Active Category Filter
  const [selectedCategory, setSelectedCategory] = useState<
    TemplateCategory | "all"
  >(() => {
    if (
      initialCategory &&
      CATEGORY_ORDER.includes(initialCategory as TemplateCategory)
    ) {
      return initialCategory as TemplateCategory;
    }
    return "all";
  });

  // Live Search Query & Focus State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Sort Order
  const [sortBy, setSortBy] = useState<SortOptionValue>("popular");

  // Release initial GSAP scroll triggers cleanly once the user starts filtering/searching/sorting
  // so Framer Motion FLIP layout transitions own 100% of dynamic grid motion without invisible cards
  const markInteracted = () => {
    if (hasInteractedRef.current) return;
    hasInteractedRef.current = true;
    if (gsapCtxRef.current) {
      gsapCtxRef.current.revert();
      gsapCtxRef.current = null;
    }
    if (containerRef.current) {
      const nodes = containerRef.current.querySelectorAll(
        "[data-template-card-reveal], [data-templates-toolbar]"
      );
      if (nodes.length > 0) {
        gsap.set(nodes, { clearProps: "transform,opacity" });
      }
    }
  };

  // GSAP toolbar entrance + cinematic ScrollTrigger.batch card reveal on initial load
  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || reduced || hasInteractedRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.from("[data-templates-toolbar]", {
        y: 16,
        opacity: 0,
        duration: 0.5,
        delay: 0.24,
        ease: "power3.out",
        clearProps: "transform,opacity",
      });

      const cards = gsap.utils.toArray<HTMLElement>(
        "[data-template-card-reveal]"
      );
      if (cards.length > 0) {
        gsap.set(cards, { opacity: 0, y: 26, scale: 0.97 });

        const revealBatch = (batch: Element[]) => {
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.58,
            stagger: 0.075,
            ease: "power3.out",
            overwrite: true,
            clearProps: "transform,opacity",
          });
        };

        ScrollTrigger.batch(cards, {
          start: "top 92%",
          once: true,
          onEnter: revealBatch,
          onEnterBack: revealBatch,
        });
      }
    }, container);

    gsapCtxRef.current = ctx;

    return () => {
      ctx.revert();
      if (gsapCtxRef.current === ctx) {
        gsapCtxRef.current = null;
      }
    };
  }, [reduced]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    CATEGORY_ORDER.forEach((cat: TemplateCategory) => {
      counts[cat] = templates.filter((t) => t.type === cat).length;
    });
    return counts;
  }, [templates]);

  // Filtered & Sorted Templates
  const filteredTemplates = useMemo(() => {
    let result = [...templates];

    // 1. Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((t) => t.type === selectedCategory);
    }

    // 2. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q)
      );
    }

    // 3. Sort
    result.sort((a, b) => {
      const soonA = Boolean(a.comingSoon || !a.active);
      const soonB = Boolean(b.comingSoon || !b.active);
      if (sortBy !== "name" && soonA !== soonB) {
        return soonA ? 1 : -1;
      }
      if (sortBy === "popular") {
        const scoreA = a.badge === "popular" ? 2 : a.badge === "new" ? 1 : 0;
        const scoreB = b.badge === "popular" ? 2 : b.badge === "new" ? 1 : 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.order - b.order;
      }
      if (sortBy === "newest") {
        const scoreA = a.badge === "new" ? 2 : a.order;
        const scoreB = b.badge === "new" ? 2 : b.order;
        return scoreB - scoreA;
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "id");
      }
      return a.order - b.order;
    });

    return result;
  }, [templates, selectedCategory, searchQuery, sortBy]);

  const activeCategories = CATEGORY_ORDER.filter(
    (k: TemplateCategory) => CATEGORY_META[k].active
  );

  const handleCategoryChange = (cat: TemplateCategory | "all") => {
    markInteracted();
    setSelectedCategory(cat);
  };

  const handleSearchChange = (nextQuery: string) => {
    markInteracted();
    setSearchQuery(nextQuery);
  };

  const handleSortChange = (nextSort: SortOptionValue) => {
    markInteracted();
    setSortBy(nextSort);
  };

  const handleResetFilters = () => {
    markInteracted();
    setSelectedCategory("all");
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className="space-y-8">
      {/* Horizontal Filter & Search Toolbar */}
      <div
        data-templates-toolbar
        className="relative z-30 bg-surface-container-low border border-outline-variant/30 rounded-2xl p-3 md:p-3.5 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5 xl:gap-4"
      >
        {/* Category Pills with Framer Motion layoutId sliding active pill */}
        <LayoutGroup id="templates-categories">
          <div
            role="tablist"
            aria-label="Filter kategori template"
            className="flex items-center gap-1.5 2xl:gap-2 overflow-x-auto no-scrollbar py-0.5"
          >
            <motion.button
              type="button"
              role="tab"
              aria-selected={selectedCategory === "all"}
              onClick={() => handleCategoryChange("all")}
              whileHover={reduced ? undefined : { y: -1.5 }}
              whileTap={reduced ? undefined : { scale: 0.95 }}
              transition={SPRING_TACTILE}
              className={`group/pill relative inline-flex items-center gap-1.5 px-3 2xl:px-3.5 py-2 rounded-full text-xs sm:text-[13px] font-semibold shrink-0 cursor-pointer border transition-colors ${
                selectedCategory === "all"
                  ? "text-white border-primary"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border-outline-variant/20"
              }`}
            >
              {selectedCategory === "all" && (
                <motion.span
                  layoutId="templates-category-pill"
                  transition={SPRING_TACTILE}
                  className="absolute inset-0 rounded-full bg-primary shadow-xs"
                />
              )}
              <span className="relative z-[1] inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 transition-transform duration-200 group-hover/pill:rotate-12" />
                <span>Semua</span>
              </span>
              <motion.span
                key={`count-all-${selectedCategory === "all"}`}
                initial={reduced ? false : { scale: 0.85 }}
                animate={{ scale: 1 }}
                transition={SPRING_TACTILE}
                className={`relative z-[1] text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                  selectedCategory === "all"
                    ? "bg-white/25 text-white"
                    : "bg-surface-container-high text-on-surface-variant/80"
                }`}
              >
                {categoryCounts.all ?? 0}
              </motion.span>
            </motion.button>

            {activeCategories.map((catKey) => {
              const cat = CATEGORY_META[catKey];
              const isSelected = selectedCategory === catKey;
              const count = categoryCounts[catKey] ?? 0;

              return (
                <motion.button
                  key={catKey}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleCategoryChange(catKey)}
                  whileHover={reduced ? undefined : { y: -1.5 }}
                  whileTap={reduced ? undefined : { scale: 0.95 }}
                  transition={SPRING_TACTILE}
                  className={`relative inline-flex items-center gap-1.5 px-3 2xl:px-3.5 py-2 rounded-full text-xs sm:text-[13px] font-semibold shrink-0 cursor-pointer border transition-colors ${
                    isSelected
                      ? "text-white border-primary"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border-outline-variant/20"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="templates-category-pill"
                      transition={SPRING_TACTILE}
                      className="absolute inset-0 rounded-full bg-primary shadow-xs"
                    />
                  )}
                  <span className="relative z-[1]">
                    {cat.emoji} {cat.label}
                  </span>
                  <motion.span
                    key={`count-${catKey}-${isSelected}`}
                    initial={reduced ? false : { scale: 0.85 }}
                    animate={{ scale: 1 }}
                    transition={SPRING_TACTILE}
                    className={`relative z-[1] text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-surface-container-high text-on-surface-variant/80"
                    }`}
                  >
                    {count}
                  </motion.span>
                </motion.button>
              );
            })}
          </div>
        </LayoutGroup>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {/* Live Search */}
          <div className="relative flex-1 sm:w-[184px] 2xl:w-[224px]">
            <motion.span
              aria-hidden
              animate={
                reduced
                  ? undefined
                  : {
                      scale: searchFocused ? 1.1 : 1,
                    }
              }
              transition={SPRING_TACTILE}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${
                searchFocused ? "text-primary" : "text-on-surface-variant/70"
              }`}
            >
              <Search className="h-4 w-4" />
            </motion.span>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari template..."
              className="w-full pl-9 pr-8 py-2.5 sm:py-2 text-xs sm:text-[13px] rounded-full bg-surface border border-outline-variant/40 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  key="clear-search"
                  type="button"
                  onClick={() => handleSearchChange("")}
                  initial={
                    reduced
                      ? { opacity: 0 }
                      : { opacity: 0, scale: 0.6, rotate: -45 }
                  }
                  animate={
                    reduced
                      ? { opacity: 1 }
                      : { opacity: 1, scale: 1, rotate: 0 }
                  }
                  exit={
                    reduced
                      ? { opacity: 0 }
                      : { opacity: 0, scale: 0.6, rotate: 45 }
                  }
                  whileHover={reduced ? undefined : { scale: 1.14 }}
                  whileTap={reduced ? undefined : { scale: 0.88 }}
                  transition={SPRING_TACTILE}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-0.5 rounded-full hover:bg-surface-container cursor-pointer"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Custom Animated Sort Dropdown */}
          <SortDropdown value={sortBy} onChange={handleSortChange} />
        </div>
      </div>

      {/* Templates Grid or Animated Empty State */}
      {filteredTemplates.length === 0 ? (
        <motion.div
          key="empty-state"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: EASE_WARM }}
          className="text-center py-16 sm:py-24 bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-8"
        >
          <motion.div
            initial={reduced ? false : { scale: 0.75, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={SPRING_TACTILE}
            className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3"
          >
            <Search className="h-5 w-5" />
          </motion.div>
          <h3 className="font-heading text-xl text-on-surface mb-2">
            Tidak ada template yang cocok
          </h3>
          <p className="text-body-md text-on-surface-variant max-w-md mx-auto mb-6">
            Coba ubah kata kunci pencarian atau pilih kategori lain untuk melihat
            koleksi lainnya.
          </p>
          <motion.button
            type="button"
            onClick={handleResetFilters}
            whileHover={reduced ? undefined : { y: -2, scale: 1.02 }}
            whileTap={reduced ? undefined : { scale: 0.96 }}
            transition={SPRING_TACTILE}
            className="group/reset relative overflow-hidden inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white font-semibold text-xs sm:text-sm hover:bg-primary/95 shadow-sm hover:shadow-[0_8px_22px_rgba(222,112,56,0.3)] transition-all cursor-pointer"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/reset:translate-x-[420%] transition-transform duration-700 ease-out motion-reduce:hidden"
            />
            <RotateCcw className="relative z-[1] h-3.5 w-3.5 transition-transform duration-300 group-hover/reset:-rotate-90" />
            <span className="relative z-[1]">Reset Semua Filter</span>
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          layout
          transition={{ duration: 0.35, ease: EASE_WARM }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-7"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {filteredTemplates.map((t) => (
              <motion.div
                key={t.slug}
                layout={reduced ? false : "position"}
                initial={
                  reduced
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.94, y: 14 }
                }
                animate={
                  reduced
                    ? { opacity: 1 }
                    : { opacity: 1, scale: 1, y: 0 }
                }
                exit={
                  reduced
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.92, y: -8 }
                }
                transition={{
                  layout: { type: "spring", stiffness: 360, damping: 32 },
                  opacity: { duration: 0.24, ease: EASE_WARM },
                  scale: { duration: 0.28, ease: EASE_WARM },
                  y: { duration: 0.28, ease: EASE_WARM },
                }}
                className="h-full"
              >
                <TemplateCard
                  template={t}
                  pricing={pricing.tiers[getTemplateTier(t.slug)]}
                  isTouchOrMobile={isTouchOrMobile}
                  reducedMotion={reduced}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Animated Bottom Counter Bar */}
      <div className="pt-2 text-center text-xs text-on-surface-variant/75 flex items-center justify-center gap-1">
        <span>Menampilkan</span>
        <span className="inline-flex items-center justify-center min-w-[1.25rem] overflow-hidden align-middle font-semibold text-on-surface">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={filteredTemplates.length}
              initial={reduced ? { opacity: 0 } : { y: -8, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { y: 8, opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE_WARM }}
              className="inline-block tabular-nums"
            >
              {filteredTemplates.length}
            </motion.span>
          </AnimatePresence>
        </span>
        <span>dari {templates.length} template</span>
      </div>

      {/* Subtle callout untuk layanan Kado Custom */}
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/12 text-primary flex items-center justify-center shrink-0">
            <Wand2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-label-lg font-semibold text-on-surface">
              Punya ide khusus yang belum ada di katalog?
            </p>
            <p className="text-body-md text-on-surface-variant">
              Pesan layanan Kado Custom buatan penuh tim kami mulai Rp 50rb di link cantik{" "}
              <span className="font-semibold text-on-surface">/u/[nama]</span>.
            </p>
          </div>
        </div>
        <Link
          href="/custom"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-primary/40 text-primary hover:bg-primary/10 text-label-md font-semibold shrink-0 transition-colors"
        >
          Lihat Kado Custom →
        </Link>
      </div>
    </div>
  );
}
