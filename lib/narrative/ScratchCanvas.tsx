"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { sfx } from "./sound";

interface ScratchCanvasProps {
  onComplete: () => void;
  brushRadius?: number;
  thresholdPercent?: number; // Persentase terbuka (misal 55%)
  className?: string;
  tintColor?: string; // Warna embun kaca / lapisan penutup
}

/**
 * Native Canvas 2D Scratch Mask (Destination-Out).
 * Super ringan, responsif touch/mouse, dan hemat memori tanpa library eksternal.
 */
export default function ScratchCanvas({
  onComplete,
  brushRadius = 32,
  thresholdPercent = 55,
  className = "",
  tintColor = "rgba(220, 235, 245, 0.94)", // Nuansa embun kaca jendela
}: ScratchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [cleared, setCleared] = useState(false);
  const totalPixels = useRef(0);
  const checkThrottle = useRef(0);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    totalPixels.current = canvas.width * canvas.height;

    // Lapisan embun
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Tambah sedikit tekstur kabut / rintik embun
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    for (let i = 0; i < 40; i++) {
      const rx = Math.random() * canvas.width;
      const ry = Math.random() * canvas.height;
      const r = Math.random() * 4 + 1;
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [tintColor]);

  useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initCanvas]);

  const checkProgress = useCallback(() => {
    if (cleared) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sample setiap 16 pixel untuk efisiensi CPU 60fps
    const stride = 16;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    let transparentCount = 0;
    let sampleCount = 0;

    for (let i = 3; i < data.length; i += 4 * stride) {
      sampleCount++;
      if (data[i] < 128) {
        transparentCount++;
      }
    }

    const pct = (transparentCount / sampleCount) * 100;
    if (pct >= thresholdPercent) {
      setCleared(true);
      sfx.chime();
      onComplete();
    }
  }, [cleared, onComplete, thresholdPercent]);

  const erase = (clientX: number, clientY: number) => {
    if (cleared) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
    ctx.fill();

    // Throttle perhitungan persentase (tiap 100ms)
    const now = Date.now();
    if (now - checkThrottle.current > 120) {
      checkThrottle.current = now;
      checkProgress();
      sfx.wipe();
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDrawing.current = true;
    erase(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current) return;
    erase(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
    checkProgress();
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`touch-none cursor-crosshair select-none transition-opacity duration-700 ${
        cleared ? "opacity-0 pointer-events-none" : "opacity-100"
      } ${className}`}
    />
  );
}
