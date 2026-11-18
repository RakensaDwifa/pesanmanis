"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import EntryGame from "@/components/EntryGame";
import CollectGame from "@/components/story/CollectGame";
import HoldGame from "@/components/story/HoldGame";
import { trackEvent } from "@/lib/analytics";
import {
  isStoryFinished,
  nextStage,
  storyGameFor,
  storyStepCount,
  type StoryGame,
} from "@/lib/story";
import type { TemplateCategory } from "@/lib/types";

const HINTS: Record<StoryGame, string> = {
  collect: "Cari 4 hati di sekitar layar, lalu ketuk satu per satu.",
  hold: "Tekan-tahan tombol tiup, atau ketuk beberapa kali cepat.",
};

const storyKey = (id: string) => `pm:story:${id}`;

/**
 * Cerita interaktif sebelum surat terbuka:
 * tahap 1 ketuk hati (semua template), tahap 2 game sesuai kategori.
 */
export default function StoryFlow({
  id,
  category,
  toName,
  onDone,
  persist = true,
}: {
  id: string;
  category: TemplateCategory | undefined;
  toName: string;
  onDone: () => void;
  persist?: boolean;
}) {
  const game = storyGameFor(category);
  const total = storyStepCount(game);
  const [stage, setStage] = useState(0);
  const [hint, setHint] = useState(false);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    if (persist !== false) {
      try {
        sessionStorage.setItem(storyKey(id), "1");
      } catch {
        /* ignore */
      }
    }
    trackEvent("story_finished", { category: category ?? "unknown", steps: total });
    onDone();
  };

  const advance = () => {
    const next = nextStage(stage, total);
    trackEvent("story_step_completed", { stage: stage + 1, category: category ?? "unknown" });
    if (isStoryFinished(next, total)) finish();
    else setStage(next);
  };

  // Petunjuk muncul setelah 8 detik tanpa interaksi.
  useEffect(() => {
    if (stage === 0) return;
    setHint(false);
    let timer = window.setTimeout(() => setHint(true), 8000);
    const reset = () => {
      window.clearTimeout(timer);
      setHint(false);
      timer = window.setTimeout(() => setHint(true), 8000);
    };
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [stage]);

  if (stage === 0) {
    return (
      <EntryGame
        toName={toName}
        onOpen={() => {
          trackEvent("story_step_completed", { stage: 1, category: category ?? "unknown" });
          if (total > 1) setStage(1);
          else finish();
        }}
      />
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-gradient-to-b from-[#FFF1F6] via-[#FFE0EC] to-[#FFD0C0] px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <p className="text-label-lg font-semibold text-on-surface-variant mb-8 text-center">
        Langkah {stage + 1} dari {total} untuk {toName}
      </p>

      <div className="flex items-center gap-2 mb-8" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all ${
              i <= stage ? "w-6 bg-[#D94B72]" : "w-2 bg-white/70"
            }`}
          />
        ))}
      </div>

      {game === "collect" && <CollectGame onComplete={advance} />}
      {game === "hold" && <HoldGame onComplete={advance} />}

      <AnimatePresence>
        {hint && game && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="mt-6 max-w-xs text-center text-label-md text-[#8B4A2F] bg-white/70 rounded-2xl px-4 py-2"
          >
            💡 {HINTS[game]}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={finish}
        className="mt-10 text-label-md text-on-surface-variant/70 underline underline-offset-4 hover:text-on-surface-variant"
      >
        Lewati
      </button>
    </motion.div>
  );
}
