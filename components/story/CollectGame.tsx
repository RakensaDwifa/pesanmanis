"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { playSfx } from "@/lib/sfx";

const SPOTS = [
  { left: "8%", top: "62%" },
  { left: "74%", top: "18%" },
  { left: "44%", top: "4%" },
  { left: "62%", top: "74%" },
];

/** Love Message: cari 4 hati yang tersembunyi di sekitar layar. */
export default function CollectGame({ onComplete }: { onComplete: () => void }) {
  const [found, setFound] = useState<number[]>([]);

  const tap = (i: number) => {
    if (found.includes(i)) return;
    playSfx("tap");
    const next = [...found, i];
    setFound(next);
    if (next.length === SPOTS.length) {
      playSfx("open");
      window.setTimeout(onComplete, 600);
    }
  };

  return (
    <div className="w-full max-w-xs">
      <div className="relative w-full h-72">
        {SPOTS.map((spot, i) => {
          const isFound = found.includes(i);
          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => tap(i)}
              aria-label={isFound ? `Hati ${i + 1} sudah ditemukan` : `Cari hati ${i + 1}`}
              aria-pressed={isFound}
              className="absolute grid place-items-center w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full select-none"
              style={spot}
              animate={
                isFound
                  ? { scale: [1, 1.6, 0.9], opacity: 0.35 }
                  : { scale: [1, 1.12, 1], opacity: 1 }
              }
              transition={
                isFound
                  ? { duration: 0.5 }
                  : { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }
              }
            >
              <span className="text-4xl drop-shadow-sm" aria-hidden>
                {isFound ? "✨" : "💖"}
              </span>
            </motion.button>
          );
        })}
        <AnimatePresence>
          {found.length === SPOTS.length && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-x-0 bottom-0 text-center text-label-lg font-semibold text-[#D94B72]"
            >
              Semua hati ketemu! 💞
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-2 text-center text-label-md text-on-surface-variant" role="status" aria-live="polite">
        {found.length}/{SPOTS.length} hati ditemukan
      </p>
    </div>
  );
}
