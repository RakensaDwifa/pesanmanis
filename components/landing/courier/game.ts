import { createAudio, type GameAudio } from "./audio";
import { ITEM_LABELS, PALETTE } from "./palette";
import {
  CHECKPOINTS,
  DOOR,
  MAX_HP,
  MOMENTS,
  PHYS,
  PLAYER,
  PLATFORMS,
  SPRINGBOARDS,
  WORLD,
  cameraX,
  canDeliver,
  createState,
  step,
  type Input,
  type MomentId,
  type State,
} from "./physics";
import {
  drawChasms,
  drawCheckpoints,
  drawCrumblePlatforms,
  drawEnemies,
  drawFinishRecipient,
  drawMoment,
  drawMovingPlatforms,
  drawParallaxBackground,
  drawSpringboards,
  drawTerrain,
  type DeliveryAnim,
} from "./scenery";

export type Phase = "idle" | "playing" | "paused" | "won" | "lost";

export type Hooks = {
  onPhase?: (phase: Phase) => void;
  onProgress?: (collected: number, total: number) => void;
  onCollected?: (ids: MomentId[]) => void;
  onHp?: (hp: number, maxHp: number) => void;
  onMuted?: (muted: boolean) => void;
  onNearMoment?: (momentId: string | null) => void;
};

export type Handle = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  press: (key: "left" | "right" | "jump", down: boolean) => void;
  setMuted: (value: boolean) => void;
  isMuted: () => boolean;
  collect: (momentId: string) => void;
  destroy: () => void;
};

const COURIER_SRC = "/game/courier_spritesheet.png";
const RECIPIENT_SRC = "/game/recipient_spritesheet.png";
const FRAME_SIZE = 96;

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type FloatingText = { text: string; x: number; y: number; life: number };

export function mount(canvas: HTMLCanvasElement, hooks: Hooks = {}): Handle {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 2);
  const VH = WORLD.viewH;
  let VW: number = WORLD.viewW;

  function resize() {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : VW / VH;
    VW = Math.max(640, Math.min(WORLD.w, Math.round(VH * ratio)));
    canvas.width = Math.round(VW * dpr);
    canvas.height = Math.round(VH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    draw();
  }

  const audio: GameAudio = createAudio();
  const input: Input = { left: false, right: false, jump: false };
  let state: State = createState();
  let phase: Phase = "idle";
  let cam = 0;
  let raf = 0;
  let acc = 0;
  let last = 0;
  let lastNear: string | null = null;
  const particles: Particle[] = [];
  const floatingTexts: FloatingText[] = [];
  const springTimers: number[] = SPRINGBOARDS.map(() => 0);
  const squash = { sx: 1, sy: 1 };

  let courierImg: HTMLImageElement | null = null;
  let recipientImg: HTMLImageElement | null = null;
  let delivery: DeliveryAnim | null = null;

  function loadAssets() {
    if (typeof window === "undefined") return;
    if (!courierImg) {
      const img = new Image();
      img.decoding = "async";
      img.onload = draw;
      img.src = COURIER_SRC;
      courierImg = img;
    }
    if (!recipientImg) {
      const rec = new Image();
      rec.decoding = "async";
      rec.onload = draw;
      rec.src = RECIPIENT_SRC;
      recipientImg = rec;
    }
  }

  function startGame() {
    audio.unlock();
    loadAssets();
    state = createState();
    delivery = null;
    particles.length = 0;
    floatingTexts.length = 0;
    springTimers.fill(0);
    squash.sx = 1;
    squash.sy = 1;
    lastNear = null;
    input.left = false;
    input.right = false;
    input.jump = false;
    cam = 0;
    acc = 0;
    last = 0;
    setPhase("playing");
    progress();
    canvas.focus({ preventScroll: true });
  }

  function setPhase(next: Phase) {
    if (phase === next) return;
    phase = next;
    hooks.onPhase?.(next);
  }

  function progress() {
    hooks.onProgress?.(state.collected.length, MOMENTS.length);
    hooks.onCollected?.([...state.collected]);
    hooks.onHp?.(state.hp, MAX_HP);
  }

  function burst(x: number, y: number) {
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * (1.2 + Math.random() * 1.8),
        vy: Math.sin(a) * (1.2 + Math.random() * 1.8) - 1,
        life: 44,
        color: i % 3 === 0 ? PALETTE.gold : i % 2 === 0 ? PALETTE.terracotta : PALETTE.cream,
      });
    }
  }

  function spawnDust(x: number, y: number, count = 4, vxSpread = 1.6) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * (PLAYER.w * 0.7),
        y: y - Math.random() * 4,
        vx: (Math.random() - 0.5) * vxSpread,
        vy: -Math.random() * 1.7 - 0.3,
        life: 18 + Math.floor(Math.random() * 8),
        color: Math.random() > 0.5 ? "rgba(255, 244, 232, 0.88)" : "rgba(218, 190, 170, 0.78)",
      });
    }
  }

  function triggerNearestSpringAnimation() {
    const px = state.x + PLAYER.w / 2;
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < SPRINGBOARDS.length; i++) {
      const sp = SPRINGBOARDS[i];
      const dist = Math.abs(px - (sp.x + sp.w / 2));
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      springTimers[bestIdx] = 12;
    }
  }

  function handleEvents(events: string[]) {
    for (const ev of events) {
      if (ev !== "win") audio.play(ev);
      if (ev === "jump") {
        squash.sx = 0.88;
        squash.sy = 1.12;
        spawnDust(state.x + PLAYER.w / 2, state.y, 6, 2.4);
      }
      if (ev === "doublejump") {
        squash.sx = 0.86;
        squash.sy = 1.14;
        spawnDust(state.x + PLAYER.w / 2, state.y, 8, 3.0);
      }
      if (ev === "bounce") {
        squash.sx = 0.8;
        squash.sy = 1.22;
        triggerNearestSpringAnimation();
        for (let i = 0; i < 8; i++) {
          particles.push({
            x: state.x + PLAYER.w / 2 + (Math.random() - 0.5) * 24,
            y: state.y,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 3 - 1,
            life: 20 + Math.floor(Math.random() * 8),
            color: Math.random() > 0.4 ? PALETTE.gold : PALETTE.terracotta,
          });
        }
      }
      if (ev === "land") {
        squash.sx = 1.15;
        squash.sy = 0.87;
        spawnDust(state.x + PLAYER.w / 2, state.y, 5, 2.0);
      }
      if (ev.startsWith("stomp:")) {
        squash.sx = 0.82;
        squash.sy = 1.2;
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI * i) / 10;
          particles.push({
            x: state.x + PLAYER.w / 2,
            y: state.y,
            vx: Math.cos(a) * (1.5 + Math.random() * 1.5),
            vy: -Math.sin(a) * (1.8 + Math.random() * 1.5),
            life: 24 + Math.floor(Math.random() * 8),
            color: i % 2 === 0 ? PALETTE.gold : PALETTE.kraftLight,
          });
        }
      }
      if (ev.startsWith("hurt:")) {
        squash.sx = 1.18;
        squash.sy = 0.84;
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI * 2 * i) / 10;
          particles.push({
            x: state.x + PLAYER.w / 2,
            y: state.y - PLAYER.h / 2,
            vx: Math.cos(a) * (1.5 + Math.random() * 1.4),
            vy: Math.sin(a) * (1.5 + Math.random() * 1.4) - 0.8,
            life: 26,
            color: i % 2 === 0 ? PALETTE.coral : PALETTE.peachLight,
          });
        }
        floatingTexts.push({
          text: "-1 Hati",
          x: state.x + PLAYER.w / 2,
          y: state.y - PLAYER.h - 10,
          life: 44,
        });
        hooks.onHp?.(state.hp, MAX_HP);
      }
      if (ev === "fall") {
        burst(state.x + PLAYER.w / 2, state.y - PLAYER.h / 2);
        floatingTexts.push({
          text: "-1 Hati • Pos Terakhir",
          x: state.x + PLAYER.w / 2,
          y: state.y - PLAYER.h - 14,
          life: 54,
        });
        hooks.onHp?.(state.hp, MAX_HP);
      }
      if (ev.startsWith("checkpoint:")) {
        const cpId = ev.slice(11);
        const cp = CHECKPOINTS.find((item) => item.id === cpId);
        if (cp) {
          burst(cp.x, cp.y - 54);
          floatingTexts.push({
            text: "Checkpoint!",
            x: cp.x,
            y: cp.y - 92,
            life: 52,
          });
        }
      }
      if (ev === "gameover") {
        hooks.onHp?.(0, MAX_HP);
        setPhase("lost");
      }
      if (ev.startsWith("collect:")) {
        const id = ev.slice(8);
        const m = MOMENTS.find((item) => item.id === id);
        if (m) {
          burst(m.x, m.y);
          floatingTexts.push({
            text: ITEM_LABELS[id] || "+1 Kado",
            x: m.x,
            y: m.y - 22,
            life: 52,
          });
        }
        progress();
      }
      if (ev === "win") {
        state.facing = 1;
        state.vx = 0;
        state.vy = Math.max(0, state.vy);
        state.x = Math.min(state.x, DOOR.x - 16);
        squash.sx = 1;
        squash.sy = 1;
        input.left = false;
        input.right = false;
        input.jump = false;
        delivery = {
          frame: 0,
          startX: state.x + PLAYER.w - 4,
          startY: state.y - 52,
        };
      }
    }
  }

  function drawPlayer() {
    if (!ctx) return;
    const cx = Math.round(state.x + PLAYER.w / 2);
    const feetY = Math.round(state.y);

    // Grounded contact shadow centered under boots
    if (state.grounded) {
      ctx.fillStyle = "rgba(36, 25, 20, 0.24)";
      ctx.beginPath();
      ctx.ellipse(cx, feetY - 1, 20, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const walking = Math.abs(state.vx) > 0 && state.grounded;
    let animRow = 0;
    let animCol = 0;

    if (!state.grounded) {
      animRow = 2;
      animCol = state.vy < -2 ? 0 : state.vy > 2 ? 2 : 1;
    } else if (walking) {
      animRow = 1;
      animCol = Math.floor(state.t / 6) % 6;
    } else {
      animRow = 0;
      animCol = Math.floor(state.t / 10) % 4;
    }

    const sx = animCol * FRAME_SIZE;
    const sy = animRow * FRAME_SIZE;
    const drawSize = FRAME_SIZE; // 96x96 = 1:1 integer pixel mapping

    ctx.save();
    // Blink transparently while invulnerable after taking a hit or respawning
    if (state.invuln > 0 && Math.floor(state.t / 4) % 2 === 1) {
      ctx.globalAlpha = 0.38;
    }
    // Anchor transform at bottom-center (feetY) so squash/stretch never detaches boots from floor
    ctx.translate(cx, feetY);
    ctx.scale(state.facing * squash.sx, squash.sy);

    if (courierImg && courierImg.complete && courierImg.naturalWidth > 0) {
      ctx.drawImage(
        courierImg,
        sx,
        sy,
        FRAME_SIZE,
        FRAME_SIZE,
        -drawSize / 2,
        -drawSize,
        drawSize,
        drawSize
      );
    } else {
      ctx.fillStyle = PALETTE.terracotta;
      ctx.fillRect(-PLAYER.w / 2, -PLAYER.h, PLAYER.w, PLAYER.h);
    }
    ctx.restore();
  }

  function drawParticles() {
    if (!ctx) return;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.min(1, p.life / 26);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloatingTexts() {
    if (!ctx) return;
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 0.75;
      ft.life--;
      if (ft.life <= 0) {
        floatingTexts.splice(i, 1);
        continue;
      }
      const alpha = Math.min(1, ft.life / 16);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '700 13px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const textW = ctx.measureText(ft.text).width;
      const bW = textW + 18;
      const bH = 26;

      ctx.fillStyle = "rgba(255, 249, 245, 0.96)";
      ctx.strokeStyle = PALETTE.peachMid;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(ft.x - bW / 2, ft.y - bH / 2, bW, bH, 13);
      } else {
        ctx.rect(ft.x - bW / 2, ft.y - bH / 2, bW, bH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = PALETTE.terracotta;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VW, VH);

    const target = cameraX(state, VW);
    cam += (target - cam) * 0.16;
    if (Math.abs(target - cam) < 0.4) cam = target;

    drawParallaxBackground(ctx, cam, VW, state.t);

    ctx.save();
    ctx.translate(-Math.round(cam), 0);
    drawChasms(ctx, cam, VW, state.t);
    PLATFORMS.forEach((p) => drawTerrain(ctx, p, cam, VW));
    drawCrumblePlatforms(ctx, state.crumbleTimers);
    drawMovingPlatforms(ctx, state.t);
    drawSpringboards(ctx, state, springTimers);
    drawCheckpoints(ctx, state);
    drawFinishRecipient(ctx, state, recipientImg, delivery);
    MOMENTS.forEach((m, i) => drawMoment(ctx, m, i, state));
    drawEnemies(ctx, state);
    drawPlayer();
    drawParticles();
    drawFloatingTexts();
    ctx.restore();
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (phase !== "playing") {
      last = now;
      return;
    }
    let dt = now - last;
    last = now;
    if (dt > 120) dt = 120;
    acc += dt;
    let guard = 0;
    while (acc >= PHYS.frameMs && guard++ < 5) {
      acc -= PHYS.frameMs;
      if (delivery) {
        state.t++;
        if (state.y < WORLD.groundY) {
          state.vy = Math.min(state.vy + 0.65, 10);
          state.y = Math.min(WORLD.groundY, state.y + state.vy);
          if (state.y >= WORLD.groundY) {
            state.vy = 0;
            state.grounded = true;
            squash.sx = 1.15;
            squash.sy = 0.87;
          }
        }
        delivery.frame++;
        if (delivery.frame === 18) {
          delivery.startY = state.y - 52;
          audio.play("toss");
          squash.sx = 1.12;
          squash.sy = 0.9;
        }
        if (delivery.frame === 46) {
          audio.play("win");
          burst(DOOR.x + DOOR.w - 28, WORLD.groundY - 56);
        }
        if (delivery.frame >= 66) {
          delivery = null;
          setPhase("won");
          break;
        }
      } else {
        handleEvents(step(state, input, { manualCollect: ["foto", "lagu", "surat"] }));
      }

      // Recover squash-and-stretch smoothly
      squash.sx += (1 - squash.sx) * 0.24;
      squash.sy += (1 - squash.sy) * 0.24;
      for (let i = 0; i < springTimers.length; i++) {
        if (springTimers[i] > 0) springTimers[i]--;
      }

      // Subtle footsteps dust while walking
      if (!delivery && state.grounded && Math.abs(state.vx) > 0 && state.t % 8 === 0) {
        spawnDust(state.x + PLAYER.w / 2 - state.facing * 8, state.y, 2, 0.8);
      }
      // Golden porch sparkles when delivery is unlocked
      if (!delivery && canDeliver(state) && state.t % 7 === 0) {
        particles.push({
          x: DOOR.x + 10 + Math.random() * (DOOR.w - 20),
          y: DOOR.y + DOOR.h - 14,
          vx: (Math.random() - 0.5) * 0.9,
          vy: -Math.random() * 2.1 - 1.0,
          life: 28 + Math.floor(Math.random() * 10),
          color: Math.random() > 0.4 ? PALETTE.gold : PALETTE.terracotta,
        });
      }

      // Proximity check for collectible items
      if (!delivery) {
        let near: string | null = null;
        for (const m of MOMENTS) {
          const dx = Math.abs(state.x + PLAYER.w / 2 - m.x);
          const dy = Math.abs(state.y - m.y);
          if (dx < 95 && dy < 130) {
            near = m.id;
            break;
          }
        }
        if (near !== lastNear) {
          lastNear = near;
          hooks.onNearMoment?.(near);
        }
      }
    }
    audio.tick();
    draw();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (phase !== "playing") return;
    const key = e.key.toLowerCase();
    if (delivery !== null) {
      if (
        ["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "a", "d", "w", "e"].includes(key) ||
        e.code === "Space"
      ) {
        e.preventDefault();
      }
      return;
    }
    audio.unlock();
    if (key === "arrowleft" || key === "a") {
      input.left = true;
      e.preventDefault();
    } else if (key === "arrowright" || key === "d") {
      input.right = true;
      e.preventDefault();
    } else if (key === " " || e.code === "Space" || key === "arrowup" || key === "w") {
      input.jump = true;
      e.preventDefault();
    } else if (key === "arrowdown") {
      e.preventDefault();
    } else if (key === "e") {
      if (lastNear) {
        hooks.onNearMoment?.(`${lastNear}:action`);
        e.preventDefault();
      }
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    if (key === "arrowleft" || key === "a") input.left = false;
    else if (key === "arrowright" || key === "d") input.right = false;
    else if (key === " " || e.code === "Space" || key === "arrowup" || key === "w") input.jump = false;
  }

  function onVisibility() {
    if (document.hidden && phase === "playing") setPhase("paused");
  }

  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("keyup", onKeyUp, { capture: true });
  document.addEventListener("visibilitychange", onVisibility);
  const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => resize());
  ro?.observe(canvas);
  resize();
  raf = requestAnimationFrame(frame);
  loadAssets();
  draw();
  progress();

  return {
    start: startGame,
    pause() {
      if (phase === "playing") setPhase("paused");
    },
    resume() {
      if (phase === "paused") {
        audio.unlock();
        setPhase("playing");
        canvas.focus({ preventScroll: true });
      }
    },
    restart: startGame,
    press(key, down) {
      if (delivery !== null) {
        input[key] = false;
        return;
      }
      input[key] = down;
      if (down) audio.unlock();
    },
    setMuted(value) {
      audio.setMuted(value);
      hooks.onMuted?.(value);
    },
    isMuted() {
      return audio.isMuted();
    },
    collect(id: string) {
      const momentId = id as MomentId;
      if (!state.collected.includes(momentId)) {
        state.collected.push(momentId);
        const m = MOMENTS.find((item) => item.id === id);
        if (m) {
          burst(m.x, m.y);
          floatingTexts.push({
            text: ITEM_LABELS[id] || "+1 Kado",
            x: m.x,
            y: m.y - 22,
            life: 52,
          });
        }
        audio.play(`collect:${id}`);
        progress();
        if (lastNear === id) {
          lastNear = null;
          hooks.onNearMoment?.(null);
        }
      }
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      audio.dispose();
      if (courierImg) courierImg.onload = null;
      if (recipientImg) recipientImg.onload = null;
    },
  };
}
