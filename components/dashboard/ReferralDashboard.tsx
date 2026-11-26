"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Copy, Gift, Users, Wallet } from "lucide-react";
import { AnalyticsEvents } from "@/lib/analytics";
import {
  REFERRAL_MAX_REWARDED_PER_REFERRER,
  REFERRAL_REWARD_AMOUNT,
} from "@/lib/referral-policy";
import { EASE_WARM } from "@/components/landing/MotionPrimitives";
import { ReferralHeader } from "./DashboardShellChrome";
import { ReferralContentSkeleton } from "./DashboardSkeleton";

interface Stats {
  invited: number;
  completed: number;
  earned: number;
  balance?: number;
}

export default function ReferralDashboard() {
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    invited: 0,
    completed: 0,
    earned: 0,
    balance: 0,
  });
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    fetch("/api/referral")
      .then(async (r) => {
        const json = await r.json();
        if (json.ok) {
          setCode(json.code);
          setStats(json.stats);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const link =
    code && typeof window !== "undefined"
      ? `${window.location.origin}/templates?ref=${code}`
      : "";

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-surface pt-24 pb-24 lg:pb-16">
      <div className="max-w-[900px] mx-auto px-5 md:px-16">
        <ReferralHeader />

        <AnimatePresence mode="wait" initial={false}>
          {!loaded ? (
            <motion.div
              key="referral-skeleton"
              initial={reduced ? { opacity: 0 } : { opacity: 0.92 }}
              animate={{ opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE_WARM }}
            >
              <ReferralContentSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="referral-content"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, ease: EASE_WARM }}
            >
              {/* Kode & link */}
              <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-5 sm:p-6 md:p-8 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-title-lg text-on-surface">
                    Kode Referral Kamu
                  </h2>
                </div>

                {code ? (
                  <>
                    <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-surface-container-low mb-4">
                      <span className="font-mono text-title-md font-bold tracking-wider text-primary">
                        {code}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          copyLink();
                          AnalyticsEvents.referralShared(code);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-label-lg font-semibold shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
                      >
                        <Copy className="h-4 w-4" />
                        {copied ? "Tersalin!" : "Salin Link Referral"}
                      </button>
                      <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-surface-container-low text-on-surface text-label-lg font-semibold hover:bg-surface-container transition-colors"
                      >
                        Kembali ke Dashboard
                      </Link>
                    </div>
                    {link && (
                      <p className="text-label-md text-on-surface-variant mt-4 break-all">
                        {link}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-body-md text-red-600 dark:text-red-400">
                    Gagal memuat kode referral. Coba refresh halaman.
                  </p>
                )}
              </div>

              {/* Statistik */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
                {[
                  { icon: Users, label: "Diundang", value: String(stats.invited) },
                  {
                    icon: Gift,
                    label: "Transaksi",
                    value: String(stats.completed),
                  },
                  {
                    icon: Wallet,
                    label: "Saldo",
                    value: `Rp ${(stats.balance ?? stats.earned).toLocaleString("id-ID")}`,
                  },
                ].map(({ icon: Icon, label, value }, idx) => (
                  <motion.div
                    key={label}
                    initial={reduced ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.32,
                      delay: 0.04 + idx * 0.05,
                      ease: EASE_WARM,
                    }}
                    className="bg-white rounded-2xl sm:rounded-3xl border border-outline-variant/30 shadow-card p-3.5 sm:p-6 text-center"
                  >
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-primary-fixed/40 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <p className="font-heading text-title-md sm:text-headline-md text-on-surface truncate">
                      {value}
                    </p>
                    <p className="text-[11px] sm:text-label-md text-on-surface-variant mt-0.5 sm:mt-1 truncate">
                      {label}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Cara kerja */}
              <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-5 sm:p-6 md:p-8">
                <h2 className="font-heading text-title-lg text-on-surface mb-4">
                  Cara Kerjanya
                </h2>
                <ol className="space-y-3 list-none">
                  {[
                    "Bagikan link referral kamu ke teman-temanmu.",
                    "Teman mendaftar lewat link dan membuat ucapan pertamanya.",
                    `Setelah pembayaran temanmu berhasil, saldo Rp ${REFERRAL_REWARD_AMOUNT.toLocaleString("id-ID")} otomatis masuk ke akunmu (maks. ${REFERRAL_MAX_REWARDED_PER_REFERRER} teman) dan otomatis memotong tagihan checkout berikutnya.`,
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-white text-label-lg font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-body-md text-on-surface-variant pt-1">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
