"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Membungkus gsap.context() agar seluruh tween di dalam scope otomatis dibersihkan.
 * `key` yang berubah akan membangun ulang timeline (mis. saat layer berganti).
 */
export function useGsapScope<T extends HTMLElement = HTMLDivElement>(
  build: (scope: T) => void,
  key = "",
) {
  const scope = useRef<T>(null);
  const buildRef = useRef(build);

  useEffect(() => {
    buildRef.current = build;
  }, [build]);

  useEffect(() => {
    const el = scope.current;
    if (!el) return;
    const ctx = gsap.context(() => buildRef.current(el), el);
    return () => ctx.revert();
  }, [key]);

  return scope;
}
