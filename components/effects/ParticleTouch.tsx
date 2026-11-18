"use client";

import { useEffect } from "react";

const EMOJI_MAP: Record<string, string[]> = {
  hearts: ["❤️", "💖", "💕", "💗", "💓"],
  roses: ["🌹", "🌸", "🌺", "🌷", "💐"],
  sparkles: ["✨", "⭐", "🌟", "💫", "✨"],
};

export default function ParticleTouch({ type }: { type?: string | null }) {
  useEffect(() => {
    if (!type || !EMOJI_MAP[type]) return;
    const emojis = EMOJI_MAP[type];

    function spawnParticle(x: number, y: number) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const span = document.createElement("span");
      span.textContent = emoji;
      span.style.position = "fixed";
      span.style.left = `${x}px`;
      span.style.top = `${y}px`;
      span.style.fontSize = `${Math.floor(Math.random() * 12) + 18}px`;
      span.style.pointerEvents = "none";
      span.style.userSelect = "none";
      span.style.zIndex = "9999";
      span.style.transition = "transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.9s ease-out";
      span.style.transform = "translate(-50%, -50%) scale(0.6)";
      span.style.opacity = "1";

      document.body.appendChild(span);

      // Trigger animasi melayang ke atas
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

    function handleClick(e: MouseEvent) {
      // Spawn 2-3 partikel per klik
      for (let i = 0; i < 2; i++) {
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;
        spawnParticle(e.clientX + offsetX, e.clientY + offsetY);
      }
    }

    function handleTouch(e: TouchEvent) {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        for (let i = 0; i < 2; i++) {
          const offsetX = (Math.random() - 0.5) * 20;
          const offsetY = (Math.random() - 0.5) * 20;
          spawnParticle(touch.clientX + offsetX, touch.clientY + offsetY);
        }
      }
    }

    window.addEventListener("click", handleClick, { passive: true });
    window.addEventListener("touchstart", handleTouch, { passive: true });

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("touchstart", handleTouch);
    };
  }, [type]);

  return null;
}
