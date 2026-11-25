"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { useIsCoarsePointer } from "@/lib/use-coarse-pointer";
import type { Mood } from "@/lib/mood";

interface Blob {
  color: string;
  size: number;
  top: string;
  left: string;
  depth: number;
}

export default function ParallaxBackground({ mood }: { mood: Mood }) {
  const reduced = usePrefersReducedMotion();
  const isCoarse = useIsCoarsePointer();
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reduced || isCoarse) return;
    let frameId = 0;
    let targetX = 0;
    let targetY = 0;
    const depths = [22, -16, 26];

    const flush = () => {
      frameId = 0;
      for (let i = 0; i < depths.length; i++) {
        const el = blobRefs.current[i];
        if (el) {
          el.style.transform = `translate3d(${targetX * depths[i]}px, ${targetY * depths[i]}px, 0)`;
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!frameId) {
        frameId = requestAnimationFrame(flush);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [reduced, isCoarse]);

  if (reduced) return null;

  const blobs: Blob[] = [
    { color: mood.primaryContainer, size: 340, top: "4%", left: "2%", depth: 22 },
    { color: mood.primaryFixed, size: 280, top: "60%", left: "12%", depth: -16 },
    { color: mood.surfaceContainerLow, size: 320, top: "34%", left: "62%", depth: 26 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {blobs.map((b, i) => (
        <div
          key={i}
          ref={(el) => {
            blobRefs.current[i] = el;
          }}
          className="absolute rounded-full opacity-55 transition-transform duration-300 ease-out"
          style={{
            background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
          }}
        />
      ))}
    </div>
  );
}
