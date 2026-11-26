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
  comingSoon?: boolean;
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
  voiceNoteUrl?: string;
  mood?: MoodKey;
  email?: string;
  timeline?: TimelineItem[];
  createdAt?: number;
  /** ISO 8601 — ucapan hanya bisa dibuka setelah waktu ini. Disimpan di __pm_meta__ JSONB. */
  unlockAt?: string | null;
}

export interface ApologyRecipientResponse {
  type: "apology";
  decision: "forgiven";
  hesitationCount: number;
  respondedAt: number;
}

export type RecipientResponse = ApologyRecipientResponse;

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
  voiceNoteEnabled?: boolean;
  extraPhotosEnabled?: boolean;
  draftAddons?: DraftAddonConfig | null;
  recipientResponse?: RecipientResponse | null;
  /** True when content is redacted server-side pending Intimate Gate verification. */
  locked?: boolean;
  // unlockAt diinherit dari UcapanContent — tidak perlu reduplicate, sudah ada di sana.
}

export interface TemplateRenderProps {
  content: UcapanContent;
  preview?: boolean;
  interactive?: boolean;
  ucapanId?: string;
  onOpenChange?: (open: boolean) => void;
  /** Hide built-in CassettePlayer & SfxToggle when a parent container manages audio UI (e.g. Hero preview card). */
  hideAudioControls?: boolean;
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
