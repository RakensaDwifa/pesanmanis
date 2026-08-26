export type MoodKey = "romantic" | "playful" | "calm" | "sunset" | "lavender";

export interface Mood {
  key: MoodKey;
  label: string;
  emoji: string;
  primary: string;
  primaryContainer: string;
  primaryFixed: string;
  onPrimaryFixed: string;
  onPrimaryFixedVariant: string;
  surface: string;
  surfaceContainerLow: string;
  onSurface: string;
  onSurfaceVariant: string;
  gradient: string;
}

export const MOODS: Record<MoodKey, Mood> = {
  romantic: {
    key: "romantic",
    label: "Romantis",
    emoji: "💗",
    primary: "#de7038",
    primaryContainer: "#ffdbcb",
    primaryFixed: "#ffdbcb",
    onPrimaryFixed: "#3e1400",
    onPrimaryFixedVariant: "#8f3a10",
    surface: "#fff9f5",
    surfaceContainerLow: "#fef1ea",
    onSurface: "#241914",
    onSurfaceVariant: "#55443c",
    gradient: "linear-gradient(160deg,#FFF6EE 0%,#FFE9D8 45%,#FFDCC8 100%)",
  },
  playful: {
    key: "playful",
    label: "Ceria",
    emoji: "🎀",
    primary: "#ec4899",
    primaryContainer: "#ffd6ec",
    primaryFixed: "#ffd6ec",
    onPrimaryFixed: "#3a0021",
    onPrimaryFixedVariant: "#9b1452",
    surface: "#fff5fa",
    surfaceContainerLow: "#ffe9f4",
    onSurface: "#2a1722",
    onSurfaceVariant: "#5e4453",
    gradient: "linear-gradient(160deg,#FFE9F5 0%,#FFC9E6 50%,#FFB0DC 100%)",
  },
  calm: {
    key: "calm",
    label: "Tenang",
    emoji: "🌿",
    primary: "#0d9488",
    primaryContainer: "#b2f0e6",
    primaryFixed: "#b2f0e6",
    onPrimaryFixed: "#00201c",
    onPrimaryFixedVariant: "#00695f",
    surface: "#f2fbfa",
    surfaceContainerLow: "#e2f6f2",
    onSurface: "#10211f",
    onSurfaceVariant: "#41544f",
    gradient: "linear-gradient(160deg,#E6F7F4 0%,#C9EFEC 50%,#A9E6E0 100%)",
  },
  sunset: {
    key: "sunset",
    label: "Senja",
    emoji: "🌇",
    primary: "#f97316",
    primaryContainer: "#ffe0c2",
    primaryFixed: "#ffe0c2",
    onPrimaryFixed: "#3d1500",
    onPrimaryFixedVariant: "#b1490a",
    surface: "#fff8f1",
    surfaceContainerLow: "#fff0e4",
    onSurface: "#271a12",
    onSurfaceVariant: "#5e4a3c",
    gradient: "linear-gradient(160deg,#FFEFE0 0%,#FFD0A8 50%,#FFB38A 100%)",
  },
  lavender: {
    key: "lavender",
    label: "Lavender",
    emoji: "💜",
    primary: "#8b5cf6",
    primaryContainer: "#e4d6ff",
    primaryFixed: "#e4d6ff",
    onPrimaryFixed: "#2a005c",
    onPrimaryFixedVariant: "#5b27b0",
    surface: "#f7f4ff",
    surfaceContainerLow: "#efe9ff",
    onSurface: "#1b1426",
    onSurfaceVariant: "#4d4260",
    gradient: "linear-gradient(160deg,#F3ECFF 0%,#E2D2FF 50%,#CDB6FF 100%)",
  },
};

export const MOOD_LIST: Mood[] = Object.values(MOODS);

export function getMood(key?: string): Mood {
  if (key && key in MOODS) return MOODS[key as MoodKey];
  return MOODS.romantic;
}
