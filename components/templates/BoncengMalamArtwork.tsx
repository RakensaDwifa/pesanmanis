"use client";

import React from "react";

export type RideState = "parked" | "cruising" | "fast" | "seat-open";

export interface BoncengMalamArtworkProps {
  rideState?: RideState;
  helmetLocked?: boolean;
  visorDown?: boolean;
  receiverLabel?: string;
  lampIndex?: number;
  lampNote?: string;
  /** Sudut pandang penumpang (berdiri di depan motor) untuk Babak 0. */
  pov?: boolean;
  className?: string;
}

/**
 * Komponen Karya Seni Inline SVG + Animasi CSS Murni untuk Template Bonceng Malam.
 * Zero Heavy Library, 100% responsif mobile (viewBox 0 0 400 680), hardware-accelerated 60fps.
 */
export default function BoncengMalamArtwork({
  rideState = "parked",
  helmetLocked = false,
  visorDown = false,
  receiverLabel = "Sayang",
  lampIndex = 0,
  lampNote,
  pov = false,
  className = "",
}: BoncengMalamArtworkProps) {
  const isMoving = rideState === "cruising" || rideState === "fast";
  const isFast = rideState === "fast";
  const isSeatOpen = rideState === "seat-open";

  // Label nama yang dipotong aman max 10 karakter agar muat presisi di stiker helm
  const safeLabel = (receiverLabel || "Kamu").slice(0, 10);

  // Parameter durasi animasi sesuai status kecepatan
  const citySpeed = isFast ? "8s" : isMoving ? "16s" : "0s";
  const lampSpeed = isFast ? "1.6s" : isMoving ? "3.2s" : "0s";
  const roadSpeed = isFast ? "0.5s" : isMoving ? "1.1s" : "0s";
  const wheelSpeed = isFast ? "0.25s" : isMoving ? "0.6s" : "0s";
  const suspensionSpeed = isFast ? "0.18s" : isMoving ? "0.32s" : "1.8s";

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-gradient-to-b from-[#070B19] via-[#111833] to-[#1E1B3A] ${className}`}
      style={{
        ["--city-spd" as string]: citySpeed,
        ["--lamp-spd" as string]: lampSpeed,
        ["--road-spd" as string]: roadSpeed,
        ["--wheel-spd" as string]: wheelSpeed,
        ["--susp-spd" as string]: suspensionSpeed,
      }}
    >
      <svg
        viewBox="0 0 400 680"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradien Langit Malam */}
          <linearGradient id="skyGrad" x1="200" y1="0" x2="200" y2="680" gradientUnits="userSpaceOnUse">
            <stop stopColor="#070B19" />
            <stop offset="0.45" stopColor="#111833" />
            <stop offset="0.8" stopColor="#1A1835" />
            <stop offset="1" stopColor="#0C0E1A" />
          </linearGradient>

          {/* Gradien Sorot Lampu Jalan */}
          <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#FBBF24" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
          </radialGradient>

          {/* Gradien Sorot Lampu Depan Skuter */}
          <linearGradient id="headlightBeam" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#FDE047" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
          </linearGradient>

          {/* Gradien Bodi Skuter Retro Kuning Hangat */}
          <linearGradient id="scooterPaint" x1="100" y1="480" x2="280" y2="560" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" />
            <stop offset="0.65" stopColor="#D97706" />
            <stop offset="1" stopColor="#92400E" />
          </linearGradient>

          {/* Gradien Helm Pengendara & Penumpang */}
          <linearGradient id="helmetRider" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#38BDF8" />
            <stop offset="1" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient id="helmetPassenger" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#F43F5E" />
            <stop offset="1" stopColor="#BE123C" />
          </linearGradient>

          {/* --- Gradien Khusus Adegan POV Babak 0 --- */}
          {/* Cahaya hangat lampu jalan di belakang rider */}
          <radialGradient id="povWarmGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.45" />
            <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>

          {/* Sorot lampu depan menerangi aspal ke arah kamera */}
          <radialGradient id="povBeam" cx="0.5" cy="0.3" r="0.7">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.75" />
            <stop offset="55%" stopColor="#FDE047" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
          </radialGradient>

          {/* Jaket rider */}
          <linearGradient id="jacketGrad" x1="200" y1="250" x2="200" y2="560" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B4A62" />
            <stop offset="0.5" stopColor="#1E293B" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>

          {/* Vignette hangat tepi frame */}
          <radialGradient id="povVignette" cx="0.5" cy="0.44" r="0.75">
            <stop offset="0.42" stopColor="#05070F" stopOpacity="0" />
            <stop offset="1" stopColor="#05070F" stopOpacity="0.82" />
          </radialGradient>
        </defs>

        {/* Latar Belakang Gradien */}
        <rect width="400" height="680" fill="url(#skyGrad)" />

        {/* ============================================================ */}
        {/* LAYER 1: LANGIT, BULAN SABIT & BINTANG BERKELIP              */}
        {/* ============================================================ */}
        <g id="sky-layer">
          {/* Bulan Sabit Bernuansa Hangat */}
          <g transform="translate(320, 70)">
            <circle cx="0" cy="0" r="24" fill="#FEF3C7" fillOpacity="0.08" filter="blur(3px)" />
            <circle cx="0" cy="0" r="16" fill="#FEF3C7" fillOpacity="0.85" />
            <circle cx="6" cy="-4" r="14" fill="#0E1428" />
          </g>

          {/* Bintang-bintang Kecil dengan Animasi Twinkle */}
          <circle cx="45" cy="90" r="1.5" fill="#FFFFFF" className="anim-twinkle-1" />
          <circle cx="120" cy="60" r="2" fill="#FEF08A" className="anim-twinkle-2" />
          <circle cx="180" cy="110" r="1.5" fill="#FFFFFF" className="anim-twinkle-3" />
          <circle cx="260" cy="80" r="1.2" fill="#BAE6FD" className="anim-twinkle-1" />
          <circle cx="85" cy="140" r="1.8" fill="#FFFFFF" className="anim-twinkle-2" />
          <circle cx="210" cy="160" r="1.5" fill="#FEF08A" className="anim-twinkle-3" />
          <circle cx="340" cy="150" r="2" fill="#FFFFFF" className="anim-twinkle-1" />
          <circle cx="30" cy="210" r="1.2" fill="#BAE6FD" className="anim-twinkle-2" />
          <circle cx="150" cy="220" r="1.6" fill="#FFFFFF" className="anim-twinkle-3" />
          <circle cx="370" cy="230" r="1.5" fill="#FEF08A" className="anim-twinkle-1" />
        </g>

        {/* ============================================================ */}
        {/* LAYER 2: SILUET KOTA & POHON MALAM (Looping Parallax)        */}
        {/* ============================================================ */}
        <g id="city-layer" transform="translate(0, 360)">
          <g className={isMoving ? "anim-city-loop" : ""}>
            {/* Set 1 */}
            <g transform="translate(0, 0)">
              <rect x="0" y="30" width="45" height="110" fill="#0B1226" />
              <rect x="40" y="10" width="50" height="130" fill="#080D1D" />
              <polygon points="65,-5 58,10 72,10" fill="#080D1D" />
              <rect x="85" y="45" width="40" height="95" fill="#0E162D" />
              <rect x="120" y="25" width="55" height="115" fill="#090E1F" />
              <rect x="170" y="55" width="45" height="85" fill="#0C1329" />
              <rect x="210" y="20" width="50" height="120" fill="#080E1E" />
              <rect x="255" y="48" width="45" height="92" fill="#0D152C" />
              <rect x="295" y="15" width="55" height="125" fill="#080D1C" />
              <rect x="345" y="40" width="55" height="100" fill="#0C1329" />
              {/* Jendela Lampu Gedung */}
              <circle cx="55" cy="35" r="1.5" fill="#FEF08A" opacity="0.6" />
              <circle cx="70" cy="55" r="1.5" fill="#FEF08A" opacity="0.5" />
              <circle cx="140" cy="45" r="1.5" fill="#FEF08A" opacity="0.7" />
              <circle cx="230" cy="50" r="1.5" fill="#FEF08A" opacity="0.5" />
              <circle cx="315" cy="40" r="1.5" fill="#FEF08A" opacity="0.6" />
            </g>
            {/* Set 2 untuk seamless continuous loop */}
            <g transform="translate(400, 0)">
              <rect x="0" y="30" width="45" height="110" fill="#0B1226" />
              <rect x="40" y="10" width="50" height="130" fill="#080D1D" />
              <polygon points="65,-5 58,10 72,10" fill="#080D1D" />
              <rect x="85" y="45" width="40" height="95" fill="#0E162D" />
              <rect x="120" y="25" width="55" height="115" fill="#090E1F" />
              <rect x="170" y="55" width="45" height="85" fill="#0C1329" />
              <rect x="210" y="20" width="50" height="120" fill="#080E1E" />
              <rect x="255" y="48" width="45" height="92" fill="#0D152C" />
              <rect x="295" y="15" width="55" height="125" fill="#080D1C" />
              <rect x="345" y="40" width="55" height="100" fill="#0C1329" />
              <circle cx="55" cy="35" r="1.5" fill="#FEF08A" opacity="0.6" />
              <circle cx="70" cy="55" r="1.5" fill="#FEF08A" opacity="0.5" />
              <circle cx="140" cy="45" r="1.5" fill="#FEF08A" opacity="0.7" />
              <circle cx="230" cy="50" r="1.5" fill="#FEF08A" opacity="0.5" />
              <circle cx="315" cy="40" r="1.5" fill="#FEF08A" opacity="0.6" />
            </g>
          </g>
        </g>

        {/* ============================================================ */}
        {/* LAYER 3: TIANG LAMPU JALAN & RADIAL GLOW (Looping Parallax)  */}
        {/* ============================================================ */}
        <g id="lamp-layer" transform="translate(0, 310)">
          <g className={isMoving ? "anim-lamp-loop" : ""}>
            {/* Lampu 1 */}
            <g transform="translate(140, 0)">
              <circle cx="0" cy="45" r="75" fill="url(#lampGlow)" />
              <path d="M0 45 L0 230" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
              <path d="M0 45 C0 30 15 20 28 20 C36 20 42 26 42 34" stroke="#475569" strokeWidth="3" />
              <path d="M30 34 H54 L50 48 H34 Z" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
              <circle cx="42" cy="50" r="6" fill="#FEF08A" />
            </g>
            {/* Lampu 2 (jarak 400px untuk seamless loop) */}
            <g transform="translate(540, 0)">
              <circle cx="0" cy="45" r="75" fill="url(#lampGlow)" />
              <path d="M0 45 L0 230" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
              <path d="M0 45 C0 30 15 20 28 20 C36 20 42 26 42 34" stroke="#475569" strokeWidth="3" />
              <path d="M30 34 H54 L50 48 H34 Z" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
              <circle cx="42" cy="50" r="6" fill="#FEF08A" />
            </g>
          </g>
        </g>

        {/* ============================================================ */}
        {/* LAYER 4: ASPAL & MARKA JALAN (Looping Cepat)                 */}
        {/* ============================================================ */}
        <g id="road-layer" transform="translate(0, 535)">
          {/* Badan Jalan Aspal */}
          <rect x="0" y="0" width="400" height="145" fill="#0A0E18" />
          <line x1="0" y1="0" x2="400" y2="0" stroke="#1E293B" strokeWidth="2" />
          {/* Garis Marka Putus-putus Bergerak */}
          <g className={isMoving ? "anim-road-loop" : ""}>
            <g transform="translate(0, 55)">
              <rect x="0" y="0" width="48" height="6" rx="3" fill="#FBBF24" opacity="0.8" />
              <rect x="80" y="0" width="48" height="6" rx="3" fill="#FBBF24" opacity="0.8" />
              <rect x="160" y="0" width="48" height="6" rx="3" fill="#FBBF24" opacity="0.8" />
              <rect x="240" y="0" width="48" height="6" rx="3" fill="#FBBF24" opacity="0.8" />
              <rect x="320" y="0" width="48" height="6" rx="3" fill="#FBBF24" opacity="0.8" />
              <rect x="400" y="0" width="48" height="6" rx="3" fill="#FBBF24" opacity="0.8" />
              <rect x="480" y="0" width="48" height="6" rx="3" fill="#FBBF24" opacity="0.8" />
              <rect x="560" y="0" width="48" height="6" rx="3" fill="#FBBF24" opacity="0.8" />
              <rect x="640" y="0" width="48" height="6" rx="3" fill="#FBBF24" opacity="0.8" />
              <rect x="720" y="0" width="48" height="6" rx="3" fill="#FBBF24" opacity="0.8" />
            </g>
          </g>
          {/* Pantulan Cahaya Aspal Basah Malam */}
          <rect x="0" y="0" width="400" height="145" fill="url(#lampGlow)" opacity="0.12" />
        </g>

        {/* ============================================================ */}
        {/* LAYER 5: SUBJEK UTAMA                                        */}
        {/* - pov=true  → adegan POV penumpang (Babak 0)                  */}
        {/* - pov=false → skuter side-view saat perjalanan                */}
        {/* ============================================================ */}
        {pov ? (
          <g id="pov-scene">
            {/* Cahaya hangat lampu jalan di belakang rider */}
            <circle cx="200" cy="300" r="250" fill="url(#povWarmGlow)" />

            {/* Kabut tipis melayang */}
            <ellipse cx="120" cy="440" rx="140" ry="26" fill="#93C5FD" opacity="0.12" className="anim-mist" />
            <ellipse cx="292" cy="386" rx="110" ry="20" fill="#FDE68A" opacity="0.1" className="anim-mist-slow" />

            <g className="anim-idle-breath">
              {/* Rim light di belakang bahu rider */}
              <ellipse cx="200" cy="262" rx="132" ry="120" fill="#F59E0B" opacity="0.16" filter="blur(12px)" />

              {/* Torso jaket rider */}
              <path
                d="M158 288 C158 252 178 232 200 232 C222 232 242 252 242 288 L258 500 H142 Z"
                fill="url(#jacketGrad)"
                stroke="#475569"
                strokeWidth="2.5"
              />
              {/* Rim light keemasan di bahu kanan */}
              <path d="M242 288 C242 252 222 232 200 232" stroke="#FCD34D" strokeWidth="3.5" strokeLinecap="round" opacity="0.6" fill="none" />
              {/* Kerah, resleting & jahitan */}
              <path d="M170 268 C176 288 224 288 230 268" stroke="#64748B" strokeWidth="2.5" fill="none" />
              <line x1="200" y1="284" x2="200" y2="500" stroke="#0B1220" strokeWidth="3" opacity="0.55" />
              <path d="M154 344 C164 356 174 360 184 360" stroke="#334155" strokeWidth="2.5" fill="none" />
              <path d="M246 344 C236 356 226 360 216 360" stroke="#334155" strokeWidth="2.5" fill="none" />

              {/* Leher */}
              <rect x="187" y="210" width="26" height="28" rx="11" fill="#E5A886" />

              {/* Kepala: helm biru, visor terbuka, senyum (di atas area teks) */}
              <g transform="translate(0, -74)">
                {/* Batok helm */}
                <circle cx="200" cy="232" r="55" fill="url(#helmetRider)" stroke="#38BDF8" strokeWidth="3" />
                {/* Striping helm */}
                <path d="M152 208 C170 182 230 182 248 208" stroke="#E0F2FE" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.75" />
                {/* Sorot helm */}
                <ellipse cx="178" cy="200" rx="15" ry="9" fill="#FFFFFF" opacity="0.35" transform="rotate(-22 178 200)" />
                {/* Bantalan pipi helm */}
                <path d="M172 250 C172 272 186 282 196 282 L196 240 Z" fill="#0369A1" opacity="0.75" />
                <path d="M228 250 C228 272 214 282 204 282 L204 240 Z" fill="#0369A1" opacity="0.75" />
                {/* Wajah terlihat lewat visor terbuka */}
                <ellipse cx="200" cy="248" rx="23" ry="28" fill="#F5C9A8" />
                {/* Alis */}
                <path d="M188 240 Q193 236 198 240" stroke="#3F2A1D" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                <path d="M202 240 Q207 236 212 240" stroke="#3F2A1D" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                {/* Mata */}
                <ellipse cx="192" cy="248" rx="4" ry="4.6" fill="#1F2937" />
                <ellipse cx="208" cy="248" rx="4" ry="4.6" fill="#1F2937" />
                <circle cx="193.2" cy="246.6" r="1.4" fill="#FFFFFF" />
                <circle cx="209.2" cy="246.6" r="1.4" fill="#FFFFFF" />
                {/* Hidung */}
                <path d="M200 251 L198 257 Q200 259 202 257" stroke="#D08B5B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                {/* Senyum */}
                <path d="M192 265 Q200 272 208 265" stroke="#B45309" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                {/* Dagu helm */}
                <path d="M176 272 Q200 284 224 272 L224 280 Q200 292 176 280 Z" fill="#0369A1" stroke="#38BDF8" strokeWidth="1.5" />
                {/* Visor terbuka (terangkat ke dahi) */}
                <path d="M162 218 C178 196 222 196 238 218 L238 206 C222 184 178 184 162 206 Z" fill="#0F172A" stroke="#7DD3FC" strokeWidth="2" />
                {/* Engsel visor */}
                <circle cx="160" cy="214" r="4" fill="#0EA5E9" />
                <circle cx="240" cy="214" r="4" fill="#0EA5E9" />
              </g>

              {/* Lengan kiri rider memegang stang */}
              <path d="M240 300 C262 340 292 400 316 462" stroke="#1E293B" strokeWidth="25" strokeLinecap="round" />
              <path d="M240 300 C262 340 292 400 316 462" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" opacity="0.3" />

              {/* Lengan kanan rider terulur menawarkan helm */}
              <path d="M160 300 C146 342 146 396 152 430" stroke="#1E293B" strokeWidth="26" strokeLinecap="round" />
              <path d="M160 300 C146 342 146 396 152 430" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" opacity="0.35" />

              {/* Helm penumpang yang ditawarkan (dekat kamera, berlabel toName) */}
              <g transform="translate(104, 458)">
                <circle cx="0" cy="0" r="44" fill="url(#helmetPassenger)" stroke="#FDA4AF" strokeWidth="2.5" />
                {/* Striping putih */}
                <path d="M-32 -8 C-14 -26 14 -26 32 -8" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.85" />
                {/* Sorot cahaya */}
                <ellipse cx="-14" cy="-20" rx="13" ry="8" fill="#FFFFFF" opacity="0.35" transform="rotate(-24 -14 -20)" />
                {/* Stiker nama penerima */}
                <rect x="-29" y="-6" width="58" height="17" rx="4.5" fill="#0F172A" opacity="0.92" />
                <text
                  x="0"
                  y="7"
                  textAnchor="middle"
                  fill="#FEF08A"
                  fontSize="10.5"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  letterSpacing="0.2"
                >
                  {safeLabel.slice(0, 8)}
                </text>
                {/* Visor helm */}
                <path d="M-26 16 C-9 9 9 9 26 16 L21 30 C6 23 -6 23 -21 30 Z" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
                {/* Tali & gesper */}
                <path d="M-12 40 C-12 52 12 52 12 40" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                <circle cx="0" cy="48" r="4.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.2" />
              </g>

              {/* Tangan rider memegang sisi helm */}
              <circle cx="150" cy="430" r="14" fill="#F3C6A5" stroke="#D08B5B" strokeWidth="1.5" />

              {/* Stang kemudi, spion & spidometer (di depan badan rider) */}
              <path d="M52 496 Q200 522 348 496" stroke="#CBD5E1" strokeWidth="10" strokeLinecap="round" fill="none" />
              <path d="M52 496 Q200 522 348 496" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35" />
              <rect x="34" y="478" width="46" height="26" rx="13" fill="#1E293B" stroke="#475569" strokeWidth="2" />
              <rect x="320" y="478" width="46" height="26" rx="13" fill="#1E293B" stroke="#475569" strokeWidth="2" />
              {/* Spion kiri & kanan */}
              <path d="M62 488 L46 448" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="43" cy="438" rx="15" ry="11" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" transform="rotate(-12 43 438)" />
              <path d="M338 488 L354 448" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="357" cy="438" rx="15" ry="11" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" transform="rotate(12 357 438)" />
              {/* Spidometer */}
              <rect x="176" y="470" width="48" height="28" rx="11" fill="#0F172A" stroke="#475569" strokeWidth="2" opacity="0.95" />
              <circle cx="200" cy="484" r="7.5" fill="#1E293B" stroke="#FBBF24" strokeWidth="1.5" />
            </g>

            {/* Bodi depan skuter & lampu menyala ke kamera */}
            <path
              d="M150 526 C158 504 178 496 200 496 C222 496 242 504 250 526 L262 606 H138 Z"
              fill="url(#scooterPaint)"
              stroke="#FCD34D"
              strokeWidth="2.5"
            />
            {/* Panel dalam & garis bodi */}
            <path d="M162 536 C170 520 230 520 238 536 L246 598 H154 Z" fill="#B45309" opacity="0.35" />
            <path d="M154 590 H246" stroke="#FCD34D" strokeWidth="2" opacity="0.45" />
            {/* Sorot lampu menerangi aspal */}
            <ellipse cx="200" cy="612" rx="160" ry="62" fill="url(#povBeam)" opacity="0.45" />
            {/* Lampu depan bulat */}
            <circle cx="200" cy="556" r="33" fill="#FEF08A" stroke="#F59E0B" strokeWidth="4.5" className="anim-headlight-pulse" />
            <circle cx="200" cy="556" r="24" fill="none" stroke="#FBBF24" strokeWidth="2" opacity="0.7" />
            <circle cx="200" cy="556" r="17" fill="#FFFBEB" opacity="0.95" />
            {/* Spatbor depan */}
            <ellipse cx="200" cy="648" rx="98" ry="32" fill="#D97706" stroke="#FCD34D" strokeWidth="3" />
            <path d="M164 646 H236" stroke="#B45309" strokeWidth="3" opacity="0.5" />

            {/* Vignette hangat tepi frame */}
            <rect width="400" height="680" fill="url(#povVignette)" />
          </g>
        ) : (
        <g id="bike-subject" transform="translate(75, 455)">
          {/* Animasi Getar Suspensi Bodi Skuter */}
          <g className={isMoving ? "anim-suspension" : "anim-idle-breath"}>
            {/* Sorotan Lampu Depan Menembus Malam */}
            <polygon points="205,82 340,30 340,150 205,92" fill="url(#headlightBeam)" />

            {/* RODA BELAKANG (Bisa Berputar) */}
            <g transform="translate(42, 134)">
              <circle cx="0" cy="0" r="22" fill="#1E293B" stroke="#475569" strokeWidth="3" />
              <circle cx="0" cy="0" r="13" fill="#F8FAFC" />
              <circle cx="0" cy="0" r="5" fill="#0F172A" />
              {/* Velg Jari-jari Berputar */}
              <g className={isMoving ? "anim-wheel-spin" : ""}>
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#64748B" strokeWidth="2" />
                <line x1="0" y1="-12" x2="0" y2="12" stroke="#64748B" strokeWidth="2" />
              </g>
            </g>

            {/* RODA DEPAN (Bisa Berputar) */}
            <g transform="translate(192, 134)">
              <circle cx="0" cy="0" r="22" fill="#1E293B" stroke="#475569" strokeWidth="3" />
              <circle cx="0" cy="0" r="13" fill="#F8FAFC" />
              <circle cx="0" cy="0" r="5" fill="#0F172A" />
              <g className={isMoving ? "anim-wheel-spin" : ""}>
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#64748B" strokeWidth="2" />
                <line x1="0" y1="-12" x2="0" y2="12" stroke="#64748B" strokeWidth="2" />
              </g>
            </g>

            {/* BODI BAWAH & DEK TENGAH */}
            <path d="M72 130 H148 L158 98 H125 L115 130 Z" fill="#D97706" />
            <path d="M25 125 C25 90 45 80 82 80 C110 80 128 98 132 130 L25 126 Z" fill="url(#scooterPaint)" stroke="#FCD34D" strokeWidth="1.5" />
            <circle cx="75" cy="105" r="8" fill="#B45309" opacity="0.6" />

            {/* KNALPOT RETRO & EMISI TIPIS */}
            <rect x="18" y="130" width="35" height="7" rx="3" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
            <circle cx="16" cy="133.5" r="2.5" fill="#334155" />
            {isMoving && (
              <g className="anim-exhaust">
                <circle cx="6" cy="132" r="3" fill="#FEF3C7" opacity="0.5" />
                <circle cx="-4" cy="129" r="4.5" fill="#FEF3C7" opacity="0.3" />
              </g>
            )}

            {/* SAYAP DEPAN & GARPU KEMUDI */}
            <path d="M148 126 C152 102 165 78 180 62 L186 66 L168 130 Z" fill="#D97706" stroke="#FCD34D" strokeWidth="1.5" />
            <path d="M168 116 C168 104 182 98 202 104 C208 118 204 134 204 134 L168 116 Z" fill="#B45309" />

            {/* STANG, SPION, & LAMPU DEPAN BULAT */}
            <path d="M180 62 L184 48" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
            {/* Spion Kiri */}
            <path d="M178 50 L170 38" stroke="#94A3B8" strokeWidth="2" />
            <circle cx="169" cy="37" r="4.5" fill="#E2E8F0" stroke="#64748B" strokeWidth="1" />
            {/* Lampu Depan Bulat */}
            <circle cx="194" cy="46" r="10" fill="#FEF08A" stroke="#F59E0B" strokeWidth="2.5" />
            <circle cx="194" cy="46" r="6" fill="#FFFFFF" opacity="0.8" />
            {/* Lampu Belakang Merah */}
            <rect x="20" y="104" width="6" height="11" rx="2.5" fill="#EF4444" stroke="#991B1B" strokeWidth="1" />

            {/* ============================================================ */}
            {/* PENGENDARA (DRIVER) DI DEPAN                                 */}
            {/* ============================================================ */}
            <g id="driver-figure">
              {/* Badan & Jaket Pengendara */}
              <path
                d="M110 88 C110 50 128 32 152 34 C162 35 174 48 178 68 L155 92 H110 Z"
                fill="#1E293B"
                stroke="#334155"
                strokeWidth="2"
              />
              {/* Lengan Jaket ke Stang Kemudi */}
              <path
                d="M142 48 C155 52 168 55 180 50"
                stroke="#334155"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <circle cx="180" cy="50" r="5" fill="#475569" />

              {/* Helm Pengendara Biru */}
              <g transform="translate(142, 18)">
                <circle cx="0" cy="0" r="17" fill="url(#helmetRider)" stroke="#38BDF8" strokeWidth="2" />
                {/* Visor Pengendara (Bisa Terbuka/Tertutup) */}
                <path
                  d={
                    visorDown
                      ? "M-2 4 C6 2 14 6 15 10 L12 14 C5 12 -1 10 -2 4 Z"
                      : "M-2 -2 C6 -4 14 -2 15 2 L13 6 C5 2 -1 2 -2 -2 Z"
                  }
                  fill="#0F172A"
                  stroke="#7DD3FC"
                  strokeWidth="1"
                  className="transition-all duration-300"
                />
              </g>
            </g>

            {/* ============================================================ */}
            {/* JOK MOTOR & MAWAR RAHASIA (Bisa Terbuka 'seat-open')         */}
            {/* ============================================================ */}
            <g id="seat-compartment">
              {/* Kompartemen Bawah Jok */}
              <rect x="42" y="74" width="70" height="15" rx="3" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />

              {/* Mawar Rahasia di Dalam Jok (Muncul saat isSeatOpen) */}
              <g
                transform="translate(74, 68)"
                className={`transition-all duration-700 ease-out ${
                  isSeatOpen ? "opacity-100 scale-100 -translate-y-6" : "opacity-0 scale-50 translate-y-2 pointer-events-none"
                }`}
              >
                {/* Cahaya Pendar Mawar */}
                <circle cx="0" cy="0" r="16" fill="#F43F5E" fillOpacity="0.3" filter="blur(4px)" />
                {/* Kelopak Mawar Merah */}
                <circle cx="0" cy="0" r="8" fill="#E11D48" />
                <circle cx="-2" cy="-2" r="5" fill="#BE123C" />
                <circle cx="1" cy="1" r="2.5" fill="#FDA4AF" />
                <path d="M-6 4 C-10 8 -4 12 0 8" stroke="#16A34A" strokeWidth="2" fill="none" />
                <path d="M4 5 C8 9 2 13 0 8" stroke="#15803D" strokeWidth="2" fill="none" />
              </g>

              {/* Bodi Jok Motor (Berotasi Buka ke Atas Depan jika isSeatOpen) */}
              <g
                className="transition-transform duration-700 ease-in-out"
                style={{
                  transformOrigin: "115px 78px",
                  transform: isSeatOpen ? "rotate(-46deg)" : "rotate(0deg)",
                }}
              >
                {/* Jok Kulit Hitam Berjahit */}
                <path
                  d="M40 76 C40 70 55 67 85 67 C112 67 122 72 122 77 C122 81 40 81 40 76 Z"
                  fill="#1E293B"
                  stroke="#334155"
                  strokeWidth="2"
                />
                <line x1="58" y1="71" x2="58" y2="76" stroke="#475569" strokeWidth="1.5" />
                <line x1="88" y1="70" x2="88" y2="76" stroke="#475569" strokeWidth="1.5" />
              </g>
            </g>

            {/* ============================================================ */}
            {/* HELM PENUMPANG (DENGAN LABEL NAMA PENERIMA & TALI HELM)      */}
            {/* ============================================================ */}
            <g id="passenger-helmet" transform="translate(85, 34)">
              {/* Bayangan Helm */}
              <ellipse cx="0" cy="28" rx="14" ry="4" fill="#000000" opacity="0.4" />

              {/* Batok Helm Penumpang Bogo Pink/Rose */}
              <circle cx="0" cy="8" r="16" fill="url(#helmetPassenger)" stroke="#FDA4AF" strokeWidth="2" />
              {/* Garis Striping Putih Klasik */}
              <path d="M-12 2 C-5 -4 5 -4 12 2" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

              {/* Stiker Nama Penerima Terpotong Aman (Max 10 Char) */}
              <g transform="translate(0, 8)">
                <rect x="-14" y="-4" width="28" height="8" rx="2" fill="#0F172A" opacity="0.85" />
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fill="#FEF08A"
                  fontSize="6.5"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  letterSpacing="0.2"
                >
                  {safeLabel}
                </text>
              </g>

              {/* Visor Kaca Depan */}
              <path
                d="M-4 12 C2 10 10 12 12 16 L9 18 C3 16 -2 15 -4 12 Z"
                fill="#0F172A"
                stroke="#38BDF8"
                strokeWidth="1"
              />

              {/* Tali Helm & Indikator Kuncian Gesper */}
              <path
                d="M-8 16 C-8 25 8 25 8 16"
                stroke={helmetLocked ? "#10B981" : "#F59E0B"}
                strokeWidth="2.5"
                strokeLinecap="round"
                className="transition-colors duration-300"
              />
              {/* Gesper Kancing Hijau Saat Terkunci */}
              <circle
                cx="0"
                cy="22"
                r="3"
                fill={helmetLocked ? "#10B981" : "#EF4444"}
                stroke="#FFFFFF"
                strokeWidth="1"
                className="transition-colors duration-300"
              />
            </g>
          </g>
        </g>
        )}
      </svg>

      {/* Stylesheet Keyframes Terisolasi (Hardware Accelerated translate3d) */}
      <style jsx>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(0.8);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.3);
          }
        }
        .anim-twinkle-1 {
          animation: twinkle 2.2s ease-in-out infinite;
        }
        .anim-twinkle-2 {
          animation: twinkle 3.1s ease-in-out infinite 0.7s;
        }
        .anim-twinkle-3 {
          animation: twinkle 2.7s ease-in-out infinite 1.4s;
        }

        @keyframes cityMove {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-400px, 0, 0);
          }
        }
        .anim-city-loop {
          animation: cityMove var(--city-spd) linear infinite;
        }

        @keyframes lampMove {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-400px, 0, 0);
          }
        }
        .anim-lamp-loop {
          animation: lampMove var(--lamp-spd) linear infinite;
        }

        @keyframes roadMove {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-400px, 0, 0);
          }
        }
        .anim-road-loop {
          animation: roadMove var(--road-spd) linear infinite;
        }

        @keyframes wheelSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .anim-wheel-spin {
          animation: wheelSpin var(--wheel-spd) linear infinite;
        }

        @keyframes suspensionVibe {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -1.8px, 0);
          }
        }
        .anim-suspension {
          animation: suspensionVibe var(--susp-spd) ease-in-out infinite;
        }

        @keyframes idleBreath {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -0.8px, 0);
          }
        }
        .anim-idle-breath {
          animation: idleBreath var(--susp-spd) ease-in-out infinite;
        }

        @keyframes exhaustPuff {
          0% {
            opacity: 0.6;
            transform: translate3d(0, 0, 0) scale(0.6);
          }
          100% {
            opacity: 0;
            transform: translate3d(-18px, -8px, 0) scale(1.6);
          }
        }
        .anim-exhaust {
          animation: exhaustPuff 0.6s ease-out infinite;
        }

        @keyframes mistDrift {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
            opacity: 0.09;
          }
          50% {
            transform: translate3d(30px, -8px, 0);
            opacity: 0.18;
          }
        }
        .anim-mist {
          animation: mistDrift 9s ease-in-out infinite;
        }
        .anim-mist-slow {
          animation: mistDrift 13s ease-in-out infinite reverse;
        }

        @keyframes headlightPulse {
          0%,
          100% {
            opacity: 0.88;
          }
          50% {
            opacity: 1;
          }
        }
        .anim-headlight-pulse {
          animation: headlightPulse 2.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
