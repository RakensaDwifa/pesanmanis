"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { EASE_WARM, SPRING_TACTILE } from "./MotionPrimitives";

export default function FloatingChat() {
  const [hover, setHover] = useState(false);
  const pathname = usePathname();
  const isBuilderRoute = pathname?.startsWith("/buat/") ?? false;

  return (
    <motion.a
      href={BRAND.supportUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-site-chrome
      data-floating-chat
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      initial={{ opacity: 0, scale: 0.85, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      transition={SPRING_TACTILE}
      className={`fixed z-50 ${
        isBuilderRoute ? "hidden lg:flex" : "flex"
      } items-center justify-center rounded-full bg-[#241914] dark:bg-[#2E241F] text-white border border-primary/40 shadow-[0_10px_28px_rgba(36,25,20,0.28)] hover:bg-[#33241D] dark:hover:bg-[#3A2D27] transition-colors duration-300 bottom-6 right-5 h-14 w-14`}
      aria-label="Butuh bantuan? Chat Admin"
    >
      <div className="hidden md:block motion-reduce:hidden absolute inset-0 rounded-full bg-primary/35 animate-ping-soft -z-10 opacity-70" />
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, x: 8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 6, scale: 0.95 }}
            transition={{ duration: 0.2, ease: EASE_WARM }}
            className="absolute right-[120%] top-1/2 -translate-y-1/2 bg-white dark:bg-[#2E241F] text-on-surface font-medium px-4 py-2.5 rounded-2xl shadow-lg border border-outline-variant/40 text-xs md:text-sm whitespace-nowrap pointer-events-none"
          >
            Butuh bantuan? Chat Admin
          </motion.div>
        )}
      </AnimatePresence>
      <MessageCircle className="h-6 w-6 text-primary transition-transform duration-300" />
    </motion.a>
  );
}
