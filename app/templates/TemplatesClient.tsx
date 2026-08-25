"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getActiveTemplates, templateEmoji } from "@/lib/templates";
import { CATEGORY_META } from "@/lib/types";
import { AnalyticsEvents } from "@/lib/analytics";
import { BRAND } from "@/lib/brand";

export default function TemplatesClient({
  templates,
}: {
  templates: ReturnType<typeof getActiveTemplates>;
}) {
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
        <Link
          key={t.slug}
          href={`/buat/${t.slug}`}
          onClick={() => AnalyticsEvents.templateSelected(t.slug)}
          className="group bg-white rounded-3xl overflow-hidden shadow-card border border-outline-variant/20 hover:-translate-y-1.5 hover:shadow-card-hover transition-all duration-300"
        >
          <div
            className={`relative h-48 bg-gradient-to-br ${t.gradient} flex items-center justify-center`}
          >
            <span className="text-8xl drop-shadow-lg group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
              {templateEmoji(t.slug)}
            </span>
            <span className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-label-md font-semibold text-on-surface-variant">
              {CATEGORY_META[t.type].emoji} {CATEGORY_META[t.type].label}
            </span>
            <span className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300 flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary text-label-lg font-semibold rounded-full shadow-lg">
                Buat Sekarang <ArrowRight className="h-4 w-4" />
              </span>
            </span>
          </div>
          <div className="p-6">
            <h2 className="font-heading text-xl text-on-surface mb-1.5">
              {t.name}
            </h2>
            <p className="text-body-md text-on-surface-variant mb-4 min-h-[40px]">
              {t.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-label-md text-on-surface-variant">
                Aktif selamanya · edit 7 hari
              </span>
              <span className="text-label-md font-semibold bg-primary-fixed/30 text-primary px-3 py-1 rounded-full">
                {BRAND.priceLabel}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
