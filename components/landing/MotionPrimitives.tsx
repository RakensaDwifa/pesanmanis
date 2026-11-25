"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsTouchOrMobile } from "@/lib/use-coarse-pointer";

export const EASE_WARM = [0.22, 1, 0.36, 1] as const;

export const SPRING_TACTILE: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 28,
  mass: 0.8,
};

export const VIEWPORT_ONCE = {
  once: true,
  amount: 0.2,
} as const;

export type TextSegment = {
  text: string;
  className?: string;
};

type WordToken = {
  word: string;
  className?: string;
  trailingSpace: boolean;
};

function tokenizeSegments(segments: TextSegment[]): WordToken[] {
  const tokens: WordToken[] = [];
  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const seg = segments[sIdx];
    const parts = seg.text.trim().split(/\s+/).filter(Boolean);
    for (let pIdx = 0; pIdx < parts.length; pIdx++) {
      const isLastInSeg = pIdx === parts.length - 1;
      const hasNextSeg = sIdx < segments.length - 1;
      tokens.push({
        word: parts[pIdx],
        className: seg.className,
        trailingSpace: !isLastInSeg || hasNextSeg,
      });
    }
  }
  return tokens;
}

export function MotionTextReveal({
  text,
  segments,
  as = "h2",
  className,
  immediate = false,
  delay = 0,
  duration = 0.45,
  wordStagger = 0.045,
}: {
  text?: string;
  segments?: TextSegment[];
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  immediate?: boolean;
  delay?: number;
  duration?: number;
  wordStagger?: number;
}) {
  const reduced = useReducedMotion();
  const resolvedSegments = segments ?? (text ? [{ text }] : []);
  const fullText = resolvedSegments.map((s) => s.text).join(" ").trim();
  const tokens = tokenizeSegments(resolvedSegments);

  const Tag = as;

  if (reduced) {
    return (
      <Tag className={className}>
        {resolvedSegments.map((s, idx) => (
          <span key={idx} className={s.className}>
            {s.text}
            {idx < resolvedSegments.length - 1 ? " " : ""}
          </span>
        ))}
      </Tag>
    );
  }

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: wordStagger,
        delayChildren: delay,
      },
    },
  };

  const wordVariants: Variants = {
    hidden: { y: "95%", opacity: 0 },
    visible: {
      y: "0%",
      opacity: 1,
      transition: {
        duration,
        ease: EASE_WARM,
      },
    },
  };

  const MotionTag = motion[as];

  return (
    <MotionTag
      aria-label={fullText}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={immediate ? "visible" : undefined}
      whileInView={immediate ? undefined : "visible"}
      viewport={immediate ? undefined : VIEWPORT_ONCE}
    >
      {tokens.map((tok, i) => (
        <span key={`${tok.word}-${i}`} aria-hidden="true" className="inline">
          <span className="inline-block overflow-hidden align-bottom pb-[0.14em] -mb-[0.14em] px-[0.06em] -mx-[0.06em]">
            <motion.span
              variants={wordVariants}
              className={cn("inline-block", tok.className)}
            >
              {tok.word}
            </motion.span>
          </span>
          {tok.trailingSpace ? " " : ""}
        </span>
      ))}
    </MotionTag>
  );
}

export function MotionFadeUp({
  children,
  className,
  delay = 0,
  duration = 0.48,
  y = 14,
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
  immediate?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={immediate ? { opacity: 1, y: 0 } : undefined}
      whileInView={immediate ? undefined : { opacity: 1, y: 0 }}
      viewport={immediate ? undefined : VIEWPORT_ONCE}
      transition={{ duration, delay, ease: EASE_WARM }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionStaggerGroup({
  children,
  className,
  delay = 0,
  stagger = 0.08,
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  immediate?: boolean;
}) {
  const variants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate={immediate ? "visible" : undefined}
      whileInView={immediate ? undefined : "visible"}
      viewport={immediate ? undefined : VIEWPORT_ONCE}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionStaggerItem({
  children,
  className,
  y = 16,
  duration = 0.45,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  duration?: number;
}) {
  const itemVariants: Variants = {
    hidden: { opacity: 0, y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: EASE_WARM },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

function formatCountNumber(val: number, formatThousand: boolean): string {
  return formatThousand ? val.toLocaleString("id-ID") : String(val);
}

export function CountUpNumber({
  target,
  prefix = "",
  suffix = "",
  formatThousand = true,
  className,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  formatThousand?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  const hasRunRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduced || hasRunRef.current) return;
    hasRunRef.current = true;
    el.textContent = `${prefix}${formatCountNumber(0, formatThousand)}${suffix}`;
    const controls = animate(0, target, {
      duration: 0.9,
      ease: EASE_WARM,
      onUpdate(latest) {
        if (ref.current) {
          ref.current.textContent = `${prefix}${formatCountNumber(Math.round(latest), formatThousand)}${suffix}`;
        }
      },
    });
    return () => controls.stop();
  }, [inView, prefix, reduced, suffix, target, formatThousand]);

  return (
    <span ref={ref} className={className}>
      {`${prefix}${formatCountNumber(target, formatThousand)}${suffix}`}
    </span>
  );
}

export function MotionSymbolSettle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.72 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: EASE_WARM }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.span>
  );
}

export function MotionLinkButton({
  href,
  children,
  className,
  sheen = false,
  hoverLift = -2,
  hoverScale = 1.015,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  sheen?: boolean;
  hoverLift?: number;
  hoverScale?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: hoverLift, scale: hoverScale }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={SPRING_TACTILE}
      className="inline-flex w-full sm:w-auto justify-center"
    >
      <Link
        href={href}
        className={cn("group relative overflow-hidden", className)}
      >
        {sheen && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-[420%] transition-transform duration-700 ease-out motion-reduce:hidden"
          />
        )}
        {children}
      </Link>
    </motion.div>
  );
}

export function MotionDrawLine({ className }: { className?: string }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: 0.75, delay: 0.15, ease: EASE_WARM }}
      style={{ transformOrigin: "left center" }}
      className={className}
    />
  );
}

export function MotionFloat({
  children,
  className,
  distance = 6,
  duration = 4.2,
  delay = 0,
  paused = false,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  duration?: number;
  delay?: number;
  paused?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0 });
  const reduced = useReducedMotion();
  const isTouchOrMobile = useIsTouchOrMobile();
  const shouldPause = Boolean(reduced || paused || isTouchOrMobile || !inView);

  return (
    <motion.div
      ref={ref}
      animate={
        shouldPause
          ? { y: 0 }
          : {
              y: [0, -distance, 0],
            }
      }
      transition={
        shouldPause
          ? { duration: 0.25, ease: EASE_WARM }
          : {
              duration,
              delay,
              repeat: Infinity,
              ease: "easeInOut",
            }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
