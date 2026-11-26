"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShimmerBlock } from "@/components/ui/skeleton";
import { EASE_WARM } from "@/components/landing/MotionPrimitives";
import { DashboardMobileHeader, DashboardSidebar, ReferralHeader } from "./DashboardShellChrome";

const SKELETON_CARD_COUNT = 3;

/**
 * Right-column Motion shimmer skeleton mirroring the 3 summary stat cards and
 * stacked ucapan cards so loading and loaded states match 1:1 with zero layout shift.
 */
export function DashboardContentSkeleton() {
  const reduced = useReducedMotion();

  return (
    <div role="status" aria-busy="true" aria-label="Memuat dashboard">
      <span className="sr-only">Memuat dashboard…</span>

      {/* Summary 3-card skeleton */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: i * 0.05, ease: EASE_WARM }}
            className="bg-white rounded-2xl border border-outline-variant/25 shadow-card px-2.5 sm:px-4 py-3.5 sm:py-4 flex flex-col items-center justify-center gap-2"
          >
            <ShimmerBlock
              warm
              shimmerDelay={i * 0.1}
              className="h-6 sm:h-7 w-10 sm:w-12 rounded-lg"
            />
            <ShimmerBlock
              shimmerDelay={i * 0.1 + 0.04}
              className="h-3 w-14 sm:w-20 rounded-full"
            />
          </motion.div>
        ))}
      </div>

      {/* Ucapan cards skeleton */}
      <div className="grid gap-5">
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, idx) => (
          <motion.div
            key={idx}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.36,
              delay: 0.08 + idx * 0.07,
              ease: EASE_WARM,
            }}
            className="bg-white rounded-3xl border border-outline-variant/30 shadow-card overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row">
              {/* Thumbnail template placeholder */}
              <ShimmerBlock
                warm
                shimmerDelay={idx * 0.12}
                className="h-24 sm:h-auto sm:min-h-[164px] sm:w-32 shrink-0"
              />

              <div className="flex-1 p-5 md:p-6 min-w-0 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <ShimmerBlock
                        shimmerDelay={idx * 0.12 + 0.04}
                        className="h-5 w-36 sm:w-48 rounded-full"
                      />
                      <ShimmerBlock
                        warm
                        shimmerDelay={idx * 0.12 + 0.08}
                        className="h-5 w-20 rounded-full"
                      />
                    </div>
                    <ShimmerBlock
                      shimmerDelay={idx * 0.12 + 0.1}
                      className="h-4 w-56 sm:w-72 max-w-full rounded-full"
                    />
                  </div>

                  {/* Views pill placeholder */}
                  <ShimmerBlock
                    shimmerDelay={idx * 0.12 + 0.12}
                    className="h-8 w-16 rounded-full shrink-0"
                  />
                </div>

                {/* First-seen timestamp hint line */}
                <ShimmerBlock
                  shimmerDelay={idx * 0.12 + 0.14}
                  className="h-3.5 w-44 rounded-full"
                />

                {/* Action buttons row placeholder */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <ShimmerBlock
                    warm
                    shimmerDelay={idx * 0.12 + 0.16}
                    className="h-9 w-28 sm:w-32 rounded-full"
                  />
                  <ShimmerBlock
                    shimmerDelay={idx * 0.12 + 0.18}
                    className="h-9 w-9 rounded-full"
                  />
                  <ShimmerBlock
                    shimmerDelay={idx * 0.12 + 0.2}
                    className="h-9 w-12 rounded-full"
                  />
                  <ShimmerBlock
                    shimmerDelay={idx * 0.12 + 0.22}
                    className="h-9 w-9 rounded-full"
                  />
                  <ShimmerBlock
                    shimmerDelay={idx * 0.12 + 0.24}
                    className="h-9 w-9 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full-page loading skeleton shell rendered by `app/dashboard/loading.tsx` during
 * Next.js route transition / server auth check so SSR loading seamlessly hands off to
 * the exact same layout inside `Dashboard`.
 */
export function DashboardShellSkeleton() {
  return (
    <div className="min-h-screen bg-surface pt-24 pb-24 lg:pb-16">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10">
        <DashboardMobileHeader />
        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          <div className="hidden lg:block">
            <DashboardSidebar />
          </div>
          <DashboardContentSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * Motion shimmer skeleton for ReferralDashboard (`!loaded` and `/dashboard/referral/loading.tsx`).
 */
export function ReferralContentSkeleton() {
  const reduced = useReducedMotion();

  return (
    <div role="status" aria-busy="true" aria-label="Memuat data referral">
      <span className="sr-only">Memuat data referral…</span>

      {/* Kode & link card skeleton */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: EASE_WARM }}
        className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-5 sm:p-6 md:p-8 mb-6 space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <ShimmerBlock warm className="h-6 w-6 rounded-full" />
          <ShimmerBlock shimmerDelay={0.05} className="h-6 w-48 rounded-full" />
        </div>
        <ShimmerBlock warm shimmerDelay={0.1} className="h-12 w-44 rounded-2xl" />
        <div className="flex flex-col sm:flex-row gap-3">
          <ShimmerBlock warm shimmerDelay={0.14} className="h-11 w-full sm:w-44 rounded-full" />
          <ShimmerBlock shimmerDelay={0.18} className="h-11 w-full sm:w-44 rounded-full" />
        </div>
        <ShimmerBlock shimmerDelay={0.22} className="h-3.5 w-64 max-w-full rounded-full" />
      </motion.div>

      {/* 3 stats cards skeleton */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, delay: 0.06 + i * 0.05, ease: EASE_WARM }}
            className="bg-white rounded-2xl sm:rounded-3xl border border-outline-variant/30 shadow-card p-3.5 sm:p-6 flex flex-col items-center gap-2.5"
          >
            <ShimmerBlock warm shimmerDelay={i * 0.1} className="w-9 h-9 sm:w-11 sm:h-11 rounded-full" />
            <ShimmerBlock shimmerDelay={i * 0.1 + 0.05} className="h-6 sm:h-7 w-14 sm:w-20 rounded-lg" />
            <ShimmerBlock shimmerDelay={i * 0.1 + 0.1} className="h-3 w-12 sm:w-16 rounded-full" />
          </motion.div>
        ))}
      </div>

      {/* Cara kerja skeleton */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, delay: 0.16, ease: EASE_WARM }}
        className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-5 sm:p-6 md:p-8 space-y-4"
      >
        <ShimmerBlock className="h-6 w-36 rounded-full" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <ShimmerBlock warm shimmerDelay={i * 0.1} className="h-7 w-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <ShimmerBlock shimmerDelay={i * 0.1 + 0.04} className="h-4 w-full max-w-md rounded-full" />
              {i === 2 && (
                <ShimmerBlock shimmerDelay={i * 0.1 + 0.08} className="h-4 w-3/4 max-w-sm rounded-full" />
              )}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/** Static-header shell for `/dashboard/referral/loading.tsx`. */
export function ReferralPageLoadingShell() {
  return (
    <div className="min-h-screen bg-surface pt-24 pb-24 lg:pb-16">
      <div className="max-w-[900px] mx-auto px-5 md:px-16">
        <ReferralHeader />
        <ReferralContentSkeleton />
      </div>
    </div>
  );
}
