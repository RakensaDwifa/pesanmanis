import { Metadata } from "next";
import { getCatalogTemplates } from "@/lib/templates";
import TemplatesHero from "./TemplatesHero";
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
  const templates = getCatalogTemplates();

  return (
    <section className="w-full relative bg-surface min-h-screen text-on-surface overflow-x-clip">
      {/* Subtle Ambient Peach Radial Glow (0 GPU blur pass, light & dark safe) */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[440px] pointer-events-none"
        style={{
          background:
            "radial-gradient(620px 300px at 16% 8%, rgba(222,112,56,0.08), transparent), radial-gradient(520px 260px at 86% 18%, rgba(245,161,90,0.09), transparent)",
        }}
      />

      <div className="relative z-[1] px-5 sm:px-8 md:px-14 max-w-[1440px] mx-auto pt-24 sm:pt-[116px] md:pt-[130px] pb-28 sm:pb-24">
        {/* Choreographed Editorial Hero Header */}
        <TemplatesHero />

        {/* Animated Toolbar, Custom Sort Dropdown & FLIP 3D Grid */}
        <TemplatesClient
          templates={templates}
          initialCategory={kategori || null}
        />
      </div>
    </section>
  );
}
