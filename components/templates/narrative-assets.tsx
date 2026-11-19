import React from "react";

/**
 * Helm Retro Bogo / Vintage dengan visor kaca
 */
export function RetroHelmetSVG({
  visorOpen = false,
  className = "w-28 h-28",
}: {
  visorOpen?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Batok Helm Luar */}
      <path
        d="M20 70C20 38 40 20 62 20C84 20 102 38 102 70C102 85 96 95 86 98C82 99 76 94 62 94C48 94 40 99 36 98C24 95 20 85 20 70Z"
        fill="url(#helmetGrad)"
        stroke="#FCD34D"
        strokeWidth="2.5"
      />
      {/* Garis Striping Retro Klasik */}
      <path
        d="M32 35C42 27 52 24 62 24C72 24 82 27 92 35"
        stroke="#FEF3C7"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M36 43C44 37 53 34 62 34C71 34 80 37 88 43"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Bagian Busa / Lubang Wajah */}
      <rect
        x="32"
        y="50"
        width="60"
        height="38"
        rx="14"
        fill="#0F172A"
        stroke="#334155"
        strokeWidth="2"
      />

      {/* Visor Kaca Helm (Animasi Turun / Naik) */}
      <g
        className="transition-transform duration-500 ease-out"
        style={{
          transform: visorOpen ? "translateY(-14px)" : "translateY(0px)",
        }}
      >
        <path
          d="M30 48C30 48 42 44 62 44C82 44 94 48 94 48C96 52 96 74 92 84C90 88 84 90 62 90C40 90 34 88 32 84C28 74 28 52 30 48Z"
          fill="url(#visorGrad)"
          fillOpacity="0.85"
          stroke="#93C5FD"
          strokeWidth="1.5"
        />
        {/* Kilau Cahaya Kaca */}
        <path
          d="M40 54L36 78"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <circle cx="62" cy="85" r="2.5" fill="#FCD34D" />
      </g>

      {/* Tali Helm & Kancing Gesper */}
      <path
        d="M35 88C35 98 46 104 60 105C74 104 85 98 85 88"
        stroke="#475569"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="60" cy="105" r="4.5" fill="#F59E0B" stroke="#78350F" strokeWidth="1.5" />

      {/* Gradients */}
      <defs>
        <linearGradient id="helmetGrad" x1="20" y1="20" x2="102" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="0.6" stopColor="#D97706" />
          <stop offset="1" stopColor="#78350F" />
        </linearGradient>
        <linearGradient id="visorGrad" x1="30" y1="44" x2="94" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E293B" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#38BDF8" stopOpacity="0.4" />
          <stop offset="1" stopColor="#0F172A" stopOpacity="0.95" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Siluet Skuter Retro Vintage (Vespa Style)
 */
export function RetroScooterSVG({ className = "w-32 h-20" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Roda Belakang */}
      <circle cx="38" cy="74" r="16" fill="#1E293B" stroke="#64748B" strokeWidth="3" />
      <circle cx="38" cy="74" r="8" fill="#F8FAFC" />
      <circle cx="38" cy="74" r="3" fill="#0F172A" />

      {/* Roda Depan */}
      <circle cx="126" cy="74" r="16" fill="#1E293B" stroke="#64748B" strokeWidth="3" />
      <circle cx="126" cy="74" r="8" fill="#F8FAFC" />
      <circle cx="126" cy="74" r="3" fill="#0F172A" />

      {/* Bodi Tepong Belakang Lengkung */}
      <path
        d="M24 70C24 50 36 42 58 42C74 42 86 52 88 72L24 70Z"
        fill="url(#scooterBody)"
        stroke="#FCD34D"
        strokeWidth="2"
      />

      {/* Jok Motor Terpisah */}
      <path
        d="M34 40C34 38 42 35 60 35C74 35 78 40 78 43C78 45 34 45 34 40Z"
        fill="#334155"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Dek Bawah Tengah */}
      <path d="M58 72H104L110 52H96L88 72Z" fill="#F59E0B" opacity="0.9" />

      {/* Garpu Depan & Sayap Depan */}
      <path
        d="M102 68C104 54 112 40 120 32L124 34L112 72L102 68Z"
        fill="#D97706"
        stroke="#FCD34D"
        strokeWidth="1.5"
      />
      {/* Spatbor Depan */}
      <path
        d="M112 62C112 55 120 52 134 56C138 64 136 74 136 74L112 62Z"
        fill="#B45309"
      />

      {/* Stang & Lampu Depan Bundar */}
      <path d="M120 32L122 24" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
      <circle cx="126" cy="22" r="7" fill="#FEF08A" stroke="#F59E0B" strokeWidth="2" />
      {/* Sorot Cahaya Lampu Depan */}
      <path
        d="M133 22L158 12V34L133 24Z"
        fill="url(#lightBeam)"
        opacity="0.55"
      />

      {/* Lampu Belakang Merah */}
      <rect x="21" y="58" width="4" height="7" rx="2" fill="#EF4444" />

      <defs>
        <linearGradient id="scooterBody" x1="24" y1="42" x2="88" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="lightBeam" x1="133" y1="22" x2="160" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" stopOpacity="0.8" />
          <stop offset="1" stopColor="#FEF08A" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Tiang Lampu Jalan Kota Malam (Street Lamp)
 */
export function StreetLampSVG({ className = "w-20 h-32" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tiang Besi Hitam */}
      <path d="M40 28V135" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 135H50" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
      <path d="M35 125H45" stroke="#334155" strokeWidth="3" />

      {/* Lekukan Lengkung Kepala Lampu */}
      <path
        d="M40 28C40 18 48 10 58 10C64 10 68 14 68 20"
        stroke="#475569"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Kap Lampu / Lentera */}
      <path d="M58 20H78L74 34H62L58 20Z" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
      {/* Bohlam Menyala */}
      <circle cx="68" cy="36" r="6" fill="#FDE047" />

      {/* Lingkaran Cahaya Glow */}
      <circle cx="68" cy="38" r="28" fill="#FBBF24" fillOpacity="0.25" />
      <circle cx="68" cy="38" r="44" fill="#FBBF24" fillOpacity="0.1" />
    </svg>
  );
}

/**
 * Buket Mawar Cantik (Kado di Jok Motor)
 */
export function FlowerBouquetSVG({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Kertas Pembungkus Buket (Wrapping Paper Kraft) */}
      <path
        d="M50 88L26 44C26 44 40 40 50 40C60 40 74 44 74 44L50 88Z"
        fill="#D97706"
        stroke="#92400E"
        strokeWidth="2"
      />
      <path
        d="M50 88L36 44L50 56L64 44L50 88Z"
        fill="#F59E0B"
        opacity="0.85"
      />

      {/* Daun-Daun Hijau */}
      <path d="M32 38C26 30 32 20 40 26C38 34 32 38 32 38Z" fill="#15803D" />
      <path d="M68 38C74 30 68 20 60 26C62 34 68 38 68 38Z" fill="#16A34A" />

      {/* Bunga Mawar 1 (Kiri) */}
      <circle cx="38" cy="32" r="10" fill="#E11D48" />
      <circle cx="38" cy="32" r="6" fill="#BE123C" />
      <circle cx="38" cy="32" r="2.5" fill="#FDA4AF" />

      {/* Bunga Mawar 2 (Kanan) */}
      <circle cx="62" cy="32" r="10" fill="#F43F5E" />
      <circle cx="62" cy="32" r="6" fill="#E11D48" />
      <circle cx="62" cy="32" r="2.5" fill="#FFE4E6" />

      {/* Bunga Mawar 3 Utama (Tengah Atas) */}
      <circle cx="50" cy="24" r="12" fill="#BE123C" />
      <circle cx="50" cy="24" r="7" fill="#9F1239" />
      <circle cx="50" cy="24" r="3" fill="#FDA4AF" />

      {/* Bunga Kecil Kuning/Putih Pengisi */}
      <circle cx="50" cy="38" r="4" fill="#FEF08A" />
      <circle cx="28" cy="42" r="3.5" fill="#FEF08A" />
      <circle cx="72" cy="42" r="3.5" fill="#FEF08A" />

      {/* Pita Buket */}
      <path
        d="M44 64C40 60 36 68 46 68C48 68 50 65 50 65C50 65 52 68 54 68C64 68 60 60 56 64L50 66L44 64Z"
        fill="#FDA4AF"
        stroke="#E11D48"
        strokeWidth="1.5"
      />
      <path d="M46 68L42 78" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" />
      <path d="M54 68L58 78" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Jendela Kamar Berembun (Kaca Berembun)
 */
export function RainyWindowSVG({ className = "w-28 h-28" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Kusen Jendela Kayu */}
      <rect x="10" y="10" width="80" height="80" rx="6" fill="#1E293B" stroke="#475569" strokeWidth="4" />
      {/* Pembagi Kaca 4 Panel */}
      <line x1="50" y1="12" x2="50" y2="88" stroke="#475569" strokeWidth="3" />
      <line x1="12" y1="50" x2="88" y2="50" stroke="#475569" strokeWidth="3" />

      {/* Lapisan Kaca Kebiruan */}
      <rect x="14" y="14" width="34" height="34" rx="2" fill="#38BDF8" fillOpacity="0.2" />
      <rect x="52" y="14" width="34" height="34" rx="2" fill="#38BDF8" fillOpacity="0.15" />
      <rect x="14" y="52" width="34" height="34" rx="2" fill="#38BDF8" fillOpacity="0.15" />
      <rect x="52" y="52" width="34" height="34" rx="2" fill="#38BDF8" fillOpacity="0.25" />

      {/* Rintik Air Menetes */}
      <path d="M25 20V28" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M40 32V42" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M64 22V36" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M78 60V74" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <path d="M28 66V78" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />

      {/* Titik Air Embun */}
      <circle cx="25" cy="30" r="1.5" fill="#BAE6FD" />
      <circle cx="40" cy="44" r="2" fill="#E0F2FE" />
      <circle cx="78" cy="76" r="2" fill="#E0F2FE" />
      <circle cx="64" cy="38" r="1.5" fill="#BAE6FD" />
    </svg>
  );
}
