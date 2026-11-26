"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShimmerBlockProps {
  className?: string;
  /** Optional delay (seconds) for subtle wave staggering across skeleton groups. */
  shimmerDelay?: number;
  /** Use soft warm-peach tint (great for hero thumbnails or accent badges). */
  warm?: boolean;
}

/**
 * Reusable Framer Motion skeleton shimmer block tuned to PesanManis Material-3 Warm Peach
 * surfaces (Light & Dark Mode) and accessible reduced-motion preferences.
 */
export function ShimmerBlock({
  className,
  shimmerDelay = 0,
  warm = false,
}: ShimmerBlockProps) {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden select-none",
        warm
          ? "bg-primary-fixed/40 dark:bg-primary/15"
          : "bg-surface-container-high/85 dark:bg-surface-container-highest/80",
        className
      )}
    >
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={reduced ? undefined : { x: ["-100%", "100%"] }}
        transition={
          reduced
            ? undefined
            : {
                duration: 1.45,
                delay: shimmerDelay,
                repeat: Infinity,
                repeatDelay: 0.25,
                ease: [0.4, 0, 0.2, 1],
              }
        }
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-full motion-reduce:hidden",
          warm
            ? "bg-gradient-to-r from-transparent via-white/75 to-transparent dark:via-white/15"
            : "bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/12"
        )}
        style={{ willChange: "transform" }}
      />
    </div>
  );
}
