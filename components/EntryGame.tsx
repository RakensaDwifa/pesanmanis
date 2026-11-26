"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { trackEvent } from "@/lib/analytics";
import { BRAND } from "@/lib/brand";
import { playSfx } from "@/lib/sfx";

const TAPS_NEEDED = 3;
const SPARK_EMOJIS = ["💖", "✨", "🌸", "💕", "⭐"];

interface Spark {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

export default function EntryGame({
  toName,
  onOpen,
}: {
  toName: string;
  onOpen: () => void;
}) {
  const [taps, setTaps] = useState(0);
  const [opening, setOpening] = useState(false);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const sparkId = useRef(0);

  const finish = useCallback(() => {
    setOpening(true);
    playSfx("open");
    trackEvent("entry_opened", { toName });
    window.setTimeout(onOpen, 650);
  }, [onOpen, toName]);

  const tap = useCallback(() => {
    if (opening) return;
    playSfx("tap");
    const id = sparkId.current++;
    const spark: Spark = {
      id,
      x: (Math.random() - 0.5) * 160,
      y: (Math.random() - 0.5) * 90,
      emoji: SPARK_EMOJIS[id % SPARK_EMOJIS.length],
    };
    setSparks((s) => [...s, spark]);
    window.setTimeout(() => {
      setSparks((s) => s.filter((sp) => sp.id !== id));
    }, 900);
    setTaps((t) => {
      const next = t + 1;
      if (next >= TAPS_NEEDED) finish();
      return next;
    });
  }, [opening, finish]);

  const progress = Math.min(taps / TAPS_NEEDED, 1);

  return (
    <motion.div
      data-light-card
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-gradient-to-b from-[#FFF1F6] via-[#FFE0EC] to-[#FFD0C0] text-[#55443c]"
      initial={{ opacity: 1 }}
      animate={opening ? { opacity: 0, scale: 1.15 } : { opacity: 1 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-label-lg font-semibold text-on-surface-variant mb-10 text-center px-6"
      >
        Ada sesuatu untuk {toName} 💌
      </motion.p>

      <div className="relative">
        {/* sparkles */}
        <AnimatePresence>
          {sparks.map((s) => (
            <motion.span
              key={s.id}
              className="pointer-events-none absolute left-1/2 top-1/2 select-none text-2xl"
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
              animate={{ x: s.x, y: s.y - 120, opacity: 0, scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              {s.emoji}
            </motion.span>
          ))}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={tap}
          aria-label="Ketuk untuk membuka ucapan"
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          className="relative grid place-items-center w-40 h-40 rounded-full bg-white/70 backdrop-blur-md shadow-[0_18px_50px_rgba(217,75,114,0.35)] border border-white/60"
          style={{ cursor: opening ? "default" : "pointer" }}
        >
          <motion.span
            className="text-7xl"
            animate={
              opening
                ? { scale: 2.2, opacity: 0 }
                : { scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }
            }
            transition={
              opening
                ? { duration: 0.6 }
                : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
            }
          >
            💗
          </motion.span>

          {/* progress ring */}
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" />
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="#D94B72"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 48}
              strokeDashoffset={2 * Math.PI * 48 * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.3s ease" }}
            />
          </svg>
        </motion.button>
      </div>

      <p className="text-body-md text-on-surface-variant mt-10 text-center px-6">
        {taps === 0
          ? "Ketuk hati ini 3 kali untuk membukanya ✨"
          : `Tahan sebentar... (${Math.min(taps, TAPS_NEEDED)}/${TAPS_NEEDED})`}
      </p>

      <button
        type="button"
        onClick={finish}
        className="mt-8 text-label-md text-on-surface-variant/70 underline underline-offset-4 hover:text-on-surface-variant"
      >
        Lewati
      </button>

      <p className="absolute bottom-6 text-label-sm text-on-surface-variant/60">
        {BRAND.name}
      </p>
    </motion.div>
  );
}
