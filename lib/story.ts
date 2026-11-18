// Rangkaian tahap cerita sebelum surat terbuka.
// Pure (tanpa React/browser) supaya bisa diuji dengan node --test.
import type { TemplateCategory } from "./types";

/** Game tahap 2. Tahap 1 selalu "ketuk hati" (EntryGame). */
export type StoryGame = "collect" | "hold";

export const STORY_GAMES: Record<TemplateCategory, StoryGame | null> = {
  "ungkapan-sayang": "collect",
  birthday: "hold",
  anniversary: null,
  "permintaan-maaf": null,
};

export function storyGameFor(category: TemplateCategory | undefined): StoryGame | null {
  if (!category) return null;
  return STORY_GAMES[category] ?? null;
}

/** Jumlah tahap: tahap 1 selalu ada; game kategori menambah satu. */
export function storyStepCount(game: StoryGame | null): number {
  return game ? 2 : 1;
}

export function isStoryFinished(stage: number, total: number): boolean {
  return stage >= total;
}

/** Maju satu tahap, tidak pernah melewati total. */
export function nextStage(current: number, total: number): number {
  if (!Number.isInteger(current) || current < 0) return 0;
  return Math.min(current + 1, total);
}
