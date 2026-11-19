"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import type { NarrativeChapter } from "./types";
import { sfx } from "./sound";
import ScratchCanvas from "./ScratchCanvas";
import { Sparkles, ArrowRight, Heart } from "lucide-react";

interface NarrativeEngineProps {
  chapters: NarrativeChapter[];
  onFinish: () => void;
  toName?: string;
  fromName?: string;
  renderUnderlay?: (chapterIndex: number) => ReactNode;
}

export default function NarrativeEngine({
  chapters,
  onFinish,
  toName = "Sayang",
  fromName = "Aku",
  renderUnderlay,
}: NarrativeEngineProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartRef = useRef<number>(0);
  const currentChapter = chapters[currentIdx];

  const advanceChapter = () => {
    setIsTransitioning(true);
    sfx.click();
    setTimeout(() => {
      if (currentIdx + 1 < chapters.length) {
        setCurrentIdx((prev) => prev + 1);
        setHoldProgress(0);
        setTapCount(0);
        setSelectedChoice(null);
      } else {
        sfx.chime();
        onFinish();
      }
      setIsTransitioning(false);
    }, 350);
  };

  // Reset state tiap ganti babak
  useEffect(() => {
    setHoldProgress(0);
    setTapCount(0);
    setSelectedChoice(null);
  }, [currentIdx]);

  // Handler Hold
  const startHold = () => {
    if (currentChapter?.type !== "hold") return;
    const duration = currentChapter.holdDurationMs || 2000;
    holdStartRef.current = Date.now();
    sfx.click();

    const interval = 30;
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setHoldProgress(progress);
      if (elapsed % 150 < 30) sfx.vibrate(8);

      if (progress >= 100) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        sfx.chime();
        advanceChapter();
      }
    }, interval);
  };

  const endHold = () => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    if (holdProgress < 100) {
      setHoldProgress(0);
    }
  };

  // Handler Tap Count
  const handleTap = () => {
    if (currentChapter?.type !== "tap_count") return;
    const nextCount = tapCount + 1;
    setTapCount(nextCount);
    sfx.pop();
    if (currentChapter.onProgress) {
      currentChapter.onProgress(nextCount, currentChapter.requiredTaps);
    }
    if (nextCount >= currentChapter.requiredTaps) {
      sfx.chime();
      advanceChapter();
    }
  };

  // Handler Choice
  const handleChoice = (optId: string) => {
    setSelectedChoice(optId);
    sfx.pop();
    setTimeout(() => {
      advanceChapter();
    }, 600);
  };

  if (!currentChapter) return null;

  return (
    <div className="relative w-full h-full min-h-[580px] flex flex-col justify-between overflow-hidden select-none p-5 sm:p-7 text-white">
      {/* Background Underlay (kustom per template, misal: animasi hujan/kaca/senja) */}
      <div className="absolute inset-0 z-0">
        {renderUnderlay ? renderUnderlay(currentIdx) : null}
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-colors duration-700 ${currentChapter.bgOverlay || ""}`} />
      </div>

      {/* Progress Bar Babak (Instagram-story style) */}
      <div className="relative z-10 w-full flex gap-1.5 pt-2">
        {chapters.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden transition-all duration-300"
          >
            <div
              className={`h-full bg-white transition-all duration-500 ${
                i < currentIdx ? "w-full" : i === currentIdx ? "w-full animate-pulse" : "w-0"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Konten Utama Interaktif */}
      <div
        className={`relative z-10 flex-1 flex flex-col items-center justify-center text-center my-auto transition-all duration-300 ${
          isTransitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
        }`}
      >
        {currentChapter.title && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wider uppercase mb-4 text-amber-200">
            <Sparkles className="w-3.5 h-3.5" />
            {currentChapter.title.replace("{toName}", toName).replace("{fromName}", fromName)}
          </span>
        )}

        <p className="font-heading text-xl sm:text-2xl md:text-3xl font-medium leading-relaxed max-w-md drop-shadow-md">
          {currentChapter.narration.replace("{toName}", toName).replace("{fromName}", fromName)}
        </p>

        {currentChapter.instruction && (
          <p className="text-xs sm:text-sm text-white/70 mt-3 animate-bounce">
            {currentChapter.instruction}
          </p>
        )}

        {/* INTERAKSI KHUSUS SESUAI TIPE BABAK */}

        {/* 1. Scratch / Embun Kaca */}
        {currentChapter.type === "scratch" && (
          <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-white/20 mt-6">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-500/20 to-rose-500/30 text-white">
              {currentChapter.underlayContent || (
                <div className="flex flex-col items-center gap-2">
                  <Heart className="w-10 h-10 text-rose-400 fill-rose-400 animate-pulse" />
                  <span className="font-heading text-lg font-bold text-center">
                    Untuk {toName} tersayang ✨
                  </span>
                </div>
              )}
            </div>
            <ScratchCanvas
              onComplete={advanceChapter}
              brushRadius={currentChapter.brushRadius || 30}
              thresholdPercent={currentChapter.thresholdPercent || 50}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        )}

        {/* 2. Hold Button */}
        {currentChapter.type === "hold" && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onPointerDown={startHold}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              className="relative overflow-hidden w-44 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/40 font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center shadow-lg"
            >
              <div
                className="absolute left-0 top-0 bottom-0 bg-primary/80 transition-all duration-75"
                style={{ width: `${holdProgress}%` }}
              />
              <span className="relative z-10 flex items-center gap-2">
                {currentChapter.buttonLabel || "Tahan di Sini"}
              </span>
            </button>
            <span className="text-[11px] text-white/60">Tahan tombol sampai penuh</span>
          </div>
        )}

        {/* 3. Tap Count */}
        {currentChapter.type === "tap_count" && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleTap}
              className="w-20 h-20 rounded-full bg-white/25 hover:bg-white/35 active:scale-90 border-2 border-white/60 flex items-center justify-center text-2xl shadow-xl transition-all"
            >
              👆
            </button>
            <div className="flex gap-1.5 mt-2">
              {Array.from({ length: currentChapter.requiredTaps }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i < tapCount ? "bg-amber-300 scale-110" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* 4. Choice / Kuis */}
        {currentChapter.type === "choice" && (
          <div className="mt-6 flex flex-col gap-2.5 w-full max-w-xs">
            {currentChapter.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleChoice(opt.id)}
                className={`py-3 px-4 rounded-xl text-sm font-semibold border backdrop-blur-md transition-all active:scale-95 ${
                  selectedChoice === opt.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white/15 hover:bg-white/25 border-white/30 text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigasi Bawah (khusus cinematic) */}
      <div className="relative z-10 flex justify-center pb-2">
        {currentChapter.type === "cinematic" && (
          <button
            type="button"
            onClick={advanceChapter}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-gray-900 font-semibold text-sm shadow-xl hover:bg-white/90 active:scale-95 transition-all"
          >
            <span>{currentChapter.buttonText || "Lanjut"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
