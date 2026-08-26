"use client";

type SfxName = "tap" | "open" | "success" | "pop" | "heart";

const KEY = "pm:sfx:muted";

let ctx: AudioContext | null = null;
let muted = false;

if (typeof window !== "undefined") {
  try {
    muted = window.localStorage.getItem(KEY) === "1";
  } catch {
    /* ignore */
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = "sine",
  gainPeak = 0.06,
) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export function playSfx(name: SfxName) {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  switch (name) {
    case "tap":
      blip(640, 0, 0.07, "triangle", 0.05);
      break;
    case "pop":
      blip(300, 0, 0.09, "sine", 0.07);
      blip(620, 0.04, 0.08, "sine", 0.05);
      break;
    case "open":
      blip(520, 0, 0.12, "sine", 0.06);
      blip(780, 0.1, 0.14, "sine", 0.05);
      break;
    case "success":
      [523, 659, 784].forEach((f, i) => blip(f, i * 0.12, 0.18, "sine", 0.05));
      break;
    case "heart":
      blip(880, 0, 0.1, "sine", 0.05);
      break;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}
