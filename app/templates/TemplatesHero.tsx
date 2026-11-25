"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { SPRING_TACTILE } from "@/components/landing/MotionPrimitives";
import { usePricing } from "@/lib/use-pricing";
import { useIsTouchOrMobile } from "@/lib/use-coarse-pointer";
import { formatPrice } from "@/lib/pricing";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const HEADLINE_SEGMENTS = [
  { words: ["Pilih", "Template", "untuk"], accent: false },
  { words: ["Momen", "Kalian"], accent: true },
] as const;

export default function TemplatesHero() {
  const pricing = usePricing();
  const reduced = useReducedMotion();
  const isTouchOrMobile = useIsTouchOrMobile();

  const rootRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLSpanElement>(null);
  const lastPriceRef = useRef<number | null>(null);

  // Choreographed GSAP entrance timeline for the editorial header & price card
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      tl.from("[data-hero-badge]", {
        y: 14,
        opacity: 0,
        scale: 0.96,
        duration: 0.45,
        clearProps: "transform,opacity",
      })
        .from(
          "[data-hero-word]",
          {
            yPercent: 108,
            opacity: 0,
            duration: 0.56,
            stagger: 0.048,
            clearProps: "transform,opacity",
          },
          "-=0.3"
        )
        .from(
          "[data-hero-subtitle]",
          {
            y: 14,
            opacity: 0,
            duration: 0.48,
            clearProps: "transform,opacity",
          },
          "-=0.34"
        )
        .from(
          "[data-hero-value-card]",
          {
            y: 18,
            opacity: 0,
            scale: 0.97,
            duration: 0.54,
            clearProps: "transform,opacity",
          },
          "-=0.36"
        );
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  // Smooth GSAP numeric count-up for the headline price (and smooth re-tween if server price differs)
  useEffect(() => {
    const el = priceRef.current;
    if (!el) return;

    const target = pricing.amount;
    if (reduced) {
      el.textContent = formatPrice(target);
      lastPriceRef.current = target;
      return;
    }

    const prevVal = lastPriceRef.current;
    const fromVal = prevVal === null ? 0 : prevVal;
    if (fromVal === target) {
      el.textContent = formatPrice(target);
      return;
    }

    const counter = { value: fromVal };
    const isInitial = prevVal === null;
    let completed = false;
    lastPriceRef.current = target;

    const tween = gsap.to(counter, {
      value: target,
      duration: isInitial ? 0.85 : 0.45,
      delay: isInitial ? 0.22 : 0,
      ease: "power3.out",
      onUpdate: () => {
        if (priceRef.current) {
          priceRef.current.textContent = formatPrice(Math.round(counter.value));
        }
      },
      onComplete: () => {
        completed = true;
        if (priceRef.current) {
          priceRef.current.textContent = formatPrice(target);
        }
      },
    });

    return () => {
      tween.kill();
      if (!completed) {
        lastPriceRef.current = prevVal;
      }
    };
  }, [pricing.amount, reduced]);

  return (
    <div
      ref={rootRef}
      className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 lg:gap-8 mb-8 md:mb-12"
    >
      <div className="max-w-2xl space-y-3.5 sm:space-y-4">
        <div
          data-hero-badge
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[11px] tracking-[0.1em] uppercase shadow-[0_1px_6px_rgba(222,112,56,0.08)]"
        >
          <motion.span
            aria-hidden
            animate={
              reduced || isTouchOrMobile
                ? undefined
                : { rotate: [0, 12, -8, 0], scale: [1, 1.12, 1] }
            }
            transition={{
              duration: 3.4,
              repeat: Infinity,
              repeatDelay: 2.5,
              ease: "easeInOut",
            }}
            className="inline-flex shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </motion.span>
          <span>KOLEKSI TEMPLATE DIGITAL</span>
        </div>

        <h1
          aria-label="Pilih Template untuk Momen Kalian"
          className="font-heading text-[32px] sm:text-5xl lg:text-[50px] leading-[1.15] text-on-surface tracking-tight"
        >
          {HEADLINE_SEGMENTS.map((segment, segIdx) =>
            segment.words.map((word, wordIdx) => {
              const isLastWord =
                segIdx === HEADLINE_SEGMENTS.length - 1 &&
                wordIdx === segment.words.length - 1;
              return (
                <span key={`${segIdx}-${word}`} aria-hidden="true" className="inline">
                  <span className="inline-block overflow-hidden align-bottom pb-[0.14em] -mb-[0.14em] px-[0.06em] -mx-[0.06em]">
                    <span
                      data-hero-word
                      className={
                        segment.accent
                          ? "inline-block font-semibold italic text-primary"
                          : "inline-block"
                      }
                    >
                      {word}
                    </span>
                  </span>
                  {isLastWord ? "" : " "}
                </span>
              );
            })
          )}
        </h1>

        <p
          data-hero-subtitle
          className="text-body-lg sm:text-[17px] text-on-surface-variant leading-relaxed"
        >
          Setiap template punya cerita dan interaksi berbeda. Coba preview gratis
          sepuasnya, lalu sesuaikan dengan cerita kalian dalam 3 menit.
        </p>
      </div>

      {/* Value Reassurance Card — outer wrapper owned by GSAP, inner hover owned by Framer Motion */}
      <div data-hero-value-card className="w-full sm:w-auto shrink-0">
        <motion.div
          whileHover={
            reduced || isTouchOrMobile ? undefined : { y: -3, scale: 1.012 }
          }
          transition={SPRING_TACTILE}
          className="relative overflow-hidden bg-surface-container-low border border-outline-variant/30 hover:border-primary/35 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-card transition-colors duration-300"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(222, 112, 56, 0.14) 0%, transparent 70%)",
            }}
          />
          <div className="relative flex items-baseline gap-2.5 mb-1.5 flex-wrap">
            <span className="text-body-md font-medium text-on-surface-variant">
              Semua template
            </span>
            <div className="inline-flex items-baseline gap-2">
              {pricing.isPromo && (
                <span className="text-xs text-on-surface-variant/60 line-through font-normal">
                  {pricing.normalPriceLabel}
                </span>
              )}
              <span
                ref={priceRef}
                className="font-heading font-bold text-2xl text-primary tabular-nums"
              >
                {pricing.formattedPrice}
              </span>
            </div>
          </div>
          <p className="relative text-[12px] sm:text-xs text-on-surface-variant/80">
            Sekali bayar · Aktif selamanya · Gratis edit 7 hari
          </p>
        </motion.div>
      </div>
    </div>
  );
}
