"use client";

import { MotionConfig } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import type Lenis from "lenis";

type LenisNodeCache = {
  time?: number;
  hasOverflowX?: boolean;
  hasOverflowY?: boolean;
  isScrollableX?: boolean;
  isScrollableY?: boolean;
  hasOverscrollBehaviorX?: boolean;
  hasOverscrollBehaviorY?: boolean;
  scrollWidth?: number;
  scrollHeight?: number;
  clientWidth?: number;
  clientHeight?: number;
};

type LenisCachedElement = HTMLElement & { _lenis?: LenisNodeCache };

let activeLenisInstance: Lenis | null = null;

/**
 * Smoothly scrolls the page using Lenis when active on desktop, or native
 * window.scrollTo on mobile / reduced-motion environments so programmatic
 * scrolls never fight Lenis wheel inertia.
 */
export function smoothScrollTo(
  top: number,
  options?: { duration?: number; immediate?: boolean }
) {
  if (typeof window === "undefined") return;
  const clampedTop = Math.max(0, top);
  const reduced = Boolean(
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  const immediate = Boolean(options?.immediate || reduced);

  if (activeLenisInstance) {
    activeLenisInstance.scrollTo(clampedTop, {
      immediate,
      duration: immediate ? 0 : (options?.duration ?? 0.45),
      force: true,
    });
    return;
  }

  window.scrollTo({
    top: clampedTop,
    behavior: immediate ? "instant" : "smooth",
  });
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const coarseMq = window.matchMedia?.("(pointer: coarse)");
    const mobileMq = window.matchMedia?.("(max-width: 767px)");
    const reducedMq = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    let generation = 0;
    let cleanupLenis: (() => void) | null = null;

    const shouldDisableLenis = () =>
      Boolean(coarseMq?.matches || mobileMq?.matches || reducedMq?.matches);

    const teardown = () => {
      generation += 1;
      cleanupLenis?.();
      cleanupLenis = null;
      if (activeLenisInstance === lenisRef.current) {
        activeLenisInstance = null;
      }
      lenisRef.current = null;
    };

    const sync = () => {
      // On mobile viewports, touch devices, or reduced-motion preferences, rely on native
      // OS compositor scroll so cards and full-width sections never trap scrolling.
      if (shouldDisableLenis()) {
        teardown();
        return;
      }
      if (lenisRef.current) return;

      const currentGen = ++generation;
      void Promise.all([import("lenis"), import("gsap")]).then(
        ([{ default: LenisCtor }, { default: gsap }]) => {
          if (currentGen !== generation || shouldDisableLenis()) return;
          const lenis = new LenisCtor({
            autoRaf: false,
            lerp: 0.1,
            smoothWheel: true,
            allowNestedScroll: true,
            stopInertiaOnNavigate: true,
            anchors: {
              offset: -80,
            },
            virtualScroll: ({ deltaX, deltaY, event }) => {
              // Keep nested scroll-chaining containers (e.g. music lists, live preview)
              // immune to Lenis's 2s dimension cache and fractional Windows DPI scrollTop.
              if (
                Math.abs(deltaY) > Math.abs(deltaX) &&
                event.target instanceof Element
              ) {
                const chainEl =
                  event.target.closest<LenisCachedElement>("[data-scroll-chain]");
                if (chainEl) {
                  const scrollHeight = chainEl.scrollHeight;
                  const clientHeight = chainEl.clientHeight;
                  const maxScroll = Math.max(0, scrollHeight - clientHeight);
                  const scrollTop = chainEl.scrollTop;
                  const atTop = scrollTop <= 1;
                  const atBottom = scrollTop >= maxScroll - 1.5;
                  const canScrollInside =
                    maxScroll > 1 && (deltaY > 0 ? !atBottom : !atTop);

                  chainEl._lenis = {
                    time: Date.now(),
                    hasOverflowX: false,
                    hasOverflowY: true,
                    isScrollableX: false,
                    isScrollableY: canScrollInside,
                    hasOverscrollBehaviorX: true,
                    hasOverscrollBehaviorY: true,
                    scrollWidth: chainEl.scrollWidth,
                    scrollHeight,
                    clientWidth: chainEl.clientWidth,
                    clientHeight,
                  };
                }
              }
              return true;
            },
          });
          lenisRef.current = lenis;
          activeLenisInstance = lenis;

          const update = (time: number) => {
            if (!document.hidden) {
              lenis.raf(time * 1000);
            }
          };
          gsap.ticker.add(update);
          gsap.ticker.lagSmoothing(0);

          cleanupLenis = () => {
            gsap.ticker.remove(update);
            lenis.destroy();
          };
        }
      );
    };

    sync();
    coarseMq?.addEventListener("change", sync);
    mobileMq?.addEventListener("change", sync);
    reducedMq?.addEventListener("change", sync);

    return () => {
      coarseMq?.removeEventListener("change", sync);
      mobileMq?.removeEventListener("change", sync);
      reducedMq?.removeEventListener("change", sync);
      teardown();
    };
  }, []);

  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    if (typeof window !== "undefined" && window.location.hash) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true, force: true });
    } else if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
