"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
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
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setOffset({ x, y });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);

  if (reduced) return null;

  const blobs: Blob[] = [
    { color: mood.primaryContainer, size: 300, top: "8%", left: "6%", depth: 22 },
    { color: mood.primaryFixed, size: 240, top: "64%", left: "16%", depth: -16 },
    { color: mood.surfaceContainerLow, size: 280, top: "38%", left: "68%", depth: 26 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl opacity-40"
          style={{
            background: b.color,
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            transform: `translate(${offset.x * b.depth}px, ${offset.y * b.depth}px)`,
            transition: "transform 0.35s ease-out",
          }}
        />
      ))}
    </div>
  );
}
