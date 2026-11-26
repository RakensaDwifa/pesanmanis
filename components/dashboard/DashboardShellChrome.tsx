"use client";

import Link from "next/link";
import { Gift, LayoutGrid, Plus } from "lucide-react";
import {
  REFERRAL_MAX_REWARDED_PER_REFERRER,
  REFERRAL_REWARD_AMOUNT,
} from "@/lib/referral-policy";

export type DashboardTab = "ucapan" | "referral";

interface DashboardShellChromeProps {
  demo?: boolean;
  realtimeLive?: boolean;
  userName?: string;
  activeTab?: DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
}

const NAV_ITEMS: {
  id: DashboardTab;
  label: string;
  href: string;
  icon: typeof LayoutGrid;
}[] = [
  { id: "ucapan", label: "Ucapan Saya", href: "/dashboard", icon: LayoutGrid },
  {
    id: "referral",
    label: "Referral",
    href: "/dashboard?tab=referral",
    icon: Gift,
  },
];

/**
 * Interactive Dashboard navigation sidebar (desktop) and compact top header (mobile).
 * Shared between DashboardSkeleton (SSR/loading state) and Dashboard so navigation
 * buttons remain immediately usable with zero layout shift when data arrives.
 */
export function DashboardSidebar({
  demo = false,
  realtimeLive = false,
  userName,
  activeTab = "ucapan",
  onTabChange,
}: DashboardShellChromeProps) {
  return (
    <aside className="lg:sticky lg:top-24 self-start bg-white rounded-3xl border border-outline-variant/30 shadow-card p-6">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-label-md text-on-surface-variant truncate">
          {userName ? `Hai, ${userName}` : "Hai"}
        </p>
        {realtimeLive && !demo && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
            title="Statistik view, reaksi, dan balasan diperbarui otomatis secara langsung"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        )}
      </div>
      <h1 className="font-heading text-title-lg text-on-surface mb-6">
        Dashboard Kamu
      </h1>
      <nav className="space-y-1.5 mb-6" aria-label="Navigasi dashboard">
        {NAV_ITEMS.map(({ id, label, href, icon: Icon }) => {
          const isActive = activeTab === id;
          const classes = `flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-label-lg font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
            isActive
              ? "bg-primary-fixed/40 text-primary"
              : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
          }`;
          if (onTabChange) {
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                aria-current={isActive ? "page" : undefined}
                className={classes}
              >
                <Icon className="h-4.5 w-4.5" /> {label}
              </button>
            );
          }
          return (
            <Link
              key={id}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={classes}
            >
              <Icon className="h-4.5 w-4.5" /> {label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/templates"
        className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-primary text-white text-label-lg font-semibold rounded-full shadow-[0_6px_20px_rgba(222,112,56,0.35)] hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
      >
        <Plus className="h-4 w-4" /> Buat Ucapan Baru
      </Link>
      {demo && (
        <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/12 p-3.5">
          <p className="text-label-md text-amber-900 dark:text-amber-200 leading-relaxed">
            Mode demo — data hanya di browser ini. Sambungkan Supabase untuk
            sinkron antar perangkat.
          </p>
        </div>
      )}
    </aside>
  );
}

/** Compact top dashboard navigation card shown on viewports below `lg`. */
export function DashboardMobileHeader({
  demo = false,
  realtimeLive = false,
  activeTab = "ucapan",
  onTabChange,
}: DashboardShellChromeProps) {
  return (
    <div className="lg:hidden mb-5 bg-white rounded-2xl border border-outline-variant/30 shadow-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-title-lg text-on-surface truncate">
              Dashboard Kamu
            </h1>
            {realtimeLive && !demo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>
        <Link
          href="/templates"
          className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 bg-primary text-white text-label-md font-semibold rounded-full shadow-xs shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <Plus className="h-4 w-4" /> Buat
        </Link>
      </div>
      <nav
        className="grid grid-cols-2 gap-1.5 p-1 rounded-full bg-surface-container-low border border-outline-variant/30"
        aria-label="Navigasi dashboard mobile"
      >
        {NAV_ITEMS.map(({ id, label, href, icon: Icon }) => {
          const isActive = activeTab === id;
          const classes = `inline-flex items-center justify-center gap-1.5 min-h-[38px] py-2 px-3 rounded-full text-label-md font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
            isActive
              ? "bg-primary text-white"
              : "text-on-surface-variant hover:text-primary"
          }`;
          if (onTabChange) {
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                aria-current={isActive ? "page" : undefined}
                className={classes}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            );
          }
          return (
            <Link
              key={id}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={classes}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </Link>
          );
        })}
      </nav>
      {demo && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/12 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
          Mode demo aktif — data tersimpan lokal di browser ini.
        </p>
      )}
    </div>
  );
}

/** Shared static header for `/dashboard/referral` and its route loading shell. */
export function ReferralHeader() {
  return (
    <div className="mb-8 sm:mb-10">
      <h1 className="font-heading text-headline-md sm:text-headline-lg text-primary mb-1">
        Program Referral
      </h1>
      <p className="text-body-md text-on-surface-variant">
        Ajak temanmu bikin kejutan — kamu dapat saldo Rp{" "}
        {REFERRAL_REWARD_AMOUNT.toLocaleString("id-ID")} untuk setiap teman yang
        menyelesaikan pembayaran (maks. {REFERRAL_MAX_REWARDED_PER_REFERRER}{" "}
        teman).
      </p>
    </div>
  );
}
