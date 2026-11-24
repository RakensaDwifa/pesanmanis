"use client";

import gsap from "gsap";
import { ReactLenis, type LenisRef } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

const LENIS_OPTIONS = {
  autoRaf: false,
  lerp: 0.1,
  smoothWheel: true,
  allowNestedScroll: true,
  stopInertiaOnNavigate: true,
  respectReducedMotion: true,
  anchors: {
    offset: -80,
  },
} as const;

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const update = (time: number) => {
      lenisRef.current?.lenis?.raf(time * 1000);
    };
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
    };
  }, []);

  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    if (typeof window !== "undefined" && window.location.hash) return;
    lenisRef.current?.lenis?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return (
    <ReactLenis root ref={lenisRef} options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
