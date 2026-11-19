import type { ReactNode } from "react";

export type ChapterType =
  | "cinematic"   // Narasi tap-to-continue
  | "hold"        // Tahan tombol selama X ms (misal pegangan motor)
  | "scratch"     // Mengusap kaca berembun / scratch layer
  | "tap_count"   // Ketuk X kali (misal matahari turun, pecahkan koin)
  | "drag_target" // Geser objek A ke target B (misal kunci helm, pasang stempel)
  | "choice";     // Pertanyaan / pilihan mini interaktif

export interface BaseChapter {
  id: string;
  title?: string;
  narration: string;
  instruction?: string;
  type: ChapterType;
  bgOverlay?: string; // class CSS untuk nuansa background (misal: 'bg-black/40', 'bg-amber-900/20')
}

export interface CinematicChapter extends BaseChapter {
  type: "cinematic";
  buttonText?: string;
}

export interface HoldChapter extends BaseChapter {
  type: "hold";
  holdDurationMs?: number; // default 2000ms
  buttonLabel?: string;
}

export interface ScratchChapter extends BaseChapter {
  type: "scratch";
  brushRadius?: number; // default 28
  thresholdPercent?: number; // default 60%
  underlayContent?: ReactNode; // konten di balik layer embun/scratch
}

export interface TapCountChapter extends BaseChapter {
  type: "tap_count";
  requiredTaps: number;
  tapActionLabel?: string;
  onProgress?: (current: number, total: number) => void;
}

export interface ChoiceChapter extends BaseChapter {
  type: "choice";
  options: Array<{
    id: string;
    label: string;
    isCorrect?: boolean;
    feedback?: string;
  }>;
}

export interface DragTargetChapter extends BaseChapter {
  type: "drag_target";
  sourceLabel?: string;
  targetLabel?: string;
  successMessage?: string;
}

export type NarrativeChapter =
  | CinematicChapter
  | HoldChapter
  | ScratchChapter
  | TapCountChapter
  | ChoiceChapter
  | DragTargetChapter;

export interface NarrativeManifest {
  id: string;
  name: string;
  theme: string;
  chapters: NarrativeChapter[];
}
