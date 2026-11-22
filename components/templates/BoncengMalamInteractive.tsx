"use client";

import React, { useState } from "react";
import { useDrag } from "@use-gesture/react";
import { Sparkles, Heart } from "lucide-react";

export interface BoncengMalamInteractiveProps {
  chapterIdx: number;
  toName: string;
  fromName: string;
  rideProgress?: number;
  isVisorDown?: boolean;
  onAdvance?: () => void;
  onHoldProgress?: (progress: number) => void;
  className?: string;
}

/**
 * Komponen Interaktif Visual per Babak untuk Bonceng Malam:
 * - Babak 0: Drag Helm dari tangan rider ke arah bawah (ke kepala pengguna)
 * - Babak 1: Drag tali gesper helm kiri ke kanan sampai 'KLIK!'
 * - Babak 2: Swipe ke bawah untuk menutup kaca visor helm POV
 * - Babak 3: Tahan tuas gas / spidometer analog bergerak naik & lampu jalan melesat
 * - Babak 4: Ketuk gembok jok motor untuk membuka bagasi mawar & surat
 */
export default function BoncengMalamInteractive({
  chapterIdx,
  toName,
  fromName,
  rideProgress = 0,
  isVisorDown = false,
  onAdvance,
  onHoldProgress,
  className = "",
}: BoncengMalamInteractiveProps) {
  // Babak 0: Drag Helm
  const [helmOffset, setHelmOffset] = useState({ x: 0, y: 0 });
  const [helmWorn, setHelmWorn] = useState(false);

  // Babak 1: Gesper Tali Helm
  const [strapX, setStrapX] = useState(0);
  const [strapLocked, setStrapLocked] = useState(false);

  // Babak 2: Visor Swipe Down
  const [visorY, setVisorY] = useState(isVisorDown ? 120 : 0);
  const [visorClosed, setVisorClosed] = useState(isVisorDown);

  // Gesture Drag Helm (Babak 0)
  const bindDragHelm = useDrag(
    ({ movement: [mx, my], down, canceled }) => {
      if (helmWorn) return;
      if (down) {
        // Hanya izinkan drag ke arah bawah
        const clampedY = Math.max(0, Math.min(180, my));
        const clampedX = Math.max(-50, Math.min(50, mx * 0.4));
        setHelmOffset({ x: clampedX, y: clampedY });

        // Jika ditarik lebih dari 120px ke bawah, helm terpasang!
        if (clampedY >= 120) {
          setHelmWorn(true);
          if (onAdvance) {
            setTimeout(onAdvance, 400);
          }
        }
      } else if (!canceled) {
        if (!helmWorn) {
          setHelmOffset({ x: 0, y: 0 });
        }
      }
    },
    { filterTaps: true }
  );

  // Gesture Gesper Helm (Babak 1)
  const bindDragStrap = useDrag(
    ({ movement: [mx], down }) => {
      if (strapLocked) return;
      const maxX = 180;
      if (down) {
        const clampedX = Math.max(0, Math.min(maxX, mx));
        setStrapX(clampedX);
        if (clampedX >= maxX - 10) {
          setStrapLocked(true);
          if (onAdvance) {
            setTimeout(onAdvance, 450);
          }
        }
      } else {
        if (!strapLocked) setStrapX(0);
      }
    },
    { filterTaps: true }
  );

  // Gesture Swipe Visor Down (Babak 2)
  const bindSwipeVisor = useDrag(
    ({ movement: [, my], down }) => {
      if (visorClosed) return;
      const maxY = 130;
      if (down) {
        const clampedY = Math.max(0, Math.min(maxY, my));
        setVisorY(clampedY);
        if (clampedY >= maxY - 15) {
          setVisorClosed(true);
          if (onAdvance) {
            setTimeout(onAdvance, 450);
          }
        }
      } else {
        if (!visorClosed) setVisorY(0);
      }
    },
    { filterTaps: true }
  );

  // Kecepatan spidometer di Babak 3 (0 - 90 km/h)
  const speedKmh = Math.round((rideProgress / 100) * 85);
  // Rotasi jarum dari -110 derajat (0 km/h) ke +70 derajat (90 km/h)
  const needleRotation = -110 + (speedKmh / 90) * 180;

  return (
    <div className={`relative w-full h-full pointer-events-auto select-none ${className}`}>
      {/* ============================================================ */}
      {/* BABAK 0: DRAG HELM KE KEPALA PENUMPANG                       */}
      {/* ============================================================ */}
      {chapterIdx === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-28">
          <div
            {...bindDragHelm()}
            style={{
              transform: `translate3d(${helmOffset.x}px, ${helmOffset.y}px, 0)`,
              touchAction: "none",
            }}
            className="cursor-grab active:cursor-grabbing flex flex-col items-center"
          >
            {/* Area drag transparan alami mengikuti gestur user tanpa teks dobel */}
            <div className="relative w-64 h-64 rounded-full flex items-center justify-center">
              {/* Efek visual glow saat disentuh/ditarik */}
              {helmOffset.y > 10 && (
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-300/60 bg-amber-400/10 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BABAK 1: GESPER TALI HELM (SLIDE TO SNAP)                     */}
      {/* ============================================================ */}
      {chapterIdx === 1 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/60 backdrop-blur-[2px]">
          <div className="w-full max-w-xs bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-2xl flex flex-col items-center gap-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Kunci Gesper Helm
            </span>

            {/* Slider Track Gesper */}
            <div className="relative w-full h-16 bg-slate-950/80 border border-slate-800 rounded-full p-2 flex items-center shadow-inner overflow-hidden">
              {/* Target Kunci Kanan */}
              <div className="absolute right-3 top-2.5 bottom-2.5 w-12 rounded-full border-2 border-dashed border-amber-400/80 bg-amber-500/20 flex items-center justify-center text-lg">
                🔒
              </div>

              {/* Tali yang Ditarik */}
              <div
                {...bindDragStrap()}
                style={{
                  transform: `translate3d(${strapX}px, 0, 0)`,
                  touchAction: "none",
                }}
                className="w-12 h-12 rounded-full bg-rose-500 border-2 border-white shadow-md flex items-center justify-center text-white font-bold cursor-grab active:cursor-grabbing active:scale-95"
              >
                {strapLocked ? "✓" : "→"}
              </div>
            </div>

            <p className="text-xs text-slate-300 text-center">
              {strapLocked ? "KLIK! Helm terkunci kencang & aman ✨" : "Tarik gesper merah ke arah kunci kanan"}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BABAK 2: SWIPE DOWN MENUTUP KACA VISOR                       */}
      {/* ============================================================ */}
      {chapterIdx === 2 && (
        <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-auto">
          {/* Pegangan Visor di Atas */}
          <div
            {...bindSwipeVisor()}
            style={{
              transform: `translate3d(0, ${visorY}px, 0)`,
              touchAction: "none",
            }}
            className="w-full max-w-xs mx-auto mt-12 bg-slate-900/85 border border-sky-400/50 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing"
          >
            <div className="w-16 h-1.5 rounded-full bg-sky-400/60 mb-1" />
            <span className="text-sm font-semibold text-sky-200">
              {visorClosed ? "Kaca Visor Tertutup Rapat ✓" : "Tarik Kaca Visor ke Bawah ↓"}
            </span>
            <div className="w-full h-12 rounded-xl bg-gradient-to-b from-sky-500/20 to-sky-900/40 border border-sky-300/30 flex items-center justify-center text-xs text-sky-300">
              {visorClosed ? "CLACK! Angin jalanan teredam 🛡️" : "Geser ke bawah agar terhindar debu"}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BABAK 3: SPIDOMETER ANALOG & TUAS GAS KOKPIT                 */}
      {/* ============================================================ */}
      {chapterIdx === 3 && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-6 pointer-events-none">
          {/* Spidometer Analog di Atas */}
          <div className="w-36 h-36 rounded-full bg-slate-900/90 border-4 border-slate-700 shadow-2xl relative flex items-center justify-center mt-6">
            {/* Tanda Angka */}
            <span className="absolute top-2 text-[10px] font-mono text-slate-400">40</span>
            <span className="absolute left-2 text-[10px] font-mono text-slate-400">0</span>
            <span className="absolute right-2 text-[10px] font-mono text-slate-400">80</span>
            <span className="absolute bottom-6 text-[11px] font-mono font-bold text-amber-300">
              {speedKmh} km/h
            </span>

            {/* Jarum Merah Berputar */}
            <div
              className="absolute w-1 h-14 bg-rose-500 origin-bottom transition-transform duration-75 rounded-full shadow-lg"
              style={{
                transform: `rotate(${needleRotation}deg)`,
                bottom: "50%",
              }}
            />
            {/* Titik Poros Jarum */}
            <div className="w-4 h-4 rounded-full bg-slate-200 border-2 border-slate-900 z-10" />
          </div>

          {/* Efek Garis Kecepatan (Speedlines) saat Gas Ditekan */}
          {rideProgress > 20 && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
              <div className="w-full h-full animate-pulse bg-gradient-to-b from-transparent via-amber-300/10 to-transparent" />
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* BABAK 4: BUKA JOK MOTOR & SURAT RAHASIA                      */}
      {/* ============================================================ */}
      {chapterIdx === 4 && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 pointer-events-auto">
          <div className="px-4 py-2 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-semibold mb-3 flex items-center gap-1.5 shadow-lg animate-bounce">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ketuk jok belakang untuk membuka</span>
          </div>
        </div>
      )}
    </div>
  );
}
