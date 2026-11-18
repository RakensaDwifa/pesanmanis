"use client";

import { useEffect, type RefObject } from "react";

const EMOJI_MAP: Record<string, string[]> = {
  hearts: ["❤️", "💖", "💕", "💗", "💓"],
  roses: ["🌹", "🌸", "🌺", "🌷", "💐"],
  sparkles: ["✨", "⭐", "🌟", "💫", "✨"],
};

export default function ParticleTouch({
  type,
  container,
}: {
  type?: string | null;
  /** Bila diisi, partikel muncul di dalam elemen ini (mode preview). */
  container?: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    if (!type || !EMOJI_MAP[type]) return;
    const emojis = EMOJI_MAP[type];
    const host = container?.current ?? null;

    function spawnParticle(clientX: number, clientY: number) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const span = document.createElement("span");
      span.textContent = emoji;

      let x = clientX;
      let y = clientY;

      if (host) {
        const rect = host.getBoundingClientRect();
        // Abaikan klik di luar frame preview.
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          return;
        }
        x = clientX - rect.left;
        y = clientY - rect.top;
      }

      span.style.position = host ? "absolute" : "fixed";
      span.style.left = `${x}px`;
      span.style.top = `${y}px`;
      span.style.fontSize = `${Math.floor(Math.random() * 12) + 18}px`;
      span.style.pointerEvents = "none";
      span.style.userSelect = "none";
      span.style.zIndex = "20";
      span.style.transition = "transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.9s ease-out";
      span.style.transform = "translate(-50%, -50%) scale(0.6)";
      span.style.opacity = "1";

      (host ?? document.body).appendChild(span);

      requestAnimationFrame(() => {
        const dx = (Math.random() - 0.5) * 80;
        const dy = -(Math.random() * 60 + 50);
        const rot = (Math.random() - 0.5) * 60;
        span.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.1) rotate(${rot}deg)`;
        span.style.opacity = "0";
      });

      setTimeout(() => {
        if (span.parentNode) span.parentNode.removeChild(span);
      }, 950);
    }

    function burst(clientX: number, clientY: number) {
      for (let i = 0; i < 2; i++) {
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;
        spawnParticle(clientX + offsetX, clientY + offsetY);
      }
    }

    function handleClick(e: MouseEvent) {
      burst(e.clientX, e.clientY);
    }

    function handleTouch(e: TouchEvent) {
      const touch = e.touches[0];
      if (touch) burst(touch.clientX, touch.clientY);
    }

    const target: HTMLElement | Window = host ?? window;
    target.addEventListener("click", handleClick as EventListener, { passive: true });
    target.addEventListener("touchstart", handleTouch as EventListener, { passive: true });

    return () => {
      target.removeEventListener("click", handleClick as EventListener);
      target.removeEventListener("touchstart", handleTouch as EventListener);
    };
  }, [type, container]);

  return null;
}
