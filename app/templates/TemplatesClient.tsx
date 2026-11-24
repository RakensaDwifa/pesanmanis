"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Search, X } from "lucide-react";
import { CATEGORY_ORDER, getActiveTemplates, templateEmoji } from "@/lib/templates";
import { CATEGORY_META, type TemplateCategory } from "@/lib/types";
import { AnalyticsEvents } from "@/lib/analytics";
import { usePricing } from "@/lib/use-pricing";

interface TemplatesClientProps {
  templates: ReturnType<typeof getActiveTemplates>;
  initialCategory?: string | null;
}

export default function TemplatesClient({
  templates,
  initialCategory = null,
}: TemplatesClientProps) {
  const pricing = usePricing();

  // Active Category Filter
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | "all">(
    () => {
      if (initialCategory && CATEGORY_ORDER.includes(initialCategory as TemplateCategory)) {
        return initialCategory as TemplateCategory;
      }
      return "all";
    }
  );

  // Live Search Query
  const [searchQuery, setSearchQuery] = useState("");

  // Sort Order
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "name">("popular");

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

  return (
    <div className="space-y-8">
      {/* Horizontal Filter & Search Toolbar */}
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-3 md:p-3.5 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs sm:text-[13px] font-semibold shrink-0 transition-all ${
              selectedCategory === "all"
                ? "bg-primary text-white shadow-xs"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline-variant/20"
            }`}
          >
            <span>✨ Semua</span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                selectedCategory === "all"
                  ? "bg-white/25 text-white"
                  : "bg-surface-container-high text-on-surface-variant/80"
              }`}
            >
              {categoryCounts.all ?? 0}
            </span>
          </button>

          {activeCategories.map((catKey) => {
            const cat = CATEGORY_META[catKey];
            const isSelected = selectedCategory === catKey;
            const count = categoryCounts[catKey] ?? 0;

            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs sm:text-[13px] font-semibold shrink-0 transition-all ${
                  isSelected
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline-variant/20"
                }`}
              >
                <span>
                  {cat.emoji} {cat.label}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? "bg-white/25 text-white"
                      : "bg-surface-container-high text-on-surface-variant/80"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Live Search */}
          <div className="relative flex-1 sm:w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant/70 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari template..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-[13px] rounded-full bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-0.5"
                aria-label="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "popular" | "newest" | "name")}
              aria-label="Urutkan template"
              className="appearance-none pl-3.5 pr-8 py-2 text-xs sm:text-[13px] font-medium rounded-full bg-surface-container border border-outline-variant/30 text-on-surface hover:border-primary focus:outline-none focus:border-primary cursor-pointer transition"
            >
              <option value="popular">Urutkan: Terpopuler</option>
              <option value="newest">Urutkan: Terbaru</option>
              <option value="name">Urutkan: Nama (A-Z)</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/70 text-[10px]">
              ▼
            </span>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-24 bg-surface-container-low rounded-3xl border border-outline-variant/20 p-8">
          <p className="text-4xl mb-3">🔍</p>
          <h3 className="font-heading text-xl text-on-surface mb-2">
            Tidak ada template yang cocok
          </h3>
          <p className="text-body-md text-on-surface-variant max-w-md mx-auto mb-6">
            Coba ubah kata kunci pencarian atau pilih kategori lain untuk melihat koleksi lainnya.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setSearchQuery("");
            }}
            className="px-5 py-2.5 rounded-full bg-primary text-white font-semibold text-xs sm:text-sm hover:bg-primary/90 transition shadow-sm"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
          {filteredTemplates.map((t) => {
            const catMeta = CATEGORY_META[t.type];
            const isDarkMockup = t.phoneDark ?? false;

            return (
              <div
                key={t.slug}
                className="group bg-surface-container-low rounded-3xl border border-outline-variant/30 overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-300 flex flex-col"
              >
                {/* Stage Wrapper */}
                <div className="p-3.5 pb-0">
                  <div className="relative h-[290px] w-full rounded-2xl overflow-hidden flex items-center justify-center bg-surface-container-high/70">
                    {/* Radial Stage Glow */}
                    <div
                      className="absolute w-52 h-52 rounded-full blur-2xl pointer-events-none opacity-80"
                      style={{
                        background:
                          t.glowColor ?? "rgba(222, 112, 56, 0.22)",
                      }}
                    />

                    {/* Top Badges Bar */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-none">
                      {/* Left Badge */}
                      <div>
                        {t.badge === "popular" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary text-white shadow-xs">
                            ★ Terpopuler
                          </span>
                        )}
                        {t.badge === "new" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary text-white shadow-xs">
                            ✨ Baru
                          </span>
                        )}
                      </div>

                      {/* Right Category Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-surface/90 backdrop-blur-xs text-on-surface border border-outline-variant/30 shadow-xs">
                        {catMeta.emoji} {catMeta.label}
                      </span>
                    </div>

                    {/* Phone Mockup Frame */}
                    <div
                      className="w-[156px] h-[260px] rounded-[18px] border-[1.5px] border-white/20 shadow-2xl overflow-hidden relative flex flex-col justify-between p-3.5 select-none transition-transform duration-300 group-hover:scale-[1.03]"
                      style={{
                        background:
                          t.phoneGradient ??
                          `linear-gradient(180deg, #fff 0%, #ffd4e1 100%)`,
                        color: isDarkMockup ? "#F8EEE7" : "#241914",
                      }}
                    >
                      {/* Top Notch */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-11 h-1 rounded-full bg-black/20 z-10" />

                      {/* Story Progress Bars */}
                      <div className="flex items-center gap-1 w-full pt-1.5 z-10">
                        <div
                          className={`h-[2.5px] flex-1 rounded-full ${
                            isDarkMockup ? "bg-white/75" : "bg-black/40"
                          }`}
                        />
                        <div
                          className={`h-[2.5px] flex-1 rounded-full ${
                            isDarkMockup ? "bg-white/25" : "bg-black/15"
                          }`}
                        />
                        <div
                          className={`h-[2.5px] flex-1 rounded-full ${
                            isDarkMockup ? "bg-white/25" : "bg-black/15"
                          }`}
                        />
                      </div>

                      {/* Phone Focal Content */}
                      <div className="my-auto flex flex-col items-center text-center gap-1.5 z-10 px-1">
                        <div className="w-12 h-12 rounded-full bg-white/75 backdrop-blur-xs flex items-center justify-center text-2xl shadow-sm mb-0.5">
                          {templateEmoji(t.slug)}
                        </div>
                        <span
                          className={`text-[8.5px] font-bold tracking-widest uppercase ${
                            isDarkMockup ? "text-primary-fixed-dim" : "text-primary"
                          }`}
                        >
                          {t.mockupSubtitle ?? "UNTUK KAMU"}
                        </span>
                        <p className="font-heading text-[13px] leading-tight font-semibold italic line-clamp-2">
                          {t.mockupHeadline ?? t.name}
                        </p>
                      </div>

                      {/* Phone Mini CTA */}
                      <div className="w-full py-1.5 px-3 rounded-full text-center text-[9px] font-bold text-white shadow-sm bg-primary z-10">
                        {t.mockupCta ?? "Buka pesan ✨"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="font-heading text-xl md:text-[22px] font-semibold text-on-surface mb-1.5">
                      {t.name}
                    </h2>
                    <p className="text-body-md text-on-surface-variant text-[13.5px] leading-relaxed line-clamp-2 mb-4">
                      {t.description}
                    </p>
                  </div>

                  {/* Actions & Footer */}
                  <div className="mt-auto space-y-3.5">
                    {/* Action Row */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <Link
                        href={`/preview/${t.slug}`}
                        onClick={() => AnalyticsEvents.templatePreviewed?.(t.slug)}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full border border-outline-variant/40 bg-surface text-primary font-semibold text-xs sm:text-[13px] hover:bg-primary/10 hover:border-primary transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Link>
                      <Link
                        href={`/buat/${t.slug}`}
                        onClick={() => AnalyticsEvents.templateSelected?.(t.slug)}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-primary text-white font-semibold text-xs sm:text-[13px] shadow-xs hover:bg-primary/90 transition"
                      >
                        Buat Sekarang
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-outline-variant/20" />

                    {/* Card Footer */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant/80 font-medium text-[11.5px] sm:text-xs">
                        Aktif selamanya · edit 7 hari
                      </span>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {pricing.isPromo && (
                          <span className="line-through text-[11px] opacity-60 font-normal">
                            {pricing.normalPriceLabel}
                          </span>
                        )}
                        <span>{pricing.formattedPrice}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Counter Bar */}
      <div className="pt-2 text-center text-xs text-on-surface-variant/70">
        Menampilkan {filteredTemplates.length} dari {templates.length} template
      </div>
    </div>
  );
}
