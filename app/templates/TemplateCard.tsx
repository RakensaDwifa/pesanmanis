"use client";

import { useState, type PointerEvent } from "react";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { ArrowRight, Clock, Eye, Sparkles, Star } from "lucide-react";
import { templateEmoji } from "@/lib/templates";
import { CATEGORY_META, type TemplateMeta } from "@/lib/types";
import { AnalyticsEvents } from "@/lib/analytics";
import type { TierClientPrice } from "@/lib/use-pricing";
import { EASE_WARM, SPRING_TACTILE } from "@/components/landing/MotionPrimitives";

interface TemplateCardProps {
  template: TemplateMeta;
  pricing: TierClientPrice;
  isTouchOrMobile: boolean;
  reducedMotion: boolean;
}

const TILT_SPRING = { stiffness: 260, damping: 24, mass: 0.55 };

export default function TemplateCard({
  template: t,
  pricing,
  isTouchOrMobile,
  reducedMotion,
}: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const catMeta = CATEGORY_META[t.type];
  const isComingSoon = Boolean(t.comingSoon || !t.active);
  const isDarkMockup = t.phoneDark ?? false;
  const enable3D = !isTouchOrMobile && !reducedMotion;

  // Pointer-driven 3D tilt & spotlight values (zero React re-renders per mouse pixel)
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const spotX = useMotionValue(160);
  const spotY = useMotionValue(140);

  const rotateX = useSpring(rawRotateX, TILT_SPRING);
  const rotateY = useSpring(rawRotateY, TILT_SPRING);

  const spotlightBg = useMotionTemplate`radial-gradient(300px circle at ${spotX}px ${spotY}px, rgba(222, 112, 56, 0.15), transparent 72%)`;

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!enable3D) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const nx = px / rect.width - 0.5;
    const ny = py / rect.height - 0.5;

    rawRotateY.set(nx * 9);
    rawRotateX.set(-ny * 8);
    spotX.set(px);
    spotY.set(py);
  };

  const handlePointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (!enable3D) return;
    const rect = event.currentTarget.getBoundingClientRect();
    spotX.set(event.clientX - rect.left);
    spotY.set(event.clientY - rect.top);
    setIsHovered(true);
  };

  const handlePointerLeave = () => {
    if (!enable3D) return;
    setIsHovered(false);
    rawRotateX.set(0);
    rawRotateY.set(0);
  };

  return (
    // Dedicated GSAP scroll-reveal wrapper so GSAP never competes with Framer Motion 3D tilt or FLIP layout
    <div
      data-template-card-reveal
      className="h-full"
      style={enable3D ? { perspective: 950 } : undefined}
    >
      <motion.article
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        animate={
          enable3D
            ? { y: isHovered ? -6 : 0 }
            : undefined
        }
        whileTap={
          isTouchOrMobile && !reducedMotion ? { scale: 0.99 } : undefined
        }
        transition={SPRING_TACTILE}
        style={
          enable3D
            ? {
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
              }
            : undefined
        }
        className="group relative h-full bg-surface-container-low rounded-3xl border border-outline-variant/30 hover:border-primary/35 overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-300 flex flex-col"
      >
        {/* Dynamic Cursor Spotlight Overlay (Desktop only) */}
        {enable3D && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-30 rounded-3xl"
            style={{ background: spotlightBg }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.25, ease: EASE_WARM }}
          />
        )}

        {/* Stage Wrapper */}
        <div className="p-3.5 pb-0">
          <div className="relative h-[290px] w-full rounded-2xl overflow-hidden flex items-center justify-center bg-surface-container-high/70">
            {/* Radial Stage Glow (0 GPU blur pass) */}
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              animate={
                enable3D
                  ? {
                      scale: isHovered ? 1.16 : 1,
                      opacity: isHovered ? 1 : 0.85,
                    }
                  : undefined
              }
              transition={{ duration: 0.45, ease: EASE_WARM }}
              style={{
                background: `radial-gradient(circle at center, ${
                  t.glowColor ?? "rgba(222, 112, 56, 0.24)"
                } 0%, transparent 68%)`,
              }}
            />

            {/* Top Badges Bar */}
            <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-none">
              <div>
                {isComingSoon ? (
                  <motion.span
                    animate={enable3D ? { y: isHovered ? -2 : 0 } : undefined}
                    transition={SPRING_TACTILE}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-surface-container-highest text-on-surface border border-outline-variant/40 shadow-xs"
                  >
                    <Clock className="h-3 w-3" />
                    <span>Segera Hadir</span>
                  </motion.span>
                ) : (
                  <>
                    {t.badge === "popular" && (
                      <motion.span
                        animate={enable3D ? { y: isHovered ? -2 : 0 } : undefined}
                        transition={SPRING_TACTILE}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary text-white shadow-xs"
                      >
                        <Star className="h-3 w-3 fill-current" />
                        <span>Terpopuler</span>
                      </motion.span>
                    )}
                    {t.badge === "new" && (
                      <motion.span
                        animate={enable3D ? { y: isHovered ? -2 : 0 } : undefined}
                        transition={SPRING_TACTILE}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary text-white shadow-xs"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Baru</span>
                      </motion.span>
                    )}
                  </>
                )}
              </div>

              <motion.span
                animate={enable3D ? { y: isHovered ? -2 : 0 } : undefined}
                transition={SPRING_TACTILE}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-surface/95 text-on-surface border border-outline-variant/30 shadow-xs"
              >
                {catMeta.emoji} {catMeta.label}
              </motion.span>
            </div>

            {/* Phone Mockup Frame with Stage Choreography */}
            <motion.div
              animate={
                enable3D
                  ? {
                      y: isHovered ? -6 : 0,
                      scale: isHovered ? 1.045 : 1,
                      rotate: isHovered ? -0.9 : 0,
                    }
                  : undefined
              }
              transition={SPRING_TACTILE}
              className="w-[156px] h-[260px] rounded-[18px] border-[1.5px] border-white/25 shadow-xl overflow-hidden relative flex flex-col justify-between p-3.5 select-none"
              style={{
                background:
                  t.phoneGradient ??
                  "linear-gradient(180deg, #fff 0%, #ffd4e1 100%)",
                color: isDarkMockup ? "#F8EEE7" : "#241914",
              }}
            >
              {/* Top Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-11 h-1 rounded-full bg-black/20 z-10" />

              {/* Story Progress Bars (2nd segment fills smoothly on card hover) */}
              <div className="flex items-center gap-1 w-full pt-1.5 z-10">
                <div
                  className={`h-[2.5px] flex-1 rounded-full ${
                    isDarkMockup ? "bg-white/75" : "bg-black/40"
                  }`}
                />
                <div
                  className={`relative h-[2.5px] flex-1 rounded-full overflow-hidden ${
                    isDarkMockup ? "bg-white/25" : "bg-black/15"
                  }`}
                >
                  <motion.div
                    aria-hidden
                    className={`absolute inset-0 rounded-full ${
                      isDarkMockup ? "bg-white/85" : "bg-black/50"
                    }`}
                    initial={false}
                    animate={{ scaleX: enable3D && isHovered ? 1 : 0 }}
                    transition={{
                      duration: enable3D && isHovered ? 0.65 : 0.25,
                      ease: EASE_WARM,
                    }}
                    style={{ transformOrigin: "left center" }}
                  />
                </div>
                <div
                  className={`h-[2.5px] flex-1 rounded-full ${
                    isDarkMockup ? "bg-white/25" : "bg-black/15"
                  }`}
                />
              </div>

              {/* Phone Focal Content */}
              <div className="my-auto flex flex-col items-center text-center gap-1.5 z-10 px-1">
                <motion.div
                  animate={
                    enable3D
                      ? {
                          scale: isHovered ? 1.1 : 1,
                          y: isHovered ? -2 : 0,
                          rotate: isHovered ? -4 : 0,
                        }
                      : undefined
                  }
                  transition={SPRING_TACTILE}
                  className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center text-2xl shadow-sm mb-0.5"
                >
                  {templateEmoji(t.slug)}
                </motion.div>
                <span
                  className={`text-[8.5px] font-bold tracking-widest uppercase ${
                    isDarkMockup ? "text-primary-fixed-dim" : "text-primary"
                  }`}
                >
                  {t.mockupSubtitle ?? "UNTUK KAMU"}
                </span>
                <p className="font-heading text-[13px] leading-tight font-semibold italic line-clamp-2">
                  {t.mockupHeadline ?? t.name}
                </p>
              </div>

              {/* Phone Mini CTA */}
              <motion.div
                animate={
                  enable3D
                    ? {
                        scale: isHovered ? 1.04 : 1,
                      }
                    : undefined
                }
                transition={SPRING_TACTILE}
                className="relative overflow-hidden w-full py-1.5 px-3 rounded-full text-center text-[9px] font-bold text-white shadow-sm bg-primary z-10"
              >
                {enable3D && (
                  <motion.span
                    aria-hidden
                    initial={false}
                    animate={{ x: isHovered ? "260%" : "-140%" }}
                    transition={{ duration: 0.65, ease: EASE_WARM }}
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                  />
                )}
                <span className="relative z-[1]">
                  {t.mockupCta ?? "Buka pesan ✨"}
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h2
              className={`font-heading text-xl md:text-[22px] font-semibold text-on-surface mb-1.5 ${
                isComingSoon
                  ? ""
                  : "group-hover:text-primary transition-colors duration-200"
              }`}
            >
              {t.name}
            </h2>
            <p className="text-body-md text-on-surface-variant text-[13.5px] leading-relaxed line-clamp-2 mb-4">
              {t.description}
            </p>
          </div>

          {/* Actions & Footer */}
          <div className="mt-auto space-y-3.5">
            {/* Action Row — Tactile Spring + Sheen + Icon Micro-Motion (or disabled Coming Soon) */}
            {isComingSoon ? (
              <div className="w-full">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full border border-outline-variant/40 bg-surface-container text-on-surface-variant font-semibold text-xs sm:text-[13px] cursor-not-allowed opacity-85"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Segera Hadir</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <motion.div
                  whileHover={reducedMotion ? undefined : { y: -1.5, scale: 1.02 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                  transition={SPRING_TACTILE}
                  className="w-full"
                >
                  <Link
                    href={`/preview/${t.slug}`}
                    onClick={() => AnalyticsEvents.templatePreviewed?.(t.slug)}
                    className="group/preview w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full border border-outline-variant/40 bg-surface text-primary font-semibold text-xs sm:text-[13px] hover:bg-primary/10 hover:border-primary transition-colors duration-200"
                  >
                    <Eye className="h-3.5 w-3.5 transition-transform duration-200 group-hover/preview:scale-115" />
                    <span>Preview</span>
                  </Link>
                </motion.div>

                <motion.div
                  whileHover={reducedMotion ? undefined : { y: -2, scale: 1.02 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                  transition={SPRING_TACTILE}
                  className="w-full"
                >
                  <Link
                    href={`/buat/${t.slug}`}
                    onClick={() => AnalyticsEvents.templateSelected?.(t.slug)}
                    className="group/cta relative overflow-hidden w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-primary text-white font-semibold text-xs sm:text-[13px] shadow-xs hover:bg-primary/95 hover:shadow-[0_6px_18px_rgba(222,112,56,0.32)] transition-all duration-200"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/cta:translate-x-[420%] transition-transform duration-700 ease-out motion-reduce:hidden"
                    />
                    <span className="relative z-[1]">Buat Sekarang</span>
                    <ArrowRight className="relative z-[1] h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-1" />
                  </Link>
                </motion.div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-outline-variant/20" />

            {/* Card Footer */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                {pricing.tier === "signature" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold text-[10px] uppercase tracking-wider shrink-0">
                    Signature
                  </span>
                )}
                <span className="text-on-surface-variant/80 font-medium text-[11.5px] sm:text-xs truncate">
                  {pricing.tier === "signature"
                    ? "Aktif selamanya"
                    : "Aktif selamanya · edit 7 hari"}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                {pricing.isPromo && (
                  <span className="line-through text-[11px] opacity-60 font-normal">
                    {pricing.normalPriceLabel}
                  </span>
                )}
                <span>{pricing.formattedPrice}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
