"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";
import { getCountdownParts } from "@/lib/unlock-schedule";

const emptySubscribe = () => () => {};
const ZERO_PARTS = { days: 0, hours: 0, minutes: 0, seconds: 0, total: 1 };

interface CountdownGateProps {
  toName: string;
  unlockAt: string;
  clockOffsetMs?: number;
  onUnlocked: () => void;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatUnlockDate(iso: string, timeZone?: string): string {
  try {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      ...(timeZone ? { timeZone } : {}),
    });
    const timeStr = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      ...(timeZone ? { timeZone } : {}),
    });
    return `${dateStr} pukul ${timeStr}`;
  } catch {
    return iso;
  }
}

export default function CountdownGate({
  toName,
  unlockAt,
  clockOffsetMs = 0,
  onUnlocked,
}: CountdownGateProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [parts, setParts] = useState(() =>
    getCountdownParts(unlockAt, Date.now() + clockOffsetMs)
  );
  const onUnlockedRef = useRef(onUnlocked);
  const notifiedRef = useRef(false);

  useEffect(() => {
    onUnlockedRef.current = onUnlocked;
  }, [onUnlocked]);

  const notifyOnce = useCallback(() => {
    if (notifiedRef.current) return;
    notifiedRef.current = true;
    onUnlockedRef.current();
  }, []);

  const tick = useCallback(() => {
    const p = getCountdownParts(unlockAt, Date.now() + clockOffsetMs);
    setParts(p);
    if (p.total <= 0) {
      notifyOnce();
    }
  }, [unlockAt, clockOffsetMs, notifyOnce]);

  useEffect(() => {
    if (parts.total <= 0) {
      notifyOnce();
      return;
    }
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick, parts.total, notifyOnce]);

  const displayParts = isClient ? parts : ZERO_PARTS;
  const unlockDateLabel = isClient
    ? formatUnlockDate(unlockAt)
    : formatUnlockDate(unlockAt, "Asia/Jakarta");

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-[#F7F0EB] relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Warm radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(222,112,56,0.13) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full text-center"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#DE7038]/12 motion-reduce:transition-none">
          <Clock className="h-7 w-7 text-[#DE7038]" strokeWidth={1.6} />
        </div>

        {/* Greeting */}
        <div className="space-y-2">
          <p className="text-[#8B5E42]/70 text-sm font-medium tracking-wide uppercase">
            Ada pesan manis untuk
          </p>
          <h1 className="font-heading italic text-display-sm text-[#3D1E0F] leading-tight">
            {toName} 🌸
          </h1>
        </div>

        {/* Countdown */}
        <div className="w-full">
          <p className="text-[#8B5E42]/60 text-xs font-medium mb-4 uppercase tracking-widest">
            Terbuka dalam
          </p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: displayParts.days, label: "Hari" },
              { value: displayParts.hours, label: "Jam" },
              { value: displayParts.minutes, label: "Menit" },
              { value: displayParts.seconds, label: "Detik" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div className="w-full rounded-2xl bg-white/80 border border-[#DE7038]/20 shadow-sm py-3 px-1">
                  <span
                    className="font-heading italic tabular-nums text-[2rem] leading-none text-[#DE7038]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {pad(value)}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-[#8B5E42]/60 uppercase tracking-wider">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled time */}
        <p className="text-[#8B5E42]/70 text-sm leading-relaxed">
          Akan terbuka pada{" "}
          <span className="font-semibold text-[#DE7038]">{unlockDateLabel}</span>
        </p>

        {/* Decorative hint */}
        <p className="text-[#8B5E42]/40 text-xs italic">
          Halaman ini akan terbuka otomatis saat waktunya tiba ✨
        </p>
      </motion.div>
    </motion.div>
  );
}
