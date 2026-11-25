/** Chiptune WebAudio. AudioContext dibuat hanya setelah gesture pertama (syarat autoplay). */

const STORE_KEY = "pm.courier.muted";
const MASTER_GAIN = 0.5;
const BGM_NOTES = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 698.46];
const BGM_STEP_FRAMES = 14;

export type GameAudio = {
  unlock: () => void;
  play: (event: string) => void;
  /** dipanggil tiap frame; memajukan sequencer musik */
  tick: () => void;
  /** turunkan volume master secara halus saat jeda / keluar layar */
  fadeOut: (durationMs?: number) => void;
  /** kembalikan volume master secara halus saat game dilanjutkan */
  fadeIn: (durationMs?: number) => void;
  setMuted: (value: boolean) => void;
  isMuted: () => boolean;
  dispose: () => void;
};

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(STORE_KEY) === "1";
  } catch {
    return false;
  }
}

export function createAudio(): GameAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = typeof window === "undefined" ? false : readMuted();
  let frame = 0;
  let step = 0;

  function ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const legacy = window as unknown as {
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctor = window.AudioContext ?? legacy.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MASTER_GAIN;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  function rampMaster(target: number, durationMs: number) {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const durSec = Math.max(0.02, durationMs / 1000);
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(target, now + durSec);
  }

  function blip(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay = 0,
    slideTo?: number
  ) {
    if (muted) return;
    const ac = ensure();
    if (!ac || !master) return;
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function play(event: string) {
    if (muted) return;
    if (event === "jump") {
      // Classic 8-bit platformer jump sweep (160Hz -> 680Hz)
      blip(160, 0.14, "square", 0.34, 0, 680);
    } else if (event === "bounce") {
      // Springboard bouncy boing (140Hz -> 620Hz)
      blip(140, 0.22, "sine", 0.42, 0, 620);
      blip(280, 0.15, "triangle", 0.25, 0.05, 780);
    } else if (event.startsWith("stomp")) {
      // Goomba-like crisp stomp & pop bounce
      blip(220, 0.08, "triangle", 0.34, 0, 520);
      blip(130, 0.09, "square", 0.16, 0.02, 70);
    } else if (event.startsWith("hurt")) {
      // Short retro hit buzz
      blip(300, 0.14, "sawtooth", 0.18, 0, 130);
    } else if (event === "fall") {
      // Chasm fall slide whistle
      blip(440, 0.24, "triangle", 0.24, 0, 140);
    } else if (event.startsWith("checkpoint")) {
      // Warm chime when activating a checkpoint lantern
      blip(587.33, 0.1, "triangle", 0.22, 0);
      blip(880.0, 0.18, "triangle", 0.24, 0.09);
    } else if (event === "gameover") {
      // Gentle 4-note descending tune
      [392.0, 349.23, 311.13, 261.63].forEach((f, i) =>
        blip(f, 0.18, "triangle", 0.2, i * 0.12)
      );
    } else if (event.startsWith("collect")) {
      blip(659.25, 0.09, "square", 0.18);
      blip(880, 0.09, "square", 0.16, 0.07);
      blip(1174.66, 0.12, "square", 0.14, 0.14);
    } else if (event === "toss") {
      // Soft upward whoosh chime when tossing gift to recipient
      blip(310, 0.14, "triangle", 0.24, 0, 640);
      blip(460, 0.12, "sine", 0.16, 0.04, 780);
    } else if (event === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        blip(f, 0.18, "triangle", 0.2, i * 0.11)
      );
    } else if (event === "ui") {
      blip(440, 0.05, "square", 0.12);
    }
  }

  return {
    unlock() {
      ensure();
      if (!muted) rampMaster(MASTER_GAIN, 120);
    },
    play,
    tick() {
      frame++;
      if (muted) return;
      if (frame % BGM_STEP_FRAMES !== 0) return;
      const note = BGM_NOTES[step % BGM_NOTES.length];
      step++;
      blip(note, 0.24, "triangle", 0.045);
      if (step % 4 === 1) blip(note / 2, 0.3, "triangle", 0.035);
    },
    fadeOut(durationMs = 320) {
      rampMaster(0, durationMs);
    },
    fadeIn(durationMs = 140) {
      if (muted) return;
      ensure();
      rampMaster(MASTER_GAIN, durationMs);
    },
    setMuted(value: boolean) {
      muted = value;
      try {
        window.localStorage.setItem(STORE_KEY, value ? "1" : "0");
      } catch {
        /* storage diblokir — abaikan */
      }
      if (value) {
        rampMaster(0, 200);
      } else {
        ensure();
        rampMaster(MASTER_GAIN, 140);
      }
    },
    isMuted() {
      return muted;
    },
    dispose() {
      if (ctx) void ctx.close();
      ctx = null;
      master = null;
    },
  };
}
