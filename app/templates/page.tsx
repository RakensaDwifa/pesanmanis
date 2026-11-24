import { Metadata } from "next";
import { getActiveTemplates } from "@/lib/templates";
import { PROMO_AMOUNT_LABEL } from "@/lib/pricing";
import TemplatesClient from "./TemplatesClient";

export const metadata: Metadata = {
  title: "Pilih Template Ucapan Manis",
  description:
    "Jelajahi semua template ucapan manis interaktif. Coba preview gratis, lalu buat kejutan spesial untuk orang tersayang dalam hitungan menit.",
};

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori } = await searchParams;
  const templates = getActiveTemplates();

  return (
    <section className="w-full relative bg-surface min-h-screen text-on-surface">
      <div className="relative z-[1] px-5 sm:px-8 md:px-14 max-w-[1440px] mx-auto pt-[116px] md:pt-[130px] pb-24">
        {/* Editorial Hero Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-10 md:mb-12">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[11px] tracking-[0.1em] uppercase">
              ✨ KOLEKSI TEMPLATE DIGITAL
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[50px] leading-[1.15] text-on-surface tracking-tight">
              Pilih Template untuk{" "}
              <span className="font-semibold italic text-primary">
                Momen Kalian
              </span>
            </h1>
            <p className="text-body-lg sm:text-[17px] text-on-surface-variant leading-relaxed">
              Setiap template punya cerita dan interaksi berbeda. Coba preview gratis
              sepuasnya, lalu sesuaikan dengan cerita kalian dalam 3 menit.
            </p>
          </div>

          {/* Value Reassurance Card */}
          <div className="w-full sm:w-auto bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5 sm:p-6 shadow-sm shrink-0">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-body-md font-medium text-on-surface-variant">
                Semua template
              </span>
              <span className="font-heading font-bold text-2xl text-primary">
                {PROMO_AMOUNT_LABEL}
              </span>
            </div>
            <p className="text-[12px] sm:text-xs text-on-surface-variant/80">
              Sekali bayar · Aktif selamanya · Gratis edit 7 hari
            </p>
          </div>
        </div>

        {/* Toolbar & Grid */}
        <TemplatesClient templates={templates} initialCategory={kategori || null} />
      </div>
    </section>
  );
}
