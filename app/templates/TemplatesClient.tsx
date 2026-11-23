"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getActiveTemplates, templateEmoji } from "@/lib/templates";
import { CATEGORY_META } from "@/lib/types";
import { AnalyticsEvents } from "@/lib/analytics";
import { usePricing } from "@/lib/use-pricing";

export default function TemplatesClient({
  templates,
}: {
  templates: ReturnType<typeof getActiveTemplates>;
}) {
  const pricing = usePricing();

  if (templates.length === 0) {
    return (
      <div className="text-center py-20 text-on-surface-variant">
        Belum ada template di kategori ini. Coba kategori lain ya!
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {templates.map((t) => (
        <div
          key={t.slug}
          className="group bg-white rounded-3xl overflow-hidden shadow-card border border-outline-variant/20 hover:-translate-y-1.5 hover:shadow-card-hover transition-all duration-300 flex flex-col"
        >
          <Link
            href={`/preview/${t.slug}`}
            onClick={() => AnalyticsEvents.templatePreviewed?.(t.slug)}
            className={`relative h-56 w-full bg-gradient-to-br ${t.gradient} flex items-center justify-center overflow-hidden focus:outline-primary`}
            aria-label={`Lihat Template ${t.name}`}
          >
            <span className="text-7xl drop-shadow-lg">
              {templateEmoji(t.slug)}
            </span>
            <Image
              src={`/templates/${t.slug}.png`}
              alt={t.name}
              width={390}
              height={780}
              sizes="(min-width: 1280px) 320px, (min-width: 640px) 50vw, 100vw"
              className="absolute inset-0 h-full w-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
            />
            <span className="absolute top-3 right-3 z-10 bg-white/85 backdrop-blur-sm rounded-full px-3 py-1 text-label-md font-semibold text-on-surface-variant shadow-sm">
              {CATEGORY_META[t.type].emoji} {CATEGORY_META[t.type].label}
            </span>
          </Link>
          <div className="p-6 flex-1 flex flex-col">
            <h2 className="font-heading text-xl text-on-surface mb-1.5">
              {t.name}
            </h2>
            <p className="text-body-md text-on-surface-variant mb-4 min-h-[40px] flex-1">
              {t.description}
            </p>
            <div className="flex flex-row gap-2 mt-3">
              <Link
                href={`/preview/${t.slug}`}
                onClick={() => AnalyticsEvents.templatePreviewed?.(t.slug)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-outline-variant bg-white text-primary font-semibold text-label-md hover:bg-primary/10 hover:border-primary"
              >
                👁 Lihat Template
              </Link>
              <Link
                href={`/buat/${t.slug}`}
                onClick={() => AnalyticsEvents.templateSelected(t.slug)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-primary text-white font-semibold text-label-md shadow hover:bg-primary/90 transition"
              >
                Buat Sekarang <ArrowRight className="h-4 w-4" />
              </Link>
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
