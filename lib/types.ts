import type { MoodKey } from "./mood.ts";
import type { AddonKey } from "./pricing.ts";

export type TemplateCategory =
  | "ungkapan-sayang"
  | "birthday"
  | "anniversary"
  | "permintaan-maaf";

export const CATEGORY_META: Record<
  TemplateCategory,
  { label: string; emoji: string; active: boolean; order: number }
> = {
  "ungkapan-sayang": { label: "Love Message", emoji: "💌", active: true, order: 1 },
  birthday: { label: "Birthday", emoji: "🎂", active: true, order: 2 },
  anniversary: { label: "Anniversary", emoji: "🥂", active: true, order: 3 },
  "permintaan-maaf": { label: "Sorry Message", emoji: "🕊️", active: true, order: 4 },
};

export interface TemplateMeta {
  slug: string;
  name: string;
  type: TemplateCategory;
  description: string;
  active: boolean;
  order: number;
  gradient: string;
  /** Template punya alur naratif sendiri, jadi StoryFlow (ketuk hati) dilewati. */
  hasNarrative?: boolean;
  badge?: "popular" | "new";
  mockupSubtitle?: string;
  mockupHeadline?: string;
  mockupCta?: string;
  glowColor?: string;
  phoneGradient?: string;
  phoneDark?: boolean;
}

export interface TimelineItem {
  date: string;
  title: string;
  description?: string;
}

export type GateType = "pin" | "trivia";

export interface GateData {
  pin?: string;
  question?: string;
  answer?: string;
}

export type ParticleStyle = "hearts" | "roses" | "sparkles";

export interface DraftAddonConfig {
  addons: AddonKey[];
  customSlug?: string | null;
  gateType?: GateType | null;
  pin?: string | null;
  question?: string | null;
  answer?: string | null;
  particleStyle?: ParticleStyle | null;
}

export interface ViewSummary {
  count: number;
  firstSeen?: number;
  lastSeen?: number;
}

export interface UcapanContent {
  templateSlug: string;
  toName: string;
  fromName: string;
  title: string;
  message: string;
  photos: string[];
  musicUrl?: string;
  videoUrl?: string;
  mood?: MoodKey;
  email?: string;
  timeline?: TimelineItem[];
  createdAt?: number;
}

export interface StoredUcapan extends UcapanContent {
  id: string;
  paid: boolean;
  paidAt?: number;
  createdAt: number;
  views?: ViewSummary;
  customSlug?: string | null;
  qrPhotoEnabled?: boolean;
  touchParticles?: string | null;
  gateType?: string | null;
  gateData?: GateData | null;
  receiptEnabled?: boolean;
  draftAddons?: DraftAddonConfig | null;
  /** True when content is redacted server-side pending Intimate Gate verification. */
  locked?: boolean;
}

export interface TemplateRenderProps {
  content: UcapanContent;
  preview?: boolean;
}

export const MOCK_CONTENT: UcapanContent = {
  templateSlug: "amplop-cinta",
  toName: "Sayang",
  fromName: "Kesayanganmu",
  title: "Untuk Kamu",
  message:
    "Terima kasih sudah selalu ada. Setiap hari bersamamu adalah hadiah yang paling berharga. Aku sayang kamu, hari ini dan selamanya. ❤️",
  photos: [],
};
