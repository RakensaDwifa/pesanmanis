/**
 * Logika murni mini-game kurir kado. Tanpa DOM, tanpa canvas — aman diuji di Node.
 * Satuan jarak: piksel dunia. Satuan waktu: frame tetap 60fps.
 */

export type Platform = { x: number; y: number; w: number; h: number };
export type Chasm = { x: number; w: number };
export type Springboard = { x: number; y: number; w: number; h: number };
export type MovingPlatform = {
  id: string;
  baseX: number;
  y: number;
  w: number;
  h: number;
  rangeX: number;
  speed: number;
};
export type CrumblePlatform = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};
export type Checkpoint = { id: string; x: number; y: number };
export type EnemyVariant = "normal" | "fast";
export type Enemy = {
  id: string;
  variant: EnemyVariant;
  x: number;
  y: number;
  w: number;
  h: number;
  minX: number;
  maxX: number;
  speed: number;
};
export type EnemyState = Enemy & {
  dir: 1 | -1;
  alive: boolean;
  squashTimer: number;
};

export type MomentId = "foto" | "lagu" | "surat";
export type Moment = { id: MomentId; label: string; x: number; y: number };
export type Input = { left: boolean; right: boolean; jump: boolean };

export const MAX_HP = 3;
export const INVULN_FRAMES = 90;
export const KNOCKBACK_FRAMES = 12;
export const CRUMBLE_FALL_FRAMES = 55;
export const CRUMBLE_RESPAWN_FRAMES = 175;

export type State = {
  /** sudut kiri atas kotak pemain */
  x: number;
  /** titik kaki pemain */
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: 1 | -1;
  coyote: number;
  buffer: number;
  jumpHeld: boolean;
  /** true only during a regular ground/coyote jump so variable jump cut never dampens bounces/stomps */
  jumpFromGround: boolean;
  collected: MomentId[];
  t: number;
  won: boolean;
  lost: boolean;
  hp: number;
  invuln: number;
  knockbackTimer: number;
  checkpointX: number;
  checkpointY: number;
  checkpointsReached: string[];
  crumbleTimers: number[];
  bounceSpringIndex: number | null;
  enemies: EnemyState[];
};

export const WORLD = {
  w: 4800,
  h: 720,
  viewW: 1280,
  viewH: 720,
  groundY: 560,
} as const;

export const START_POS = { x: 120, y: WORLD.groundY } as const;
export const PLAYER = { w: 56, h: 88 } as const;

/** Single-jump physics: full-hold apex ≈ 125.8px, short-tap apex ≈ 55px (variable jump height). */
export const PHYS = {
  gravity: 0.62,
  jump: -12.8,
  jumpCutVy: -7.6,
  speed: 4,
  maxFall: 14,
  /** ~117ms @60fps */
  coyote: 7,
  /** ~133ms @60fps */
  buffer: 8,
  frameMs: 1000 / 60,
} as const;

export const CHASMS: Chasm[] = [
  { x: 960, w: 130 },
  { x: 2120, w: 540 },
  { x: 3620, w: 420 },
];

export const PLATFORMS: Platform[] = [
  // 4 main ground segments separated by 3 chasms
  { x: 0, y: WORLD.groundY, w: 960, h: 160 },
  { x: 1090, y: WORLD.groundY, w: 1030, h: 160 },
  { x: 2660, y: WORLD.groundY, w: 960, h: 160 },
  { x: 4040, y: WORLD.groundY, w: 760, h: 160 },

  // Single-jump calibrated floating platforms across 3 zones (all <= 100px above ground)
  { x: 990, y: 465, w: 320, h: 24 },
  { x: 1940, y: 475, w: 220, h: 24 },
  { x: 2210, y: 460, w: 270, h: 24 },
  { x: 2730, y: 460, w: 260, h: 24 },
  { x: 3570, y: 465, w: 190, h: 24 },
  { x: 4035, y: 465, w: 240, h: 24 },
];

export const SPRINGBOARDS: Springboard[] = [
  { x: 840, y: WORLD.groundY - 14, w: 48, h: 14 },
  { x: 3470, y: WORLD.groundY - 14, w: 48, h: 14 },
];

export const MOVING_PLATFORMS: MovingPlatform[] = [
  { id: "move-1", baseX: 2545, y: 435, w: 150, h: 20, rangeX: 45, speed: 0.026 },
];

export function getMovingPlatformPos(mp: MovingPlatform, t: number): Platform {
  const currentX = mp.baseX + Math.sin(t * mp.speed) * mp.rangeX;
  return { x: currentX, y: mp.y, w: mp.w, h: mp.h };
}

export const CRUMBLE_PLATFORMS: CrumblePlatform[] = [
  { id: "crumble-1", x: 3825, y: 460, w: 150, h: 20 },
];

export const CHECKPOINTS: Checkpoint[] = [
  { id: "cp-1", x: 1840, y: WORLD.groundY },
  { id: "cp-2", x: 3280, y: WORLD.groundY },
];

export const ENEMIES: Enemy[] = [
  {
    id: "pkg-1",
    variant: "normal",
    x: 560,
    y: WORLD.groundY,
    w: 36,
    h: 36,
    minX: 420,
    maxX: 720,
    speed: 1.2,
  },
  {
    id: "pkg-2",
    variant: "normal",
    x: 1500,
    y: WORLD.groundY,
    w: 36,
    h: 36,
    minX: 1360,
    maxX: 1700,
    speed: 1.3,
  },
  {
    id: "pkg-3",
    variant: "normal",
    x: 2330,
    y: 460,
    w: 36,
    h: 36,
    minX: 2285,
    maxX: 2415,
    speed: 0.85,
  },
  {
    id: "pkg-4",
    variant: "normal",
    x: 2980,
    y: WORLD.groundY,
    w: 36,
    h: 36,
    minX: 2840,
    maxX: 3150,
    speed: 1.35,
  },
  {
    id: "pkg-5",
    variant: "fast",
    x: 4350,
    y: WORLD.groundY,
    w: 36,
    h: 36,
    minX: 4220,
    maxX: 4490,
    speed: 1.95,
  },
];

export const MOMENTS: Moment[] = [
  { id: "foto", label: "Foto", x: 1150, y: 435 },
  { id: "lagu", label: "Lagu", x: 2860, y: 430 },
  { id: "surat", label: "Surat", x: 4155, y: 435 },
];

export const MOMENT_SIZE = 32;
/** kotak ambil lebih longgar dari gambar agar tidak frustrasi */
export const MOMENT_PICK = 52;

export const DOOR = { x: 4600, y: 380, w: 100, h: 180 };

export function createState(): State {
  return {
    x: START_POS.x,
    y: START_POS.y,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: 1,
    coyote: PHYS.coyote,
    buffer: 0,
    jumpHeld: false,
    jumpFromGround: false,
    collected: [],
    t: 0,
    won: false,
    lost: false,
    hp: MAX_HP,
    invuln: 0,
    knockbackTimer: 0,
    checkpointX: START_POS.x,
    checkpointY: START_POS.y,
    checkpointsReached: [],
    crumbleTimers: CRUMBLE_PLATFORMS.map(() => 0),
    bounceSpringIndex: null,
    enemies: ENEMIES.map((e) => ({
      ...e,
      dir: -1,
      alive: true,
      squashTimer: 0,
    })),
  };
}

export function playerBox(s: State): Platform {
  return { x: s.x, y: s.y - PLAYER.h, w: PLAYER.w, h: PLAYER.h };
}

/** Courier can deliver to the recipient anytime regardless of optional gifts collected. */
export function canDeliver(_s: State): boolean {
  void _s;
  return true;
}

export function cameraX(s: State, viewW: number = WORLD.viewW): number {
  const target = s.x + PLAYER.w / 2 - viewW * 0.42;
  return Math.max(0, Math.min(WORLD.w - viewW, target));
}

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;
}

export type StepOptions = {
  manualCollect?: MomentId[];
};

/**
 * Majukan satu frame. Memutasi `s`, mengembalikan daftar kejadian untuk audio/HUD.
 * Urutan: patroli musuh → horizontal → vertikal → checkpoint/jurang → musuh → koleksi → menang.
 */
export function step(s: State, input: Input, options?: StepOptions): string[] {
  if (s.won || s.lost) return [];

  const events: string[] = [];
  s.t++;
  s.bounceSpringIndex = null;
  if (s.invuln > 0) s.invuln--;

  // Gerakkan musuh patroli & hitung mundur animasi gepeng
  for (const e of s.enemies) {
    if (!e.alive) {
      if (e.squashTimer > 0) e.squashTimer--;
      continue;
    }
    e.x += e.dir * e.speed;
    if (e.x <= e.minX) {
      e.x = e.minX;
      e.dir = 1;
    } else if (e.x + e.w >= e.maxX) {
      e.x = e.maxX - e.w;
      e.dir = -1;
    }
  }

  // Bergerak bersama platform bergerak bila berdiri di atasnya
  for (const mp of MOVING_PLATFORMS) {
    const prevP = getMovingPlatformPos(mp, s.t - 1);
    const currP = getMovingPlatformPos(mp, s.t);
    if (
      s.grounded &&
      Math.abs(s.y - prevP.y) <= 2 &&
      s.x + PLAYER.w > prevP.x &&
      s.x < prevP.x + prevP.w
    ) {
      const deltaX = currP.x - prevP.x;
      s.x = Math.max(0, Math.min(WORLD.w - PLAYER.w, s.x + deltaX));
    }
  }

  for (let i = 0; i < s.crumbleTimers.length; i++) {
    if (s.crumbleTimers[i] > 0) {
      s.crumbleTimers[i]++;
      if (s.crumbleTimers[i] >= CRUMBLE_RESPAWN_FRAMES) {
        s.crumbleTimers[i] = 0;
      }
    }
  }

  const pressed = input.jump && !s.jumpHeld;
  s.jumpHeld = input.jump;

  if (s.knockbackTimer > 0) {
    s.knockbackTimer--;
    s.vx *= 0.9;
  } else {
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) s.facing = dir > 0 ? 1 : -1;
    s.vx = dir * PHYS.speed;
  }

  if (pressed) s.buffer = PHYS.buffer;
  if (s.buffer > 0) s.buffer--;
  if (s.coyote > 0) s.coyote--;

  if (s.buffer > 0 && s.coyote > 0) {
    s.vy = PHYS.jump;
    s.grounded = false;
    s.coyote = 0;
    s.buffer = 0;
    s.jumpFromGround = true;
    events.push("jump");
  } else if (!input.jump && s.jumpFromGround && s.vy < PHYS.jumpCutVy) {
    // Variable jump height: releasing early caps upward velocity without cutting spring/stomp bounces
    s.vy = PHYS.jumpCutVy;
    s.jumpFromGround = false;
  }

  s.x = Math.max(0, Math.min(WORLD.w - PLAYER.w, s.x + s.vx));

  const prevFeet = s.y;
  s.vy = Math.min(s.vy + PHYS.gravity, PHYS.maxFall);
  if (s.vy >= 0) s.jumpFromGround = false;
  s.y += s.vy;

  const wasGrounded = s.grounded;
  s.grounded = false;
  const box = playerBox(s);

  // Trampolin / Papan Loncat
  for (let i = 0; i < SPRINGBOARDS.length; i++) {
    const sp = SPRINGBOARDS[i];
    if (box.x + box.w > sp.x && box.x < sp.x + sp.w) {
      if (s.vy >= 0 && prevFeet <= sp.y + 4 && s.y >= sp.y - 8) {
        s.y = sp.y;
        s.vy = -16.5;
        s.grounded = false;
        s.coyote = 0;
        s.jumpFromGround = false;
        s.bounceSpringIndex = i;
        events.push("bounce");
        break;
      }
    }
  }

  if (s.bounceSpringIndex === null) {
    for (const p of PLATFORMS) {
      if (box.x + box.w <= p.x || box.x >= p.x + p.w) continue;
      if (s.vy >= 0 && prevFeet <= p.y && s.y >= p.y) {
        s.y = p.y;
        s.vy = 0;
        s.grounded = true;
      }
    }

    for (const mp of MOVING_PLATFORMS) {
      const p = getMovingPlatformPos(mp, s.t);
      if (box.x + box.w <= p.x || box.x >= p.x + p.w) continue;
      if (s.vy >= 0 && prevFeet <= p.y && s.y >= p.y) {
        s.y = p.y;
        s.vy = 0;
        s.grounded = true;
      }
    }

    for (let i = 0; i < CRUMBLE_PLATFORMS.length; i++) {
      const cp = CRUMBLE_PLATFORMS[i];
      if ((s.crumbleTimers[i] ?? 0) >= CRUMBLE_FALL_FRAMES) continue;
      if (box.x + box.w <= cp.x || box.x >= cp.x + cp.w) continue;
      if (s.vy >= 0 && prevFeet <= cp.y && s.y >= cp.y) {
        s.y = cp.y;
        s.vy = 0;
        s.grounded = true;
        if (s.crumbleTimers[i] === 0) s.crumbleTimers[i] = 1;
      }
    }
  }

  if (s.grounded) {
    s.coyote = PHYS.coyote;
    s.jumpFromGround = false;
    if (!wasGrounded) {
      events.push("land");
    }
  }

  // Cek aktivasi checkpoint saat melewati tiang pos di area aman
  const playerCenterX = s.x + PLAYER.w / 2;
  if (s.y <= WORLD.groundY + 12) {
    for (const cp of CHECKPOINTS) {
      if (s.checkpointsReached.includes(cp.id)) continue;
      if (playerCenterX >= cp.x) {
        s.checkpointsReached.push(cp.id);
        s.checkpointX = cp.x - PLAYER.w / 2;
        s.checkpointY = cp.y;
        events.push(`checkpoint:${cp.id}`);
      }
    }
  }

  // Cek jatuh ke jurang
  if (s.y > WORLD.h + 36) {
    s.hp = Math.max(0, s.hp - 1);
    s.invuln = INVULN_FRAMES;
    s.vx = 0;
    s.vy = 0;
    s.knockbackTimer = 0;
    s.crumbleTimers.fill(0);
    if (s.hp <= 0) {
      s.lost = true;
      events.push("gameover");
    } else {
      s.x = s.checkpointX;
      s.y = s.checkpointY;
      s.grounded = true;
      s.coyote = PHYS.coyote;
      s.jumpFromGround = false;
      events.push("fall");
    }
    return events;
  }

  // Resolusi tabrakan dengan Paket Bandel (stomp dari atas vs kena samping)
  const live = playerBox(s);
  for (const e of s.enemies) {
    if (!e.alive) continue;
    const eBox = { x: e.x, y: e.y - e.h, w: e.w, h: e.h };
    if (!overlaps(live, eBox)) continue;

    const isStomp = s.vy > 0 && prevFeet <= eBox.y + e.h * 0.58;
    if (isStomp) {
      e.alive = false;
      e.squashTimer = 20;
      s.y = eBox.y;
      s.vy = -10.5;
      s.grounded = false;
      s.jumpFromGround = false;
      events.push(`stomp:${e.id}`);
      break;
    } else if (s.invuln === 0) {
      s.hp = Math.max(0, s.hp - 1);
      s.invuln = INVULN_FRAMES;
      const pushDir = playerCenterX < e.x + e.w / 2 ? -1 : 1;
      s.vx = pushDir * 5.5;
      s.knockbackTimer = KNOCKBACK_FRAMES;
      if (s.grounded) {
        s.vy = -5.5;
        s.grounded = false;
      }
      if (s.hp <= 0) {
        s.lost = true;
        events.push("gameover");
      } else {
        events.push(`hurt:${e.id}`);
      }
      break;
    }
  }

  if (s.lost) return events;

  // Koleksi item kenangan
  const postBox = playerBox(s);
  for (const m of MOMENTS) {
    if (s.collected.includes(m.id)) continue;
    if (options?.manualCollect?.includes(m.id)) continue;
    const hit = {
      x: m.x - MOMENT_PICK / 2,
      y: m.y - MOMENT_PICK / 2,
      w: MOMENT_PICK,
      h: MOMENT_PICK,
    };
    if (overlaps(postBox, hit)) {
      s.collected.push(m.id);
      events.push(`collect:${m.id}`);
    }
  }

  if (!s.won && canDeliver(s) && overlaps(postBox, DOOR)) {
    s.won = true;
    events.push("win");
  }

  return events;
}
