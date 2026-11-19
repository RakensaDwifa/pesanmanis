"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type ForwardedRef,
} from "react";
import "./flower-transition.css";

const SPRITE = (() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
    <g fill='#e88aa8'>
      <ellipse cx='50' cy='22' rx='13' ry='24'/>
      <ellipse cx='50' cy='22' rx='13' ry='24' transform='rotate(72 50 50)'/>
      <ellipse cx='50' cy='22' rx='13' ry='24' transform='rotate(144 50 50)'/>
      <ellipse cx='50' cy='22' rx='13' ry='24' transform='rotate(216 50 50)'/>
      <ellipse cx='50' cy='22' rx='13' ry='24' transform='rotate(288 50 50)'/>
    </g>
    <circle cx='50' cy='50' r='12' fill='#f6d36b'/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
})();

const ENTER_MS = 700;
const EXIT_MS = 520;
const MAX_RADIAL_DELAY = 300;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

interface Flower {
  id: string;
  tx: number;
  ty: number;
  size: number;
  ox: number;
  oy: number;
  delayIn: number;
  delayOut: number;
  sway: {
    dur: number;
    delay: number;
    rot: number;
    drift: number;
  };
}

function buildFlowers(): Flower[] {
  if (typeof window === "undefined") return [];

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const cols = Math.max(6, Math.round(vw / 70));
  const rows = Math.max(6, Math.round(vh / 70));
  const cellW = vw / cols;
  const cellH = vh / rows;
  const size = Math.max(cellW, cellH) * 1.7;

  const cx = vw / 2;
  const cy = vh / 2;
  const maxDist = Math.hypot(cx, cy) || 1;
  const outerR = Math.hypot(vw, vh) * 0.75;

  const flowers: Flower[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tx = (c + 0.5) * cellW + rand(-0.17, 0.17) * cellW;
      const ty = (r + 0.5) * cellH + rand(-0.17, 0.17) * cellH;

      const angle = Math.atan2(ty - cy, tx - cx);
      const dist = Math.hypot(tx - cx, ty - cy);
      const norm = dist / maxDist;

      flowers.push({
        id: `${r}-${c}`,
        tx,
        ty,
        size,
        ox: cx + Math.cos(angle) * outerR,
        oy: cy + Math.sin(angle) * outerR,
        delayIn: Math.round((1 - norm) * MAX_RADIAL_DELAY),
        delayOut: Math.round(norm * MAX_RADIAL_DELAY),
        sway: {
          dur: rand(1.5, 3),
          delay: -rand(0, 3),
          rot: rand(2, 6),
          drift: rand(2, 7),
        },
      });
    }
  }
  return flowers;
}

export interface FlowerTransitionRef {
  play: (onCovered?: () => void, holdMs?: number) => Promise<void>;
}

const FlowerTransition = forwardRef<FlowerTransitionRef>(
  function FlowerTransition(_props, ref: ForwardedRef<FlowerTransitionRef>) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const runningRef = useRef(false);
    const [items, setItems] = useState<Flower[]>([]);
    const [on, setOn] = useState(false);

    const play = useCallback(async (onCovered?: () => void, holdMs = 250) => {
      if (runningRef.current) return;
      runningRef.current = true;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const enterMs = reduce ? 1 : ENTER_MS;
      const exitMs = reduce ? 1 : EXIT_MS;

      const flowers = buildFlowers();
      setItems(flowers);
      setOn(true);
      await nextFrame();

      const nodes = overlayRef.current
        ? Array.from(overlayRef.current.querySelectorAll<HTMLDivElement>(".ft-flower-wrapper"))
        : [];

      const half = (f: Flower) => f.size / 2;

      // --- Masuk: luar layar -> posisi grid, delay radial ---
      const enter = nodes.map((el) => {
        const f = flowers[Number(el.dataset.idx)];
        return el.animate(
          [
            {
              transform: `translate3d(${f.ox - half(f)}px, ${f.oy - half(f)}px, 0) scale(0.5)`,
              opacity: 0,
            },
            {
              transform: `translate3d(${f.tx - half(f)}px, ${f.ty - half(f)}px, 0) scale(1)`,
              opacity: 1,
            },
          ],
          {
            duration: enterMs,
            delay: reduce ? 0 : f.delayIn,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "both",
          }
        );
      });
      await Promise.all(enter.map((a) => a.finished.catch(() => {})));

      // --- Hold: layar tertutup penuh, ganti konten di sini ---
      onCovered?.();
      await sleep(reduce ? 0 : holdMs);

      // --- Keluar: kembali ke luar layar, tengah keluar dulu ---
      const exit = nodes.map((el) => {
        const f = flowers[Number(el.dataset.idx)];
        return el.animate(
          [
            {
              transform: `translate3d(${f.tx - half(f)}px, ${f.ty - half(f)}px, 0) scale(1)`,
              opacity: 1,
            },
            {
              transform: `translate3d(${f.ox - half(f)}px, ${f.oy - half(f)}px, 0) scale(0.5)`,
              opacity: 0,
            },
          ],
          {
            duration: exitMs,
            delay: reduce ? 0 : f.delayOut,
            easing: "cubic-bezier(0.55, 0, 0.45, 1)",
            fill: "both",
          }
        );
      });
      await Promise.all(exit.map((a) => a.finished.catch(() => {})));

      setOn(false);
      setItems([]);
      runningRef.current = false;
    }, []);

    useImperativeHandle(ref, () => ({ play }), [play]);

    return (
      <div
        ref={overlayRef}
        className={`ft-overlay${on ? " is-on" : ""}`}
        aria-hidden="true"
      >
        {items.map((f, i) => (
          <div
            key={f.id}
            data-idx={i}
            className="ft-flower-wrapper"
            style={{ width: f.size, height: f.size } as React.CSSProperties}
          >
            <img
              src={SPRITE}
              alt=""
              style={{
                "--sw-dur": `${f.sway.dur.toFixed(2)}s`,
                "--sw-delay": `${f.sway.delay.toFixed(2)}s`,
                "--sw-rot": `${f.sway.rot.toFixed(1)}deg`,
                "--sw-drift": `${f.sway.drift.toFixed(1)}px`,
              } as React.CSSProperties}
            />
          </div>
        ))}
      </div>
    );
  }
);

export default FlowerTransition;