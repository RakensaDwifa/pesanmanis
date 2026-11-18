"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { playSfx } from "@/lib/sfx";

const CANDLES = 3;

/** Birthday: tekan-tahan untuk meniup 3 lilin (bisa juga diketuk berkali-kali). */
export default function HoldGame({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const done = useRef(false);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    []
  );

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const add = (delta: number) => {
    setProgress((p) => {
      const next = Math.min(100, p + delta);
      if (next >= 100 && !done.current) {
        done.current = true;
        stop();
        playSfx("open");
        window.setTimeout(onComplete, 500);
      }
      return next;
    });
  };

  const start = () => {
    if (timer.current || done.current) return;
    playSfx("tap");
    timer.current = setInterval(() => add(3), 50);
  };

  const blown = Math.floor((progress / 100) * CANDLES);

  return (
    <div className="w-full max-w-xs flex flex-col items-center">
      <div className="flex items-end justify-center gap-5 h-40">
        {Array.from({ length: CANDLES }, (_, i) => {
          const isOut = i < blown;
          return (
            <div key={i} className="flex flex-col items-center">
              <motion.span
                className="text-2xl"
                animate={
                  isOut
                    ? { opacity: 0, y: -18, scale: 0.5 }
                    : { opacity: 1, y: 0, scale: [1, 1.15, 1] }
                }
                transition={{ duration: 0.4 }}
                aria-hidden
              >
                {isOut ? "💨" : "🔥"}
              </motion.span>
              <span className="w-6 h-20 rounded-t-md bg-gradient-to-b from-[#FFD9A8] to-[#E8A86B] mt-1" aria-hidden />
            </div>
          );
        })}
      </div>

      <div className="w-full h-2 rounded-full bg-white/60 overflow-hidden mt-5">
        <div
          className="h-full bg-[#D94B72] transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-label-md text-on-surface-variant" role="status" aria-live="polite">
        {blown}/{CANDLES} lilin padam
      </p>

      <button
        type="button"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onClick={() => add(20)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") start();
        }}
        onKeyUp={stop}
        aria-label="Tahan untuk meniup lilin"
        className="mt-6 px-6 py-3 rounded-full bg-[#D94B72] text-white text-label-lg font-semibold shadow-lg active:scale-95 transition-transform"
      >
        Tahan untuk tiup 💨
      </button>
      <p className="mt-3 text-label-sm text-on-surface-variant/70 text-center">
        Tahan tombol sampai semua lilin padam
      </p>
    </div>
  );
}
