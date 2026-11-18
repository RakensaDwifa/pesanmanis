"use client";

// import Link from "next/link"; // unused
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getActiveTemplates, templateEmoji } from "@/lib/templates";
import { CATEGORY_META } from "@/lib/types";
import { AnalyticsEvents } from "@/lib/analytics";
import { BRAND } from "@/lib/brand";
import { usePricing } from "@/lib/use-pricing";

export default function TemplatesClient({
  templates,
}: {
  templates: ReturnType<typeof getActiveTemplates>;
}) {
  const pricing = usePricing();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="animate-pulse grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-card border border-outline-variant/20 animate-pulse">
            <div className="h-48 bg-gradient-to-br from-surface-container-low to-surface-container" />
            <div className="p-6">
              <div className="h-6 bg-surface-container-high rounded w-3/4 mb-2" />
              <div className="h-4 bg-surface-container-high rounded w-1/2 mb-2" />
              <div className="h-4 bg-surface-container-high rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-20 text-on-surface-variant">
        Belum ada template. Coba kategori lain ya!
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {templates.map((t) => (
        <div
          key={t.slug}
          className="group bg-white rounded-3xl overflow-hidden shadow-card border border-outline-variant/20 hover:-translate-y-1.5 hover:shadow-card-hover transition-all duration-300"
        >
          <button
            type="button"
            onClick={() => {
              window.location.href = `/preview/${t.slug}`;
              AnalyticsEvents.templatePreviewed?.(t.slug);
            }}
            className={`relative h-48 w-full bg-gradient-to-br ${t.gradient} flex items-center justify-center focus:outline-primary`}
            aria-label={`Lihat Template ${t.name}`}
          >
            <span className="text-8xl drop-shadow-lg group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
              {templateEmoji(t.slug)}
            </span>
            <span className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-label-md font-semibold text-on-surface-variant">
              {CATEGORY_META[t.type].emoji} {CATEGORY_META[t.type].label}
            </span>
          </button>
          <div className="p-6">
            <h2 className="font-heading text-xl text-on-surface mb-1.5">
              {t.name}
            </h2>
            <p className="text-body-md text-on-surface-variant mb-4 min-h-[40px]">
              {t.description}
            </p>
            <div className="flex flex-row gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/preview/${t.slug}`;
                    AnalyticsEvents.templatePreviewed?.(t.slug);
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-outline-variant bg-white text-primary font-semibold text-label-md hover:bg-primary/10 hover:border-primary"
                >
                  👁 Lihat Template
                </button>
                <a
                  href={`/buat/${t.slug}`}
                  onClick={() => AnalyticsEvents.templateSelected(t.slug)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-primary text-white font-semibold text-label-md shadow hover:bg-primary/90 transition"
                >
                  Buat Sekarang <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-label-md text-on-surface-variant">
                  Aktif selamanya · edit 7 hari
                </span>
                <span className="text-label-md font-semibold bg-primary-fixed/30 text-primary px-3 py-1 rounded-full">
                  {pricing.formattedPrice}
                  {pricing.isPromo && (
                    <span className="line-through ml-1 text-xs opacity-60">{pricing.normalPriceLabel}</span>
                  )}
                </span>
              </div>
            </div>
          </div>
      ))}
    </div>
  );
}
