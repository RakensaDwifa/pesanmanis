"use client";

import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

const HEARTS = ["💖", "💕", "🌸", "✨", "💗"];

export default function CursorTrail() {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    if (coarse) return;

    let lastT = 0;
    const onMove = (e: PointerEvent) => {
      const now = Date.now();
      if (now - lastT < 55) return;
      lastT = now;
      const el = document.createElement("span");
      el.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
      el.style.position = "fixed";
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      el.style.fontSize = `${14 + Math.random() * 14}px`;
      el.style.pointerEvents = "none";
      el.style.zIndex = "45";
      el.style.transform = "translate(-50%,-50%)";
      el.style.transition = "transform 0.7s ease-out, opacity 0.7s ease-out";
      el.style.opacity = "1";
      document.body.appendChild(el);
      requestAnimationFrame(() => {
        el.style.transform = "translate(-50%,-50%) translateY(-26px) scale(1.3)";
        el.style.opacity = "0";
      });
      window.setTimeout(() => el.remove(), 760);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);

  return null;
}
