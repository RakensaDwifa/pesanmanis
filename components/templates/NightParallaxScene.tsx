"use client";

import React from "react";
import { RetroScooterSVG } from "./narrative-assets";

interface NightParallaxSceneProps {
  speedMultiplier?: number; // 0 = diam, 1 = normal ride, 2 = kencang
  activeLampIndex?: number;
  streetNote?: string;
  className?: string;
  showRider?: boolean;
}

/**
 * 5-Layer Parallax Malam Kota (CSS transform: translate3d 60fps)
 * Layer 1: Langit malam gradien #070B19 -> #111833 -> #1E1B3A + bintang kelap-kelip
 * Layer 2: Skyline gedung kota & pohon malam siluet (looping lambat)
 * Layer 3: Tiang lampu jalan & radial halo #FBBF24 (looping sedang)
 * Layer 4: Aspal jalanan & marka jalan putus-putus (looping cepat)
 * Layer 5: Motor skuter retro & pasangan berboncengan (animasi suspensi 1-2px)
 */
export default function NightParallaxScene({
  speedMultiplier = 0,
  activeLampIndex = 0,
  streetNote,
  className = "",
  showRider = true,
}: NightParallaxSceneProps) {
  const isMoving = speedMultiplier > 0;
  // Durasi animasi berdasarkan kecepatan
  const skyDuration = isMoving ? `${Math.max(12, 28 / speedMultiplier)}s` : "0s";
  const cityDuration = isMoving ? `${Math.max(6, 16 / speedMultiplier)}s` : "0s";
  const streetDuration = isMoving ? `${Math.max(1, 3.2 / speedMultiplier)}s` : "0s";
  const roadDuration = isMoving ? `${Math.max(0.4, 1.1 / speedMultiplier)}s` : "0s";

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-gradient-to-b from-[#070B19] via-[#111833] to-[#1E1B3A] ${className}`}
      style={{
        // CSS Custom variables untuk animasi performa tinggi
        ["--sky-dur" as string]: skyDuration,
        ["--city-dur" as string]: cityDuration,
        ["--street-dur" as string]: streetDuration,
        ["--road-dur" as string]: roadDuration,
      }}
    >
      {/* ============================================================ */}
      {/* LAYER 1: LANGIT MALAM & BINTANG KELAP-KELIP                    */}
      {/* ============================================================ */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Partikel bintang statis & kelap-kelip */}
        <div className="absolute inset-0 opacity-45 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.5)_1.5px,transparent_1.5px)] [background-size:54px_54px]" />
        {/* Bulan sabit lembut di pojok kanan atas */}
        <div className="absolute top-8 right-10 w-12 h-12 rounded-full bg-amber-100/10 blur-[1px] flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full shadow-[inset_4px_-4px_0_0_#FEF3C7] opacity-80" />
        </div>
      </div>

      {/* ============================================================ */}
      {/* LAYER 2: SILUET SKYLINE KOTA & POHON MALAM (Looping Lambat)   */}
      {/* ============================================================ */}
      <div className="absolute inset-x-0 bottom-24 h-44 pointer-events-none overflow-hidden">
        <div
          className={`flex w-[200%] h-full opacity-65 ${
            isMoving ? "animate-city-scroll" : ""
          }`}
          style={{ animationDuration: "var(--city-dur)" }}
        >
          {/* Unit SVG Skyline Kota 1 & 2 untuk seamless loop */}
          {[1, 2].map((k) => (
            <svg
              key={k}
              viewBox="0 0 500 160"
              preserveAspectRatio="none"
              className="w-1/2 h-full shrink-0"
              fill="none"
            >
              {/* Gedung-gedung bertingkat siluet gelap */}
              <rect x="10" y="70" width="35" height="90" fill="#0D1326" />
              <rect x="50" y="45" width="40" height="115" fill="#0B1020" />
              <rect x="95" y="80" width="30" height="80" fill="#0D1326" />
              <rect x="130" y="30" width="48" height="130" fill="#090E1C" />
              <polygon points="154,12 148,30 160,30" fill="#090E1C" />
              <rect x="185" y="65" width="45" height="95" fill="#0D1326" />
              <rect x="235" y="50" width="38" height="110" fill="#0B1020" />
              <rect x="280" y="85" width="42" height="75" fill="#0E152B" />
              <rect x="330" y="38" width="52" height="122" fill="#090E1C" />
              <rect x="390" y="60" width="40" height="100" fill="#0B1020" />
              <rect x="435" y="75" width="55" height="85" fill="#0D1326" />

              {/* Jendela-jendela kecil lampu gedung malam */}
              <circle cx="60" cy="60" r="1.5" fill="#FEF08A" opacity="0.6" />
              <circle cx="75" cy="75" r="1.5" fill="#FEF08A" opacity="0.4" />
              <circle cx="145" cy="50" r="1.5" fill="#FEF08A" opacity="0.7" />
              <circle cx="160" cy="70" r="1.5" fill="#FEF08A" opacity="0.5" />
              <circle cx="250" cy="70" r="1.5" fill="#FEF08A" opacity="0.6" />
              <circle cx="350" cy="55" r="1.5" fill="#FEF08A" opacity="0.5" />
              <circle cx="410" cy="80" r="1.5" fill="#FEF08A" opacity="0.6" />
            </svg>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* LAYER 3: TIANG LAMPU JALAN & RADIAL GLOW (Looping Sedang)     */}
      {/* ============================================================ */}
      <div className="absolute inset-x-0 bottom-20 h-64 pointer-events-none overflow-hidden">
        <div
          className={`flex w-[200%] h-full ${
            isMoving ? "animate-street-scroll" : ""
          }`}
          style={{ animationDuration: "var(--street-dur)" }}
        >
          {[1, 2].map((k) => (
            <div key={k} className="relative w-1/2 h-full shrink-0 flex justify-around items-end pb-8">
              {/* Tiang Lampu 1 */}
              <div className="relative flex flex-col items-center">
                {/* Halo Cahaya Bohlam Kuning Hangat */}
                <div className="absolute -top-12 w-36 h-36 rounded-full bg-amber-400/25 blur-2xl pointer-events-none" />
                <div className="w-1.5 h-44 bg-slate-700/80 rounded-t-sm" />
                <div className="w-6 h-3 bg-amber-300 rounded-b-md shadow-[0_0_16px_#FBBF24]" />
              </div>
              {/* Tiang Lampu 2 */}
              <div className="relative flex flex-col items-center">
                <div className="absolute -top-12 w-36 h-36 rounded-full bg-amber-400/25 blur-2xl pointer-events-none" />
                <div className="w-1.5 h-44 bg-slate-700/80 rounded-t-sm" />
                <div className="w-6 h-3 bg-amber-300 rounded-b-md shadow-[0_0_16px_#FBBF24]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Catatan / Teks Narasi Lampu Kota Melayang di Tengah */}
      {streetNote && isMoving && (
        <div className="absolute top-24 inset-x-4 flex flex-col items-center pointer-events-none z-20 animate-fade-in">
          <span className="text-[11px] font-mono tracking-wider text-amber-300 bg-black/65 px-3 py-1 rounded-full border border-amber-400/40 shadow-lg backdrop-blur-md">
            Lampu {activeLampIndex + 1} dari 5
          </span>
          <p className="text-sm text-amber-100 font-medium mt-2 text-center drop-shadow-md italic max-w-xs">
            &quot;{streetNote}&quot;
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* LAYER 4: ASPAL JALANAN & MARKA JALAN (Looping Cepat)           */}
      {/* ============================================================ */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[#0A0E1A] border-t border-slate-800/80 pointer-events-none overflow-hidden">
        {/* Garis Marka Putus-putus */}
        <div className="relative w-full h-full flex items-center">
          <div
            className={`flex w-[200%] gap-6 ${
              isMoving ? "animate-road-scroll" : ""
            }`}
            style={{ animationDuration: "var(--road-dur)" }}
          >
            {[1, 2].map((k) => (
              <div key={k} className="w-1/2 flex justify-between gap-6 px-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-10 h-1 bg-amber-400/70 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Kilau aspal basah malam */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-amber-500/10 pointer-events-none" />
      </div>

      {/* ============================================================ */}
      {/* LAYER 5: SILUET SKUTER RETRO & PASANGAN (Suspensi 1-2px)       */}
      {/* ============================================================ */}
      {showRider && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div
            className={`relative flex flex-col items-center ${
              isMoving ? "animate-suspension" : ""
            }`}
          >
            {/* Skuter Retro */}
            <RetroScooterSVG className="w-44 h-28 drop-shadow-[0_12px_28px_rgba(245,158,11,0.35)]" />
            {/* Sorot Lampu Depan Menyinari Aspal */}
            <div className="absolute -right-8 bottom-3 w-32 h-10 bg-gradient-to-r from-amber-200/40 to-transparent blur-md -rotate-12 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Stylesheet Keyframes Inline (Zero External Library) */}
      <style jsx>{`
        @keyframes cityScroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        @keyframes streetScroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        @keyframes roadScroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        @keyframes suspensionBounce {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -2px, 0);
          }
        }
        .animate-city-scroll {
          animation: cityScroll linear infinite;
        }
        .animate-street-scroll {
          animation: streetScroll linear infinite;
        }
        .animate-road-scroll {
          animation: roadScroll linear infinite;
        }
        .animate-suspension {
          animation: suspensionBounce 0.3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
