/**
 * Shared Warm Cozy Pixel-Art palette and pixel-matrix drawing helpers for Kurir Kado.
 * Tuned to align with PesanManis Material-3 Warm Peach / Apricot design tokens.
 */

export const PX = 3;

export const PALETTE = {
  ink: "#241914",
  inkSoft: "#392e28",
  cream: "#fff9f5",
  creamWarm: "#fff4ea",
  peachLight: "#ffdbcb",
  peachMid: "#ffb597",
  terracotta: "#de7038",
  terracottaLt: "#f49256",
  terracottaDk: "#8f3a10",
  coral: "#dc4a4a",
  gold: "#ffd166",
  amberGlow: "#ffe29a",

  // Sky & atmospheric parallax layers
  skyTop: "#f6d2be",
  skyMid: "#fce5d4",
  skyHorizon: "#fff6ee",
  sunCore: "#fffdf9",
  sunHalo: "#ffe3c8",
  cloudLight: "#fffdf9",
  cloudShade: "#f5d7c4",
  farHill: "#ebc9b7",
  farHillDetail: "#dfb5a0",
  midHill: "#dcb09a",
  townSilhouette: "#cf9b84",
  fenceWood: "#c59b82",
  fenceShade: "#ab8069",
  bushMuted: "#b6c2a2",
  bushMutedShade: "#99a884",

  // Foreground terrain (warm sandstone masonry + sunlit sage grass)
  grassRim: "#96c96e",
  grassMid: "#58925b",
  grassShade: "#3c6e44",
  grassVine: "#497d4f",
  stoneLight: "#96796b",
  stoneBase: "#7b6155",
  stoneMid: "#6e554b",
  stoneDark: "#523e36",
  earthDeep: "#392b25",

  // Timber & props
  woodLight: "#b57852",
  woodBase: "#8f5a3c",
  woodDark: "#5e3824",
  wallCream: "#f7e7d8",
  wallShade: "#e3cbb7",
  checkGreen: "#4e8a54",

  // Paket Bandel enemy & chasm mist
  kraftLight: "#d89c6a",
  kraftBase: "#be7e4c",
  kraftShade: "#945a30",
  kraftFastLight: "#c86a48",
  kraftFastBase: "#9e492c",
  kraftFastShade: "#6e2e18",
  chasmFogBack: "rgba(246, 210, 190, 0.42)",
  chasmFogFront: "rgba(255, 246, 238, 0.78)",
} as const;

export const ITEM_LABELS: Record<string, string> = {
  foto: "+1 Foto Kenangan",
  lagu: "+1 Lagu Cerita",
  surat: "+1 Surat Manis",
};

/** 14x14 multi-color pixel art matrices for the three collectible memories */
export const MOMENT_MATRICES: Record<string, string[]> = {
  foto: [
    "..kkkkkkkkkk..",
    ".kwwwwwwwwwwk.",
    ".kwccccccccwk.",
    ".kwccggggccwk.",
    ".kwcCCCCCCcwk.",
    ".kwmccccccmwk.",
    ".kwmmgmmgmmwk.",
    ".kwmmmmmmmmwk.",
    ".kwwwwwwwwwwk.",
    ".kwppppppppwk.",
    ".kwwwwwwwwwwk.",
    "..kkkkkkkkkk..",
  ],
  lagu: [
    ".kkkkkkkkkkkk.",
    "khhhhhhhhhhhhk",
    "khcccccccccckh",
    "khccwwwwwwcckh",
    "khcwkkwwkkwckh",
    "khcwkwwwwkwckh",
    "khccccccccckkh",
    "khhkppppppkhhk",
    "khhkggggggkhhk",
    ".kkkkkkkkkkkk.",
  ],
  surat: [
    "..............",
    ".kkkkkkkkkkkk.",
    "kwwwwwwwwwwwwk",
    "kwkwwkrrkwwkwk",
    "kwwkrrrrrrkwwk",
    "kwwwkrrrrkwwwk",
    "kwwwwkrrkwwwwk",
    "kwkwwwwwwwwkwk",
    "kppppppppppppk",
    ".kkkkkkkkkkkk.",
  ],
};

export const MOMENT_COLORS: Record<string, string> = {
  k: PALETTE.ink,
  w: PALETTE.cream,
  p: PALETTE.peachLight,
  c: PALETTE.terracotta,
  C: PALETTE.terracottaLt,
  g: PALETTE.gold,
  m: PALETTE.grassMid,
  h: PALETTE.inkSoft,
  r: PALETTE.coral,
};

export const CHECK_MATRIX = [
  "......w",
  ".....ww",
  "w...ww.",
  "ww.ww..",
  ".www...",
  "..w....",
];

/** 12x12 "Paket Bandel" Goomba-style pixel sprites (rendered at PX=3 => 36x36) */
export const ENEMY_WALK_A = [
  "..kkkkkkkk..",
  ".kLLRRRRLLk.",
  "kRRRRRRRRRRk",
  "kbbLLRRLLbbk",
  "kbkkRRRRkkbk",
  "kbwkkbbkkwbk",
  "kbwkbbbbkwbk",
  "kbbbkkkkbbbk",
  "kbbMMMMMMbbk",
  ".kkkkkkkkkk.",
  ".kmmk..kk...",
  ".kkkk.......",
];

export const ENEMY_WALK_B = [
  "..kkkkkkkk..",
  ".kLLRRRRLLk.",
  "kRRRRRRRRRRk",
  "kbbLLRRLLbbk",
  "kbkkRRRRkkbk",
  "kbwkkbbkkwbk",
  "kbwkbbbbkwbk",
  "kbbbkkkkbbbk",
  "kbbMMMMMMbbk",
  ".kkkkkkkkkk.",
  "...kk..kmmk.",
  ".......kkkk.",
];

export const ENEMY_SQUASHED = [
  ".kkkkkkkkkk.",
  "kRRRRRRRRRRk",
  "kbkwkbbkwkbk",
  "kbbMMMMMMbbk",
  ".kkkkkkkkkk.",
];

export const ENEMY_COLORS_NORMAL: Record<string, string> = {
  k: PALETTE.ink,
  L: PALETTE.kraftLight,
  b: PALETTE.kraftBase,
  M: PALETTE.kraftShade,
  R: PALETTE.gold,
  w: PALETTE.cream,
  m: PALETTE.woodDark,
};

export const ENEMY_COLORS_FAST: Record<string, string> = {
  k: PALETTE.ink,
  L: PALETTE.kraftFastLight,
  b: PALETTE.kraftFastBase,
  M: PALETTE.kraftFastShade,
  R: PALETTE.coral,
  w: PALETTE.cream,
  m: PALETTE.inkSoft,
};

/** 10x10 wrapped gift box sprite used in the delivery toss cutscene */
export const GIFT_MATRIX = [
  "..kkrrkk..",
  ".kxxrrxxk.",
  "kxxxrrxxxk",
  "krrrrrrrrk",
  "kxxxrrxxxk",
  "kxxxrrxxxk",
  "kpppggpppk",
  ".kkkkkkkk.",
];

export const GIFT_COLORS: Record<string, string> = {
  k: PALETTE.ink,
  x: PALETTE.creamWarm,
  p: PALETTE.peachLight,
  r: PALETTE.coral,
  g: PALETTE.gold,
};

/** 9x8 pixel heart icon floating above the recipient after catching the gift */
export const HEART_MATRIX = [
  ".kk...kk.",
  "krrk.krrk",
  "krwkrrrrk",
  "krrrrrrrk",
  ".krrrrrk.",
  "..krrrk..",
  "...krk...",
  "....k....",
];

export const HEART_COLORS: Record<string, string> = {
  k: PALETTE.ink,
  r: PALETTE.coral,
  w: PALETTE.cream,
};

/** Draw an ASCII pixel matrix snapped to integer coordinates */
export function drawPixelMatrix(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  scale: number,
  colorMap: Record<string, string>
) {
  const ox = Math.round(x);
  const oy = Math.round(y);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const color = colorMap[row[c]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + c * scale, oy + r * scale, scale, scale);
    }
  }
}

/** Deterministic integer hash for non-flickering brick & foliage variation */
export function tileHash(a: number, b: number): number {
  let n = (a * 374761393 + b * 668265263) ^ 0x5bf03635;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) % 100;
}
