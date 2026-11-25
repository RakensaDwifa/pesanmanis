import {
  CHASMS,
  CHECKPOINTS,
  CRUMBLE_FALL_FRAMES,
  CRUMBLE_PLATFORMS,
  DOOR,
  MOVING_PLATFORMS,
  PLAYER,
  WORLD,
  canDeliver,
  getMovingPlatformPos,
  type Moment,
  type Platform,
  type Springboard,
  type State,
  SPRINGBOARDS,
} from "./physics";
import {
  CHECK_MATRIX,
  ENEMY_COLORS_FAST,
  ENEMY_COLORS_NORMAL,
  ENEMY_SQUASHED,
  ENEMY_WALK_A,
  ENEMY_WALK_B,
  GIFT_COLORS,
  GIFT_MATRIX,
  HEART_COLORS,
  HEART_MATRIX,
  MOMENT_COLORS,
  MOMENT_MATRICES,
  PALETTE,
  PX,
  drawPixelMatrix,
  tileHash,
} from "./palette";

/** Snap a world coordinate to the shared pixel grid */
function snap(v: number): number {
  return Math.round(v / PX) * PX;
}

const CLOUD_SHAPES: Array<{ x: number; y: number; w: number; h: number }> = [
  { x: 90, y: 78, w: 120, h: 30 },
  { x: 370, y: 126, w: 96, h: 24 },
  { x: 640, y: 66, w: 144, h: 33 },
  { x: 950, y: 114, w: 108, h: 27 },
  { x: 1210, y: 84, w: 126, h: 30 },
];

function drawPixelCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const cx = snap(x);
  const cy = snap(y);
  const cw = snap(w);
  const ch = snap(h);

  // Warm shaded base
  ctx.fillStyle = PALETTE.cloudShade;
  ctx.fillRect(cx + PX * 2, cy + ch - PX * 3, cw - PX * 4, PX * 3);

  // Fluffy stepped pixel puffs
  ctx.fillStyle = PALETTE.cloudLight;
  ctx.fillRect(cx + PX * 2, cy + PX * 3, cw - PX * 4, ch - PX * 5);
  ctx.fillRect(cx, cy + PX * 4, cw, ch - PX * 7);
  ctx.fillRect(cx + Math.round(cw * 0.18), cy + PX, Math.round(cw * 0.42), ch - PX * 3);
  ctx.fillRect(cx + Math.round(cw * 0.48), cy, Math.round(cw * 0.3), ch - PX * 2);
}

/**
 * 3-layer seamless parallax backdrop:
 * 1) Warm morning sky, sun & drifting pixel clouds (0.08x)
 * 2) Muted rolling hills & distant cozy rooftops (0.22x)
 * 3) Soft midground fences, shrubs & streetlamps seated on groundY (0.48x)
 */
export function drawParallaxBackground(
  ctx: CanvasRenderingContext2D,
  cam: number,
  vw: number,
  t: number
) {
  // Layer 1: Warm morning sky gradient + sun
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.groundY);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyHorizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, WORLD.groundY);

  // Warm pixel-stepped sun disc in upper right
  const sunX = snap(vw * 0.78 - cam * 0.02);
  const sunY = snap(96);
  ctx.fillStyle = PALETTE.sunHalo;
  ctx.fillRect(sunX - 36, sunY - 24, 72, 48);
  ctx.fillRect(sunX - 24, sunY - 36, 48, 72);
  ctx.fillStyle = PALETTE.sunCore;
  ctx.fillRect(sunX - 24, sunY - 18, 48, 36);
  ctx.fillRect(sunX - 18, sunY - 24, 36, 48);

  // Seamless drifting clouds (zero mirror-flip)
  const cloudPeriod = 1440;
  const cloudScroll = (cam * 0.08 + t * 0.16) % cloudPeriod;
  for (let rep = -1; rep <= Math.ceil(vw / cloudPeriod) + 1; rep++) {
    const base = rep * cloudPeriod - cloudScroll;
    for (const cl of CLOUD_SHAPES) {
      const dx = base + cl.x;
      if (dx + cl.w < -40 || dx > vw + 40) continue;
      drawPixelCloud(ctx, dx, cl.y, cl.w, cl.h);
    }
  }

  // Layer 2a: Far muted hill ridge (0.14x)
  const farStep = PX * 4; // 12px horizontal pixel steps for clean ridge
  const farScroll = cam * 0.14;
  ctx.fillStyle = PALETTE.farHill;
  for (let sx = -farStep; sx < vw + farStep; sx += farStep) {
    const wx = sx + farScroll;
    const h =
      150 +
      Math.sin(wx * 0.0022) * 42 +
      Math.cos(wx * 0.0049) * 22;
    const top = snap(WORLD.groundY - h);
    ctx.fillRect(sx, top, farStep + 1, WORLD.groundY - top);
  }

  // Layer 2b: Mid-far cozy hills & muted town rooftops (0.24x)
  const midHillStep = PX * 4;
  const midHillScroll = cam * 0.24;
  ctx.fillStyle = PALETTE.farHillDetail;
  for (let sx = -midHillStep; sx < vw + midHillStep; sx += midHillStep) {
    const wx = sx + midHillScroll;
    const h =
      94 +
      Math.sin(wx * 0.0031 + 1.2) * 26 +
      Math.cos(wx * 0.0072) * 12;
    const top = snap(WORLD.groundY - h);
    ctx.fillRect(sx, top, midHillStep + 1, WORLD.groundY - top);
  }

  const townPeriod = 1200;
  const townScroll = cam * 0.24;
  const firstTown = Math.floor(townScroll / townPeriod) * townPeriod;
  for (let px = firstTown; px < townScroll + vw + townPeriod; px += townPeriod) {
    const ox = Math.round(px - townScroll);
    drawDistantVillageCluster(ctx, ox);
  }

  // Layer 3: Soft midground foreground-horizon accents seated strictly on groundY (0.48x)
  const midPeriod = 960;
  const midScroll = cam * 0.48;
  const firstMid = Math.floor(midScroll / midPeriod) * midPeriod;
  for (let px = firstMid; px < midScroll + vw + midPeriod; px += midPeriod) {
    const ox = Math.round(px - midScroll);
    drawMidgroundAccents(ctx, ox, t);
  }
}

function drawDistantVillageCluster(ctx: CanvasRenderingContext2D, ox: number) {
  const baseY = WORLD.groundY - 78;
  const houses = [
    { x: 140, w: 66, h: 42, roof: 24, tower: false },
    { x: 240, w: 48, h: 68, roof: 28, tower: true },
    { x: 560, w: 78, h: 46, roof: 26, tower: false },
    { x: 890, w: 60, h: 40, roof: 22, tower: false },
    { x: 970, w: 54, h: 34, roof: 20, tower: false },
  ];

  for (const hs of houses) {
    const hx = snap(ox + hs.x);
    const hy = snap(baseY - hs.h);

    // Body
    ctx.fillStyle = PALETTE.midHill;
    ctx.fillRect(hx, hy, hs.w, hs.h + 84);

    // Pitched pixel roof
    ctx.fillStyle = PALETTE.townSilhouette;
    const steps = Math.floor(hs.roof / PX);
    for (let s = 0; s < steps; s++) {
      const inset = Math.round(((steps - 1 - s) * (hs.w * 0.42)) / steps);
      ctx.fillRect(hx + inset, hy - hs.roof + s * PX, hs.w - inset * 2, PX);
    }

    // Subtle warm lit window speck (low contrast)
    if (hs.tower) {
      ctx.fillStyle = PALETTE.peachLight;
      ctx.fillRect(hx + Math.round(hs.w / 2) - 6, hy + 12, 12, 12);
    }
  }
}

function drawMidgroundAccents(ctx: CanvasRenderingContext2D, ox: number, t: number) {
  const gy = WORLD.groundY;

  // Muted sage shrubs anchored on groundY
  const bushes = [
    { x: 70, w: 66, h: 24 },
    { x: 380, w: 84, h: 30 },
    { x: 740, w: 72, h: 27 },
  ];
  for (const b of bushes) {
    const bx = snap(ox + b.x);
    const by = gy - b.h;
    ctx.fillStyle = PALETTE.bushMutedShade;
    ctx.fillRect(bx, by + PX * 2, b.w, b.h - PX * 2);
    ctx.fillStyle = PALETTE.bushMuted;
    ctx.fillRect(bx + PX * 2, by, b.w - PX * 4, b.h - PX * 2);
    ctx.fillRect(bx + Math.round(b.w * 0.25), by - PX * 2, Math.round(b.w * 0.5), PX * 3);
  }

  // Low cozy wooden picket fence segments
  const fences = [
    { x: 165, count: 6 },
    { x: 560, count: 5 },
  ];
  for (const f of fences) {
    const fx = snap(ox + f.x);
    const span = f.count * 21;
    ctx.fillStyle = PALETTE.fenceShade;
    ctx.fillRect(fx, gy - 24, span, PX * 2);
    ctx.fillRect(fx, gy - 12, span, PX * 2);
    for (let i = 0; i < f.count; i++) {
      const px = fx + i * 21;
      ctx.fillStyle = PALETTE.fenceWood;
      ctx.fillRect(px, gy - 33, 9, 33);
      ctx.fillRect(px + PX, gy - 36, 3, PX);
    }
  }

  // Warm garden streetlamps
  const lamps = [310, 820];
  const flicker = Math.sin(t / 18) * 0.12 + 0.88;
  for (const lxOff of lamps) {
    const lx = snap(ox + lxOff);
    ctx.fillStyle = PALETTE.fenceShade;
    ctx.fillRect(lx, gy - 96, 6, 96);
    ctx.fillRect(lx - 6, gy - 9, 18, 9);
    ctx.fillRect(lx - 6, gy - 99, 18, 6);
    ctx.fillStyle = PALETTE.amberGlow;
    ctx.globalAlpha = 0.35 * flicker;
    ctx.fillRect(lx - 9, gy - 93, 24, 21);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.sunCore;
    ctx.fillRect(lx - 3, gy - 90, 12, 12);
  }
}

/**
 * Draw warm sandstone masonry terrain & platforms with sunlit top grass rim,
 * deterministic brick variation, and sculpted floating-platform under-bevels.
 */
export function drawTerrain(
  ctx: CanvasRenderingContext2D,
  p: Platform,
  cam: number,
  vw: number
) {
  const isFloating = p.y < WORLD.groundY;
  const visualH = isFloating ? Math.max(p.h, 33) : Math.min(p.h, WORLD.h - p.y);
  const x0 = Math.max(p.x, Math.round(cam) - 48);
  const x1 = Math.min(p.x + p.w, Math.round(cam) + vw + 48);
  if (x1 <= x0) return;

  const w = x1 - x0;

  // Base warm stone body (for floating platforms, sculpt bottom corners cleanly)
  if (isFloating) {
    ctx.fillStyle = PALETTE.stoneBase;
    ctx.fillRect(x0, p.y, w, visualH - PX * 2);
    const insetL = x0 === p.x ? PX * 2 : 0;
    const insetR = x1 === p.x + p.w ? PX * 2 : 0;
    ctx.fillRect(x0 + insetL, p.y + visualH - PX * 2, Math.max(0, w - insetL - insetR), PX * 2);
  } else {
    ctx.fillStyle = PALETTE.stoneBase;
    ctx.fillRect(x0, p.y, w, visualH);
  }

  // Deterministic warm masonry bricks with slight shade variety & top-left highlight
  const brickW = 36;
  const brickH = 15;
  const startRow = 0;
  for (let by = p.y + 15, row = startRow; by < p.y + visualH - (isFloating ? PX : 0); by += brickH, row++) {
    const rowH = Math.min(brickH, p.y + visualH - by - (isFloating ? PX : 0));
    if (rowH <= 3) break;
    const off = (row % 2) * (brickW / 2);
    const firstCol = Math.floor((x0 - off) / brickW);
    const lastCol = Math.floor((x1 - off) / brickW);

    for (let col = firstCol; col <= lastCol; col++) {
      const bx0 = Math.max(x0, col * brickW + off);
      const bx1 = Math.min(x1, (col + 1) * brickW + off);
      const bw = bx1 - bx0;
      if (bw <= 2) continue;

      const hVal = tileHash(col, row + Math.round(p.y));
      if (hVal < 30) ctx.fillStyle = PALETTE.stoneMid;
      else if (hVal > 74) ctx.fillStyle = PALETTE.stoneLight;
      else ctx.fillStyle = PALETTE.stoneBase;

      ctx.fillRect(bx0, by, bw, rowH);

      // Mortar lines
      ctx.fillStyle = PALETTE.stoneDark;
      ctx.fillRect(bx0, by + rowH - 2, bw, 2);
      if (bx0 === col * brickW + off) {
        ctx.fillRect(bx0, by, 2, rowH);
      }

      // Subtle brick top highlight on select bricks
      if (hVal > 52 && bw > 10 && rowH > 8) {
        ctx.fillStyle = "rgba(255, 249, 245, 0.14)";
        ctx.fillRect(bx0 + 3, by + 2, bw - 6, 2);
      }
    }
  }

  // Deep warm earth gradient at bottom of ground to meet #cara-kerja cleanly
  if (!isFloating && visualH > 64) {
    const soil = ctx.createLinearGradient(0, p.y + visualH - 76, 0, p.y + visualH);
    soil.addColorStop(0, "rgba(57, 43, 37, 0)");
    soil.addColorStop(1, "rgba(36, 25, 20, 0.72)");
    ctx.fillStyle = soil;
    ctx.fillRect(x0, p.y + visualH - 76, w, 76);

    // Crisp 3px terracotta-dark earth accent band right along bottom border
    ctx.fillStyle = PALETTE.earthDeep;
    ctx.fillRect(x0, p.y + visualH - 3, w, 3);

    // Chasm cliff borders & hanging ivy on ground segments that open into a chasm
    if (x0 === p.x && p.x > 0) {
      ctx.fillStyle = PALETTE.stoneDark;
      ctx.fillRect(x0, p.y + 15, PX * 2, visualH - 15);
      for (let cy = p.y + 24; cy < p.y + visualH - 30; cy += 36) {
        ctx.fillStyle = PALETTE.grassShade;
        ctx.fillRect(x0 - PX, cy, PX, 12);
        ctx.fillStyle = PALETTE.grassVine;
        ctx.fillRect(x0 - PX * 2, cy + 3, PX, 6);
      }
    }
    if (x1 === p.x + p.w && p.x + p.w < WORLD.w) {
      ctx.fillStyle = PALETTE.stoneDark;
      ctx.fillRect(x1 - PX * 2, p.y + 15, PX * 2, visualH - 15);
      for (let cy = p.y + 28; cy < p.y + visualH - 30; cy += 39) {
        ctx.fillStyle = PALETTE.grassShade;
        ctx.fillRect(x1, cy, PX, 12);
        ctx.fillStyle = PALETTE.grassVine;
        ctx.fillRect(x1 + PX, cy + 3, PX, 6);
      }
    }
  }

  // Sunlit grass overhang (top rim highlight at p.y, shadow under grass lip!)
  ctx.fillStyle = "rgba(36, 25, 20, 0.28)";
  ctx.fillRect(x0, p.y + 15, w, 3);
  ctx.fillStyle = PALETTE.grassShade;
  ctx.fillRect(x0, p.y + 11, w, 4);
  ctx.fillStyle = PALETTE.grassMid;
  ctx.fillRect(x0, p.y + 3, w, 8);
  ctx.fillStyle = PALETTE.grassRim;
  ctx.fillRect(x0, p.y, w, 3);

  // Deterministic grass tufts & tiny warm wildflowers along top edge
  const tuftStep = 24;
  const firstTuft = Math.ceil(x0 / tuftStep) * tuftStep;
  for (let tx = firstTuft; tx < x1 - 6; tx += tuftStep) {
    const hVal = tileHash(tx, Math.round(p.y));
    if (hVal < 60) {
      ctx.fillStyle = PALETTE.grassRim;
      ctx.fillRect(tx, p.y - PX, PX, PX);
      ctx.fillStyle = PALETTE.grassMid;
      ctx.fillRect(tx + PX, p.y - PX * 2, PX, PX * 2);
    }
    if (hVal > 84) {
      // Tiny warm blossom
      ctx.fillStyle = PALETTE.grassShade;
      ctx.fillRect(tx + 6, p.y - PX, PX, PX);
      ctx.fillStyle = hVal > 92 ? PALETTE.gold : PALETTE.cream;
      ctx.fillRect(tx + 6, p.y - PX * 2, PX, PX);
    }
  }

  // Hanging moss & ivy clusters attached cleanly beneath floating platforms
  if (isFloating) {
    const bottomY = p.y + visualH - PX * 2;
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(x0 + (x0 === p.x ? PX * 2 : 0), bottomY, w - (x0 === p.x ? PX * 2 : 0) - (x1 === p.x + p.w ? PX * 2 : 0), PX);

    for (let vx = Math.ceil((x0 + 24) / 54) * 54; vx < x1 - 24; vx += 54) {
      const hv = tileHash(vx, 77);
      const len = hv > 50 ? PX * 5 : PX * 3;
      ctx.fillStyle = PALETTE.grassShade;
      ctx.fillRect(vx, bottomY + PX, PX, len);
      ctx.fillStyle = PALETTE.grassVine;
      ctx.fillRect(vx - PX, bottomY + PX * 2, PX * 2, PX);
      if (hv > 50) {
        ctx.fillRect(vx + PX, bottomY + PX * 4, PX * 2, PX);
      }
    }
  }
}

export function drawMovingPlatforms(ctx: CanvasRenderingContext2D, t: number) {
  for (const mp of MOVING_PLATFORMS) {
    // Dotted brass rail showing movement span
    const railY = mp.y + 9;
    const minX = mp.baseX - mp.rangeX + 12;
    const maxX = mp.baseX + mp.rangeX + mp.w - 12;
    ctx.fillStyle = "rgba(82, 62, 54, 0.35)";
    for (let rx = minX; rx < maxX; rx += 12) {
      ctx.fillRect(rx, railY, 6, 3);
    }
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(minX - 3, railY - 3, 6, 9);
    ctx.fillRect(maxX - 3, railY - 3, 6, 9);

    const p = getMovingPlatformPos(mp, t);
    const x = Math.round(p.x);
    const y = Math.round(p.y);

    // Timber sky-sled platform with warm gold lantern studs
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x, y, p.w, p.h);
    ctx.fillStyle = PALETTE.woodBase;
    ctx.fillRect(x + PX, y + PX, p.w - PX * 2, p.h - PX * 2);
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(x + PX, y + PX, p.w - PX * 2, PX);
    ctx.fillStyle = PALETTE.grassRim;
    ctx.fillRect(x + PX * 2, y, p.w - PX * 4, PX);

    // Brass corner lamps
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(x + 6, y + 6, 6, 6);
    ctx.fillRect(x + p.w - 12, y + 6, 6, 6);
  }
}

export function drawCrumblePlatforms(ctx: CanvasRenderingContext2D, crumbleTimers: number[]) {
  for (let idx = 0; idx < CRUMBLE_PLATFORMS.length; idx++) {
    const cp = CRUMBLE_PLATFORMS[idx];
    const crumbleTimer = crumbleTimers[idx] ?? 0;
    if (crumbleTimer >= CRUMBLE_FALL_FRAMES) continue;
    let shakeX = 0;
    let shakeY = 0;
    if (crumbleTimer > 0) {
      const urgent = crumbleTimer > CRUMBLE_FALL_FRAMES - 20;
      const ampX = urgent ? 6 : 3.5;
      const ampY = urgent ? 4 : 2.5;
      shakeX = Math.round((Math.random() - 0.5) * ampX);
      shakeY = Math.round((Math.random() - 0.5) * ampY);
    }
    const px = Math.round(cp.x + shakeX);
    const py = Math.round(cp.y + shakeY);

    // Three segmented rustic wooden planks
    const plankCount = 3;
    const gap = PX;
    const plankW = Math.floor((cp.w - gap * (plankCount - 1)) / plankCount);

    for (let i = 0; i < plankCount; i++) {
      const bx = px + i * (plankW + gap);
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(bx, py, plankW, cp.h);
      ctx.fillStyle = PALETTE.woodBase;
      ctx.fillRect(bx + PX, py + PX, plankW - PX * 2, cp.h - PX * 2);
      ctx.fillStyle = PALETTE.woodLight;
      ctx.fillRect(bx + PX, py + PX, plankW - PX * 2, PX);
      // Nail pixels
      ctx.fillStyle = PALETTE.peachLight;
      ctx.fillRect(bx + PX * 2, py + PX * 2, PX, PX);
      ctx.fillRect(bx + plankW - PX * 3, py + PX * 2, PX, PX);
    }

    if (crumbleTimer > 0) {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(px + Math.round(cp.w * 0.35), py, PX, cp.h);
      ctx.fillRect(px + Math.round(cp.w * 0.68), py + PX, PX, cp.h - PX);
    }
  }
}

export function drawSpringboards(
  ctx: CanvasRenderingContext2D,
  state: State,
  springTimers: number[]
) {
  for (let i = 0; i < SPRINGBOARDS.length; i++) {
    const sp: Springboard = SPRINGBOARDS[i];
    const anim = springTimers[i] ?? 0;
    const squashed = anim > 4;
    const stretched = anim > 0 && anim <= 4;

    const baseBottom = sp.y + sp.h; // 560 (WORLD.groundY)
    const cx = Math.round(sp.x + sp.w / 2);

    // Stem height & cap height on exact PX=3 pixel grid
    const stemH = squashed ? PX * 2 : stretched ? PX * 4 : PX * 3;
    const capH = squashed ? PX * 3 : PX * 4;
    const capW = squashed ? sp.w + 6 : stretched ? sp.w - 6 : sp.w;
    const stemW = PX * 6;
    const capY = baseBottom - stemH - capH;

    // Cream mushroom stem with dark outline
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(cx - stemW / 2 - PX, baseBottom - stemH, stemW + PX * 2, stemH);
    ctx.fillStyle = PALETTE.wallCream;
    ctx.fillRect(cx - stemW / 2, baseBottom - stemH, stemW, stemH);
    ctx.fillStyle = PALETTE.wallShade;
    ctx.fillRect(cx - stemW / 2, baseBottom - stemH, stemW, PX);

    // Stepped pixel terracotta mushroom cap
    const capX = snap(cx - capW / 2);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(capX, capY + PX, capW, capH - PX);
    ctx.fillRect(capX + PX * 2, capY, capW - PX * 4, capH);

    ctx.fillStyle = squashed ? PALETTE.terracottaLt : PALETTE.terracotta;
    ctx.fillRect(capX + PX, capY + PX, capW - PX * 2, capH - PX * 2);
    ctx.fillRect(capX + PX * 3, capY + PX, capW - PX * 6, PX);

    // Cream polka spots
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(cx - PX * 4, capY + PX * 2, PX * 2, PX);
    ctx.fillRect(cx + PX * 2, capY + PX * 2, PX * 2, PX);
    ctx.fillRect(cx - PX, capY + PX, PX * 2, PX);

    // Subtle pixel hint when courier approaches
    const dist = Math.abs(state.x + PLAYER.w / 2 - cx);
    if (dist < 105 && Math.abs(state.y - sp.y) < 130) {
      const hintY = capY - 16 + Math.sin(state.t / 7) * 2;
      ctx.save();
      ctx.font = '700 11px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = "Lompat!";
      const tw = ctx.measureText(label).width + 14;
      ctx.fillStyle = "rgba(255, 249, 245, 0.92)";
      ctx.strokeStyle = PALETTE.terracotta;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(cx - tw / 2, hintY - 10, tw, 20, 10);
      } else {
        ctx.rect(cx - tw / 2, hintY - 10, tw, 20);
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.terracotta;
      ctx.fillText(label, cx, hintY);
      ctx.restore();
    }
  }
}

export function drawMoment(ctx: CanvasRenderingContext2D, m: Moment, index: number, state: State) {
  const bob = Math.sin((state.t + index * 37) / 22) * 4;
  const isCollected = state.collected.includes(m.id);
  const cy = Math.round(m.y + bob);

  // Outer warm aura for uncollected items
  if (!isCollected) {
    const pulse = (Math.sin(state.t / 14 + index) + 1) * 0.5;
    ctx.fillStyle = `rgba(222, 112, 56, ${0.14 + pulse * 0.14})`;
    ctx.beginPath();
    ctx.arc(m.x, cy, 28 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft warm medallion disc behind sprite
  ctx.fillStyle = isCollected ? "rgba(255, 249, 245, 0.78)" : "rgba(255, 249, 245, 0.94)";
  ctx.strokeStyle = isCollected ? PALETTE.checkGreen : PALETTE.peachMid;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(m.x, cy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Multi-color 14xN pixel art icon
  const matrix = MOMENT_MATRICES[m.id];
  const matW = (matrix[0]?.length ?? 14) * PX;
  const matH = matrix.length * PX;
  drawPixelMatrix(ctx, matrix, m.x - matW / 2, cy - matH / 2, PX, MOMENT_COLORS);

  // Orbiting pixel sparkles on uncollected items
  if (!isCollected) {
    const angle = state.t * 0.05 + index * 2;
    const sx = Math.round(m.x + Math.cos(angle) * 28);
    const sy = Math.round(cy + Math.sin(angle) * 20);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(sx, sy, PX, PX);
  } else {
    // Crisp green check badge at top-right when already collected
    const bx = m.x + 17;
    const by = cy - 17;
    ctx.fillStyle = PALETTE.checkGreen;
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.cream;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawPixelMatrix(ctx, CHECK_MATRIX, bx - 4, by - 3, 1.2, { w: PALETTE.cream });
  }

  // Minimal keycap indicator [E] directly above item (single prompt system: full CTA is HTML button)
  const isNear = Math.abs(state.x + PLAYER.w / 2 - m.x) < 95 && Math.abs(state.y - m.y) < 130;
  if (isNear) {
    const capY = cy - 38 + Math.sin(state.t / 8) * 2;
    ctx.save();
    ctx.fillStyle = PALETTE.cream;
    ctx.strokeStyle = PALETTE.terracotta;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(m.x - 12, capY - 11, 24, 22, 6);
    } else {
      ctx.rect(m.x - 12, capY - 11, 24, 22);
    }
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.terracotta;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("E", m.x, capY + 0.5);
    ctx.restore();
  }
}

export type DeliveryAnim = {
  frame: number;
  startX: number;
  startY: number;
};

function drawSpeechPill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  text: string,
  accent: string
) {
  ctx.save();
  ctx.font = '700 13px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const bW = ctx.measureText(text).width + 22;
  const bH = 26;

  ctx.fillStyle = PALETTE.cream;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(cx - bW / 2, cy - bH / 2, bW, bH, 13);
  } else {
    ctx.rect(cx - bW / 2, cy - bH / 2, bW, bH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + bH / 2);
  ctx.lineTo(cx + 5, cy + bH / 2);
  ctx.lineTo(cx, cy + bH / 2 + 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillText(text, cx, cy);
  ctx.restore();
}

/**
 * Render the cozy destination terrace & animated recipient character at the finish line.
 */
export function drawFinishRecipient(
  ctx: CanvasRenderingContext2D,
  state: State,
  recipientImg: HTMLImageElement | null,
  delivery: DeliveryAnim | null
) {
  const ready = canDeliver(state);
  const ground = WORLD.groundY; // 560
  const recipientX = DOOR.x + DOOR.w - 28; // 4672
  const cx = recipientX;

  // 1. Cozy low terrace garden backdrop (wooden fence, planter pot, garden lantern, mailbox)
  const fenceStart = DOOR.x - 42;
  ctx.fillStyle = PALETTE.fenceShade;
  ctx.fillRect(fenceStart, ground - 27, 198, PX * 2);
  ctx.fillRect(fenceStart, ground - 13, 198, PX * 2);
  for (let fx = fenceStart; fx <= fenceStart + 186; fx += 21) {
    ctx.fillStyle = PALETTE.fenceWood;
    ctx.fillRect(fx, ground - 36, 9, 36);
    ctx.fillRect(fx + PX, ground - 39, 3, PX);
  }

  // Soft low-contrast porch eave silhouette behind right side
  const porchX = DOOR.x + 24;
  ctx.fillStyle = "rgba(227, 203, 183, 0.55)";
  ctx.fillRect(porchX, ground - 114, 114, 114);
  ctx.fillStyle = "rgba(207, 155, 132, 0.72)";
  ctx.fillRect(porchX - 9, ground - 126, 132, 15);
  ctx.fillRect(porchX, ground - 135, 114, 9);

  // Warm flower pot on left of terrace
  const potX = DOOR.x - 24;
  ctx.fillStyle = PALETTE.terracottaDk;
  ctx.fillRect(potX, ground - 18, 21, 18);
  ctx.fillStyle = PALETTE.terracotta;
  ctx.fillRect(potX - 3, ground - 21, 27, 6);
  ctx.fillStyle = PALETTE.grassMid;
  ctx.fillRect(potX + 3, ground - 30, 15, 9);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(potX + 6, ground - 33, 3, 3);
  ctx.fillStyle = PALETTE.coral;
  ctx.fillRect(potX + 12, ground - 36, 3, 3);

  // Warm garden lantern post & mini mailbox on the right
  const lampX = recipientX + 42;
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(lampX, ground - 93, 6, 93);
  ctx.fillRect(lampX - 15, ground - 90, 21, 5);
  if (ready || delivery) {
    const glow = Math.sin(state.t / 12) * 0.14 + 0.86;
    ctx.fillStyle = PALETTE.amberGlow;
    ctx.globalAlpha = 0.34 * glow;
    ctx.beginPath();
    ctx.arc(lampX - 9, ground - 78, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(lampX - 15, ground - 85, 12, 15);
  ctx.fillStyle = ready || delivery ? PALETTE.amberGlow : "#cbb7a9";
  ctx.fillRect(lampX - 13, ground - 82, 8, 9);

  const mbX = recipientX + 64;
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(mbX + 6, ground - 36, 6, 36);
  ctx.fillStyle = PALETTE.terracotta;
  ctx.fillRect(mbX, ground - 48, 18, 12);
  ctx.fillStyle = PALETTE.cream;
  ctx.fillRect(mbX + 3, ground - 45, 9, 3);

  // 2. Warm celebration aura around recipient when 3/3 items are ready
  if (ready && !delivery) {
    const pulse = Math.sin(state.t / 14);
    ctx.fillStyle = "rgba(222, 112, 56, 0.12)";
    ctx.beginPath();
    ctx.arc(cx, ground - 48, 72 + pulse * 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 209, 102, 0.22)";
    ctx.beginPath();
    ctx.arc(cx, ground - 48, 48 + pulse * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Recipient character sprite (96x96 cell matching courier)
  const FRAME_SIZE = 96;
  let animRow = 0;
  let animCol = 0;
  if (delivery) {
    animRow = 1;
    if (delivery.frame < 46) {
      animCol = 0; // Hands outstretched ready to catch
    } else if (delivery.frame < 58) {
      animCol = 1; // Happy mid-hop hugging gift
    } else {
      animCol = 2; // Landed hugging gift
    }
  } else if (ready) {
    const waveSeq = [0, 1, 2, 1];
    animRow = 0;
    animCol = waveSeq[Math.floor(state.t / 11) % waveSeq.length];
  } else {
    animRow = 0;
    animCol = Math.floor(state.t / 24) % 2 === 0 ? 0 : 3;
  }

  // Contact shadow under recipient (shrinks slightly during celebratory hop)
  ctx.fillStyle = "rgba(36, 25, 20, 0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, ground - 1, animRow === 1 && animCol === 1 ? 14 : 20, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (recipientImg && recipientImg.complete && recipientImg.naturalWidth > 0) {
    ctx.drawImage(
      recipientImg,
      animCol * FRAME_SIZE,
      animRow * FRAME_SIZE,
      FRAME_SIZE,
      FRAME_SIZE,
      Math.round(cx - FRAME_SIZE / 2),
      ground - FRAME_SIZE,
      FRAME_SIZE,
      FRAME_SIZE
    );
  } else {
    ctx.fillStyle = PALETTE.coral;
    ctx.fillRect(cx - 24, ground - 84, 48, 84);
  }

  // 4. Parabolic spinning gift box while tossed during delivery cutscene (frames 18..46)
  if (delivery && delivery.frame >= 18 && delivery.frame < 46) {
    const u = (delivery.frame - 18) / (46 - 18);
    const targetX = cx - 22;
    const targetY = ground - 46;
    const gx = delivery.startX + (targetX - delivery.startX) * u;
    const gy = delivery.startY + (targetY - delivery.startY) * u - Math.sin(u * Math.PI) * 92;

    const gw = 10 * PX;
    const gh = GIFT_MATRIX.length * PX;
    ctx.save();
    ctx.translate(Math.round(gx), Math.round(gy));
    ctx.rotate(u * Math.PI * 2.1);
    drawPixelMatrix(ctx, GIFT_MATRIX, -gw / 2, -gh / 2, PX, GIFT_COLORS);
    ctx.restore();
  }

  // 5. Floating pixel heart above recipient right after catching the gift (frames >= 46)
  if (delivery && delivery.frame >= 46) {
    const hp = Math.min(1, (delivery.frame - 46) / 20);
    const hw = 9 * PX;
    const hy = ground - 102 - Math.round(hp * 22);
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - hp * 0.25));
    drawPixelMatrix(ctx, HEART_MATRIX, Math.round(cx - hw / 2), hy, PX, HEART_COLORS);
    ctx.restore();
  }

  // 6. Contextual speech pill welcoming courier anytime
  if (!delivery && ready) {
    const bob = Math.sin(state.t / 10) * 3;
    drawSpeechPill(ctx, cx, ground - 108 + bob, "Antar ke Aku!", PALETTE.terracotta);
  }
}

/**
 * Draw warm canyon backdrops & drifting sunset mist inside chasm gaps.
 */
export function drawChasms(ctx: CanvasRenderingContext2D, cam: number, vw: number, t: number) {
  for (const c of CHASMS) {
    if (c.x + c.w < cam - 40 || c.x > cam + vw + 40) continue;

    const canyonH = WORLD.h - WORLD.groundY;
    const grad = ctx.createLinearGradient(0, WORLD.groundY, 0, WORLD.h);
    grad.addColorStop(0, PALETTE.skyHorizon);
    grad.addColorStop(0.55, "#ebd0bd");
    grad.addColorStop(1, "#cfa68e");
    ctx.fillStyle = grad;
    ctx.fillRect(c.x, WORLD.groundY, c.w, canyonH);

    // Subtle recessed cliff wall shadow along both inner chasm sides
    ctx.fillStyle = "rgba(82, 62, 54, 0.16)";
    ctx.fillRect(c.x, WORLD.groundY, 18, canyonH);
    ctx.fillRect(c.x + c.w - 18, WORLD.groundY, 18, canyonH);

    // Layered drifting warm pixel mist at the bottom of the chasm
    const drift = Math.sin(t * 0.02 + c.x) * 10;
    ctx.fillStyle = PALETTE.chasmFogBack;
    for (let fx = c.x; fx < c.x + c.w; fx += 36) {
      const puffH = 36 + ((fx % 72) === 0 ? 12 : 0);
      ctx.fillRect(snap(fx + drift * 0.5), WORLD.h - puffH - 18, 42, puffH);
    }

    ctx.fillStyle = PALETTE.chasmFogFront;
    for (let fx = c.x - 12; fx < c.x + c.w; fx += 42) {
      const puffH = 24 + ((fx % 84) === 0 ? 9 : 0);
      ctx.fillRect(snap(fx - drift), WORLD.h - puffH, 48, puffH);
    }
  }
}

/**
 * Draw PesanManis checkpoint lantern posts along the route.
 */
export function drawCheckpoints(ctx: CanvasRenderingContext2D, state: State) {
  for (const cp of CHECKPOINTS) {
    const active = state.checkpointsReached.includes(cp.id);
    const px = snap(cp.x);
    const gy = cp.y;

    // Warm golden glow halo once activated
    if (active) {
      const pulse = (Math.sin(state.t / 12) + 1) * 0.5;
      ctx.fillStyle = `rgba(255, 226, 154, ${0.22 + pulse * 0.16})`;
      ctx.beginPath();
      ctx.arc(px + 12, gy - 63, 24 + pulse * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stone base & timber post
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(px - 9, gy - 9, 18, 9);
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(px - 6, gy - 12, 12, 3);

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(px - 4, gy - 78, 8, 69);
    ctx.fillStyle = PALETTE.woodBase;
    ctx.fillRect(px - 2, gy - 75, 4, 66);

    // Crossarm & hanging post lantern
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(px - 3, gy - 72, 21, 5);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(px + 9, gy - 67, 12, 14);
    ctx.fillStyle = active ? PALETTE.amberGlow : "#cbb7a9";
    ctx.fillRect(px + 11, gy - 64, 8, 8);

    // Terracotta courier flag (low when inactive, raised & fluttering when active)
    const flagY = active ? gy - 63 : gy - 33;
    const wave = active ? Math.round(Math.sin(state.t / 7) * 2) : 0;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(px + 3, flagY, 21, 14);
    ctx.fillStyle = active ? PALETTE.terracotta : "#b69886";
    ctx.fillRect(px + 4, flagY + 2, 18, 10);
    ctx.fillStyle = active ? PALETTE.cream : PALETTE.wallCream;
    ctx.fillRect(px + 10, flagY + 5 + Math.max(0, wave), 6, 4);
  }
}

/**
 * Draw patrolling "Paket Bandel" Goomba-style enemies and squashed frames.
 */
export function drawEnemies(ctx: CanvasRenderingContext2D, state: State) {
  for (const e of state.enemies) {
    if (!e.alive && e.squashTimer <= 0) continue;

    const colors = e.variant === "fast" ? ENEMY_COLORS_FAST : ENEMY_COLORS_NORMAL;
    const cx = Math.round(e.x + e.w / 2);

    if (!e.alive) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, e.squashTimer / 10);
      drawPixelMatrix(ctx, ENEMY_SQUASHED, e.x, e.y - 15, PX, colors);
      ctx.restore();
      continue;
    }

    // Grounded contact shadow
    ctx.fillStyle = "rgba(36, 25, 20, 0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, e.y - 1, 14, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Speed lines trailing behind fast red-ribbon variant
    if (e.variant === "fast") {
      const trailX = e.dir > 0 ? e.x - 10 : e.x + e.w + 4;
      ctx.fillStyle = "rgba(220, 74, 74, 0.45)";
      ctx.fillRect(trailX, e.y - 24, 6, 3);
      ctx.fillRect(trailX - e.dir * 3, e.y - 15, 6, 3);
    }

    const stepRate = e.variant === "fast" ? 5 : 8;
    const matrix = Math.floor(state.t / stepRate) % 2 === 0 ? ENEMY_WALK_A : ENEMY_WALK_B;

    ctx.save();
    ctx.translate(cx, Math.round(e.y - e.h));
    ctx.scale(e.dir, 1);
    drawPixelMatrix(ctx, matrix, -e.w / 2, 0, PX, colors);
    ctx.restore();
  }
}
