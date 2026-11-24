"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { BRAND } from "@/lib/brand";

export default function FloatingChat() {
  const [hover, setHover] = useState(false);

  return (
    <a
      href={BRAND.supportUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-site-chrome
      data-floating-chat
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="fixed z-50 flex items-center justify-center rounded-full bg-[#241914] dark:bg-[#2E241F] text-white border border-primary/40 shadow-[0_10px_28px_rgba(36,25,20,0.28)] hover:bg-[#33241D] dark:hover:bg-[#3A2D27] hover:scale-105 active:scale-95 transition-all duration-300 bottom-6 right-5 h-14 w-14"
      aria-label="Butuh bantuan? Chat Admin"
    >
      <div className="absolute inset-0 rounded-full bg-primary/35 animate-ping-soft -z-10 opacity-70" />
      {hover && (
        <div className="absolute right-[120%] top-1/2 -translate-y-1/2 bg-white dark:bg-[#2E241F] text-on-surface font-medium px-4 py-2.5 rounded-2xl shadow-lg border border-outline-variant/40 text-xs md:text-sm whitespace-nowrap opacity-100 scale-100 transition-all duration-300 pointer-events-none">
          Butuh bantuan? Chat Admin
        </div>
      )}
      <MessageCircle className="h-6 w-6 text-primary transition-transform duration-300" />
    </a>
  );
}
