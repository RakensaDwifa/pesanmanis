import Link from "next/link";
import { Metadata } from "next";
import { CATEGORY_ORDER, getActiveTemplates, slugify } from "@/lib/templates";
import { CATEGORY_META, type TemplateCategory } from "@/lib/types";
import TemplatesClient from "./TemplatesClient";

export const metadata: Metadata = {
  title: "Pilih Template",
  description:
    "Jelajahi semua template ucapan manis. Pilih template favoritmu dan buat kejutan spesial sekarang.",
};

function matchesKategori(catKey: TemplateCategory, param: string | null): boolean {
  if (!param) return false;
  const normalized = slugify(param);
  return normalized === catKey || normalized === slugify(CATEGORY_META[catKey].label);
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori } = await searchParams;
  const kategoriParam = kategori || null;
  const activeCatKeys = CATEGORY_ORDER.filter((k) => CATEGORY_META[k].active);
  const templates = getActiveTemplates();

  const activeKey = activeCatKeys.find((k) => matchesKategori(k, kategoriParam)) ?? null;
  const filteredTemplates = activeKey
    ? templates.filter((t) => t.type === activeKey)
    : templates;

  const countFor = (catKey: TemplateCategory) =>
    templates.filter((t) => t.type === catKey).length;

  const catLink = (catKey: TemplateCategory | null) =>
    catKey ? `/templates?kategori=${catKey}` : "/templates";

  return (
    <section className="w-full relative bg-surface min-h-screen">
      <div className="relative z-[1] px-5 md:px-10 max-w-[1300px] mx-auto pt-[110px] pb-20">
        <div className="mb-8">
          <h1 className="font-heading text-headline-lg text-primary mb-3">
            Pilih Template untuk Momen Kalian
          </h1>
          <p className="text-body-lg font-medium text-on-surface-variant max-w-xl">
            Setiap template punya karakter berbeda. Pilih yang paling cocok,
            lalu isi dengan cerita kalian sendiri.
          </p>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-8 items-start">
          {/* Sidebar filter — desktop */}
          <aside className="hidden lg:block lg:sticky lg:top-24 bg-white rounded-3xl border border-outline-variant/30 shadow-card p-4">
            <p className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide px-3 pt-2 pb-3">
              Kategori
            </p>
            <nav className="space-y-1">
              <SidebarLink
                href={catLink(null)}
                active={!activeKey}
                emoji="✨"
                label="Semua"
                count={templates.length}
              />
              {activeCatKeys.map((catKey) => {
                const cat = CATEGORY_META[catKey];
                return (
                  <SidebarLink
                    key={catKey}
                    href={catLink(catKey)}
                    active={activeKey === catKey}
                    emoji={cat.emoji}
                    label={cat.label}
                    count={countFor(catKey)}
                  />
                );
              })}
            </nav>
          </aside>

          {/* Filter chips — mobile */}
          <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5">
            <MobileChip href={catLink(null)} active={!activeKey} label="✨ Semua" />
            {activeCatKeys.map((catKey) => {
              const cat = CATEGORY_META[catKey];
              return (
                <MobileChip
                  key={catKey}
                  href={catLink(catKey)}
                  active={activeKey === catKey}
                  label={`${cat.emoji} ${cat.label}`}
                />
              );
            })}
          </div>

          <TemplatesClient templates={filteredTemplates} />
        </div>
      </div>
    </section>
  );
}

function SidebarLink({
  href,
  active,
  emoji,
  label,
  count,
}: {
  href: string;
  active: boolean;
  emoji: string;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-body-md font-semibold transition-colors ${
        active
          ? "bg-primary-fixed/40 text-primary"
          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
      }`}
    >
      <span>{emoji}</span>
      <span className="flex-1">{label}</span>
      <span
        className={`text-label-md px-2 py-0.5 rounded-full ${
          active ? "bg-primary text-white" : "bg-surface-container-low"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

function MobileChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 inline-flex items-center px-4.5 py-2 rounded-full text-label-md font-semibold transition-all ${
        active
          ? "bg-primary text-white shadow-md"
          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
      }`}
    >
      {label}
    </Link>
  );
}
