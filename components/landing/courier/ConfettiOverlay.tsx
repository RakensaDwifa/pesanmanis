"use client";

import { useEffect, useRef } from "react";

const CONFETTI_COLORS = [
  "#DE7038",
  "#FFD166",
  "#FFDBCB",
  "#DC4A4A",
  "#4E8A54",
  "#FFF9F5",
] as const;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rot: number;
  vRot: number;
  wobble: number;
  wobbleSpeed: number;
  life: number;
  maxLife: number;
  circle: boolean;
};

type ConfettiOverlayProps = {
  active: boolean;
  reduced?: boolean;
  className?: string;
};

export function ConfettiOverlay({
  active,
  reduced = false,
  className = "",
}: ConfettiOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!active || reduced) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = Math.max(canvas.clientWidth, 300);
    let height = Math.max(canvas.clientHeight, 200);

    function syncSize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        width = rect.width;
        height = rect.height;
      }
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    syncSize();
    const ro =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => syncSize());
    ro?.observe(canvas);

    const speedScale = Math.max(0.62, Math.min(1.15, width / 920));
    const pieces: Piece[] = [];

    const makePiece = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      idx: number
    ): Piece => ({
      x,
      y,
      vx,
      vy,
      w: idx % 5 === 0 ? 6 : 7 + (idx % 4) * 1.5,
      h: idx % 5 === 0 ? 6 : 4 + (idx % 3) * 1.4,
      color: CONFETTI_COLORS[idx % CONFETTI_COLORS.length],
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.24,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.06,
      life: 0,
      maxLife: 165 + Math.floor(Math.random() * 65),
      circle: idx % 5 === 0,
    });

    // Left cannon burst
    for (let i = 0; i < 24; i++) {
      const angle = -0.3 - Math.random() * 0.92;
      const spd = (6.8 + Math.random() * 6.5) * speedScale;
      pieces.push(
        makePiece(
          width * 0.03,
          height * (0.48 + Math.random() * 0.26),
          Math.cos(angle) * spd,
          Math.sin(angle) * spd,
          i
        )
      );
    }

    // Right cannon burst
    for (let i = 0; i < 24; i++) {
      const angle = Math.PI + 0.3 + Math.random() * 0.92;
      const spd = (6.8 + Math.random() * 6.5) * speedScale;
      pieces.push(
        makePiece(
          width * 0.97,
          height * (0.48 + Math.random() * 0.26),
          Math.cos(angle) * spd,
          Math.sin(angle) * spd,
          i + 2
        )
      );
    }

    // Top gentle ribbon shower
    for (let i = 0; i < 27; i++) {
      pieces.push(
        makePiece(
          width * (0.04 + Math.random() * 0.92),
          -8 - Math.random() * 54,
          (Math.random() - 0.5) * 2.1,
          1.4 + Math.random() * 2.6,
          i + 1
        )
      );
    }

    let raf = 0;
    let lastTime = performance.now();

    function tick(now: number) {
      if (!ctx) return;
      const dtMs = Math.min(34, Math.max(4, now - lastTime));
      lastTime = now;
      const dt = dtMs / 16.6667;

      ctx.clearRect(0, 0, width, height);

      let alive = 0;
      for (const p of pieces) {
        if (p.life >= p.maxLife || p.y > height + 24) continue;
        alive++;

        p.life += dt;
        p.vy += 0.145 * dt;
        p.vx *= Math.pow(0.985, dt);
        p.vy *= Math.pow(0.992, dt);
        p.wobble += p.wobbleSpeed * dt;
        p.rot += p.vRot * dt;
        p.x += (p.vx + Math.sin(p.wobble) * 0.55) * dt;
        p.y += p.vy * dt;

        const fadeStart = p.maxLife * 0.68;
        const alpha =
          p.life > fadeStart
            ? Math.max(0, 1 - (p.life - fadeStart) / (p.maxLife - fadeStart))
            : 1;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * 0.45);
        ctx.scale(1, 0.32 + 0.68 * Math.abs(Math.cos(p.rot * 1.5)));
        ctx.fillStyle = p.color;
        if (p.circle) {
          ctx.beginPath();
          ctx.arc(0, 0, p.w * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }

      if (alive > 0) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      ctx.clearRect(0, 0, width, height);
    };
  }, [active, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
    />
  );
}
