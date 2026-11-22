"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Sparkles } from "lucide-react";

export interface BoncengMalamInteractiveProps {
  chapterIdx: number;
  fromName: string;
  rideProgress?: number;
  isVisorDown?: boolean;
  holdDurationMs?: number;
  onAdvance?: () => void;
  onHoldProgress?: (progress: number) => void;
  className?: string;
}

/**
 * Lapisan gestur fisik per babak, digerakkan GSAP Draggable:
 * - Babak 0: tarik cincin helm ke bawah (mendekat ke kepala).
 * - Babak 1: geser gesper tali helm ke slot kunci.
 * - Babak 2: tarik kaca visor ke bawah.
 * - Babak 3: jarum spidometer mengikuti tekanan gas (tween GSAP).
 * - Babak 4: petunjuk ketuk jok (dibuka di layer artwork).
 */
export default function BoncengMalamInteractive({
  chapterIdx,
  fromName,
  rideProgress = 0,
  isVisorDown = false,
  holdDurationMs = 4500,
  onAdvance,
  onHoldProgress,
  className = "",
}: BoncengMalamInteractiveProps) {
  const strapRef = useRef<HTMLDivElement>(null);
  const visorRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<number | null>(null);

  // Callback terbaru tanpa membangun ulang Draggable setiap render.
  const cb = useRef({ onAdvance, onHoldProgress });
  cb.current = { onAdvance, onHoldProgress };

  // Babak 3: tahan tuas gas → progress, audio mesin, jarum spidometer.
  const startThrottle = () => {
    if (holdTimer.current) return;
    const started = Date.now();
    holdTimer.current = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - started) / holdDurationMs) * 100);
      setHoldProgress(p);
      cb.current.onHoldProgress?.(p);
      if (p >= 100) {
        if (holdTimer.current) window.clearInterval(holdTimer.current);
        holdTimer.current = null;
        cb.current.onAdvance?.();
      }
    }, 30);
  };

  const endThrottle = () => {
    if (holdTimer.current) window.clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHoldProgress(0);
    cb.current.onHoldProgress?.(0);
  };

  useEffect(
    () => () => {
      if (holdTimer.current) window.clearInterval(holdTimer.current);
    },
    [],
  );

  // Draggable dibuat dinamis: aman untuk SSR dan dibersihkan saat babak berganti.
  useEffect(() => {
    let cancelled = false;
    const created: DraggableInstance[] = [];

    const build = async () => {
      const { Draggable } = await import("gsap/Draggable");
      gsap.registerPlugin(Draggable);
      if (cancelled) return;

      const make = (
        el: HTMLElement | null,
        vars: Parameters<typeof Draggable.create>[1],
      ) => {
        if (!el) return;
        created.push(Draggable.create(el, vars)[0] as unknown as DraggableInstance);
      };

      const advance = () => cb.current.onAdvance?.();

      // --- Babak 1: geser gesper ke slot kunci ---
      if (chapterIdx === 1) {
        const track = strapRef.current?.parentElement;
        const maxX = track ? track.clientWidth - 56 : 180;
        make(strapRef.current, {
          type: "x",
          bounds: { minX: 0, maxX },
          onRelease(this: DragTarget) {
            if (this.x >= maxX - 8) {
              gsap.to(this.target, { x: maxX, duration: 0.18, ease: "power2.out" });
              window.setTimeout(advance, 260);
            } else {
              gsap.to(this.target, { x: 0, duration: 0.4, ease: "elastic.out(1, 0.6)" });
            }
          },
        });
      }

      // --- Babak 2: tarik visor ke bawah ---
      if (chapterIdx === 2) {
        make(visorRef.current, {
          type: "y",
          bounds: { minY: 0, maxY: 120 },
          onRelease(this: DragTarget) {
            if (this.y >= 80) {
              gsap.to(this.target, { y: 120, duration: 0.2, ease: "power2.in" });
              window.setTimeout(advance, 260);
            } else {
              gsap.to(this.target, { y: 0, duration: 0.4, ease: "elastic.out(1, 0.6)" });
            }
          },
        });
      }
    };

    void build();

    return () => {
      cancelled = true;
      created.forEach((d) => d.kill());
    };
  }, [chapterIdx]);

  // Jarum spidometer: tween tunggal dengan overwrite agar tidak menumpuk.
  const progress = chapterIdx === 3 ? holdProgress : rideProgress;
  const speedKmh = Math.round((progress / 100) * 85);
  const needleRotation = -110 + (speedKmh / 90) * 180;

  useEffect(() => {
    if (chapterIdx !== 3 || !needleRef.current) return;
    gsap.to(needleRef.current, {
      rotation: needleRotation,
      duration: 0.18,
      ease: "power2.out",
      overwrite: true,
    });
  }, [chapterIdx, needleRotation]);

  return (
    <div className={`relative w-full h-full pointer-events-auto select-none ${className}`}>
      {/* ============================================================ */}
      {/* BABAK 1: GESPER TALI HELM                                     */}
      {/* ============================================================ */}
      {chapterIdx === 1 && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 px-6">
          <div className="w-full max-w-xs bg-slate-900/85 border border-slate-700/80 rounded-2xl p-5 shadow-2xl flex flex-col items-center gap-4 backdrop-blur-sm">
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Kunci Gesper Helm
            </span>

            <div className="relative w-full h-16 bg-slate-950/80 border border-slate-800 rounded-full p-2 flex items-center overflow-hidden">
              <div className="absolute right-3 top-2.5 bottom-2.5 w-12 rounded-full border-2 border-dashed border-amber-400/80 bg-amber-500/20 flex items-center justify-center text-lg">
                🔒
              </div>
              <div
                ref={strapRef}
                style={{ touchAction: "none" }}
                className="w-12 h-12 rounded-full bg-rose-500 border-2 border-white shadow-md flex items-center justify-center text-white font-bold cursor-grab active:cursor-grabbing"
              >
                →
              </div>
            </div>

            <p className="text-xs text-slate-300 text-center">
              Tarik gesper merah ke kunci kanan sampai bunyi <span className="text-amber-300">klik</span>
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BABAK 2: TARIK VISOR KE BAWAH                                 */}
      {/* ============================================================ */}
      {chapterIdx === 2 && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 px-6">
          <div
            ref={visorRef}
            style={{ touchAction: "none" }}
            className="w-full max-w-xs bg-slate-900/85 border border-sky-400/50 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing"
          >
            <div className="w-16 h-1.5 rounded-full bg-sky-400/60" />
            <span className="text-sm font-semibold text-sky-200">
              {isVisorDown ? "Visor tertutup ✓" : "Tarik kaca visor ke bawah ↓"}
            </span>
            <div className="w-full h-12 rounded-xl bg-gradient-to-b from-sky-500/20 to-sky-900/40 border border-sky-300/30 flex items-center justify-center text-xs text-sky-300">
              {isVisorDown ? "Angin jalanan teredam" : "Geser ke bawah sebelum berangkat"}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BABAK 3: SPIDOMETER ANALOG                                   */}
      {/* ============================================================ */}
      {chapterIdx === 3 && (
        <div className="absolute inset-0 flex flex-col items-center justify-between pt-24 pb-24 pointer-events-none">
          <div className="w-36 h-36 rounded-full bg-slate-900/90 border-4 border-slate-700 shadow-2xl relative flex items-center justify-center">
            <span className="absolute top-2 text-[10px] font-mono text-slate-400">40</span>
            <span className="absolute left-2 text-[10px] font-mono text-slate-400">0</span>
            <span className="absolute right-2 text-[10px] font-mono text-slate-400">80</span>
            <span className="absolute bottom-6 text-[11px] font-mono font-bold text-amber-300">
              {speedKmh} km/h
            </span>

            <div
              ref={needleRef}
              className="absolute w-1 h-14 bg-rose-500 origin-bottom rounded-full shadow-lg"
              style={{ bottom: "50%", transform: "rotate(-110deg)" }}
            />
            <div className="w-4 h-4 rounded-full bg-slate-200 border-2 border-slate-900 z-10" />
          </div>

          {/* Tuas gas: tahan untuk melaju */}
          <button
            type="button"
            onPointerDown={startThrottle}
            onPointerUp={endThrottle}
            onPointerLeave={endThrottle}
            onPointerCancel={endThrottle}
            style={{ touchAction: "none" }}
            className="pointer-events-auto relative overflow-hidden w-44 h-14 rounded-full bg-white/15 border border-white/40 font-semibold text-sm text-white active:scale-95 transition-transform flex items-center justify-center shadow-lg backdrop-blur-sm"
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-primary/80"
              style={{ width: `${progress}%` }}
            />
            <span className="relative z-10">Pegangan Erat 🛵💨</span>
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* BABAK 4: PETUNJUK BUKA JOK                                   */}
      {/* ============================================================ */}
      {chapterIdx === 4 && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-28 pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-semibold flex items-center gap-1.5 shadow-lg animate-bounce">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ketuk untuk membuka jok — ada sesuatu dari {fromName}</span>
          </div>
        </div>
      )}
    </div>
  );
}

type DragTarget = { x: number; y: number; target: HTMLElement };
type DraggableInstance = { kill: () => void };
