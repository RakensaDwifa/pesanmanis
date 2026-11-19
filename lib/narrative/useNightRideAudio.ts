"use client";

import { useRef, useState, useEffect, useCallback } from "react";

/**
 * Hook khusus Web Audio API & BGM Controller untuk Bonceng Malam.
 * Zero external audio files untuk SFX, zero-latency, filter biquad & oscillator analog lo-fi.
 */
export function useNightRideAudio(musicUrl?: string, preview = false) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  // Inisialisasi AudioContext aman (autoplay policy)
  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Safe haptic vibration (aman di iOS Safari tanpa crash)
  const safeVibrate = useCallback((pattern: number | number[]) => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }, []);

  // Unlock audio & start background music jika ada
  const unlockAudio = useCallback(() => {
    getAudioContext();
    setIsAudioUnlocked(true);

    if (musicUrl && !preview && !bgmRef.current) {
      try {
        const audio = new Audio(musicUrl);
        audio.loop = true;
        audio.volume = 0.4;
        audio.play().catch(() => {});
        bgmRef.current = audio;
      } catch {}
    }
  }, [getAudioContext, musicUrl, preview]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (bgmRef.current) {
        bgmRef.current.muted = next;
      }
      return next;
    });
  }, []);

  // SFX 1: Bunyi klik / snap pengunci helm mekanis (triangle 320Hz -> 80Hz)
  const playHelmetSnap = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, ctx.currentTime);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(75, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
    safeVibrate(15);
  }, [getAudioContext, isMuted, safeVibrate]);

  // SFX 2: Bunyi clack visor helm turun (dua klik mikro 420Hz & 350Hz)
  const playVisorClack = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    [420, 350].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.03);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.03 + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.03);
      osc.stop(ctx.currentTime + idx * 0.03 + 0.04);
    });
    safeVibrate([10, 20, 15]);
  }, [getAudioContext, isMuted, safeVibrate]);

  // SFX 3: Dengung mesin skuter & deru angin malam lembut (dimulai saat hold)
  const startEngineHum = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (!engineOscRef.current) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(140, ctx.currentTime);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(68, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(95, ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      engineOscRef.current = osc;
      engineGainRef.current = gain;
    }
  }, [getAudioContext, isMuted]);

  // SFX 3b: Update frekuensi mesin sesuai progres laju
  const updateEngineSpeed = useCallback((speedPercent: number) => {
    if (!engineOscRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const targetFreq = 70 + (speedPercent / 100) * 45; // 70Hz -> 115Hz
    engineOscRef.current.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.1);
  }, []);

  // SFX 3c: Hentikan dengung mesin
  const stopEngineHum = useCallback(() => {
    if (engineOscRef.current && engineGainRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      engineGainRef.current.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      setTimeout(() => {
        try {
          engineOscRef.current?.stop();
          engineOscRef.current?.disconnect();
        } catch {}
        engineOscRef.current = null;
        engineGainRef.current = null;
      }, 220);
    }
  }, []);

  // SFX 4: Chime pentatonik mawar mekar & buka jok (G3-B3-D4-G4)
  const playFlowerChime = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [196.0, 246.94, 293.66, 392.0];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.65);
    });
    safeVibrate([20, 40, 30]);
  }, [getAudioContext, isMuted, safeVibrate]);

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      stopEngineHum();
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopEngineHum]);

  return {
    isMuted,
    isAudioUnlocked,
    unlockAudio,
    toggleMute,
    playHelmetSnap,
    playVisorClack,
    startEngineHum,
    updateEngineSpeed,
    stopEngineHum,
    playFlowerChime,
    safeVibrate,
  };
}
