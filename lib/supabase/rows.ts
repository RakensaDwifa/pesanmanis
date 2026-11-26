import type {
  DraftAddonConfig,
  GateData,
  GateType,
  ParticleStyle,
  RecipientResponse,
  StoredUcapan,
  TimelineItem,
  UcapanContent,
  ViewSummary,
} from "../types.ts";
import type { MoodKey } from "../mood.ts";
import { FREE_PHOTO_LIMIT, sanitizeAddons } from "../pricing.ts";
import { validateSlugFormat } from "../slug.ts";
import { isRecord, isValidEmail, isValidMediaUrl } from "../validation.ts";
import { normalizeUnlockAt } from "../unlock-schedule.ts";

export type { DraftAddonConfig, GateData, StoredUcapan, ViewSummary };

const VALID_MOODS: Record<MoodKey, true> = {
  romantic: true,
  playful: true,
  calm: true,
  sunset: true,
  lavender: true,
};
const VALID_PARTICLES: readonly ParticleStyle[] = ["hearts", "roses", "sparkles"];
const META_TIMELINE_TAG = "__pm_meta__";

export const VALID_TEMPLATE_SLUGS: Record<string, true> = {
  "amplop-cinta": true,
  "botol-kenangan": true,
  "buket-bunga": true,
  "surat-cinta": true,
  "kartu-ucapan": true,
  valentine: true,
  "permintaan-maaf": true,
  "kaca-berembun": true,
  "bonceng-malam": true,
};

interface TimelineMetaEntry {
  date: typeof META_TIMELINE_TAG;
  title: string;
  mood: MoodKey | null;
  videoUrl: string | null;
  voiceNoteUrl?: string | null;
  unlockAt?: string | null;
}

export type RawTimelineEntry = TimelineItem | TimelineMetaEntry;

export interface DraftAddonInput {
  addons?: unknown;
  customSlug?: string | null;
  gateType?: string | null;
  pin?: string | null;
  question?: string | null;
  answer?: string | null;
  particleStyle?: string | null;
}

function normalizeParticleStyle(raw: unknown): ParticleStyle | null {
  if (typeof raw !== "string") return null;
  return (VALID_PARTICLES as readonly string[]).includes(raw)
    ? (raw as ParticleStyle)
    : null;
}

/**
 * Sanitizes draft add-on preferences into a JSONB payload stored in `ucapan.draft_addons`
 * (and snapshotted into `payments.addon_config`) without mutating live paid columns.
 */
export function buildDraftAddonState(
  input?: DraftAddonInput
): DraftAddonConfig | null {
  if (!input || input.addons === undefined) return null;
  const addons = sanitizeAddons(input.addons);
  let customSlug: string | null = null;
  if (addons.includes("custom_slug") && typeof input.customSlug === "string") {
    const check = validateSlugFormat(input.customSlug);
    if (check.valid) customSlug = check.normalized;
  }

  const hasGate = addons.includes("intimate_gate");
  const isTrivia = hasGate && input.gateType === "trivia";
  const pinRaw = typeof input.pin === "string" ? input.pin.trim() : "";
  const pin = hasGate && !isTrivia && /^\d{4,6}$/.test(pinRaw) ? pinRaw : null;

  const questionRaw = typeof input.question === "string" ? input.question.trim() : "";
  const answerRaw = typeof input.answer === "string" ? input.answer.trim() : "";
  const validTrivia =
    isTrivia &&
    questionRaw.length >= 3 &&
    questionRaw.length <= 160 &&
    answerRaw.length >= 1 &&
    answerRaw.length <= 80;

  const particleStyle: ParticleStyle | null = addons.includes("touch_particles")
    ? normalizeParticleStyle(input.particleStyle) ?? "hearts"
    : null;

  if (isTrivia) {
    return {
      addons,
      customSlug,
      gateType: "trivia",
      pin: null,
      question: validTrivia ? questionRaw : null,
      answer: validTrivia ? answerRaw : null,
      particleStyle,
    };
  }

  return {
    addons,
    customSlug,
    pin,
    particleStyle,
  };
}

/**
 * Converts a DraftAddonInput into live `ucapan` add-on columns.
 * Used during server-side payment activation and retained for unit test compatibility.
 */
export function buildDraftAddonColumns(input?: DraftAddonInput): Record<string, unknown> {
  const state = buildDraftAddonState(input);
  if (!state) return {};

  const hasGate = state.addons.includes("intimate_gate");
  let gateType: GateType | null = null;
  let gateData: GateData | null = null;

  if (hasGate) {
    if (state.gateType === "trivia") {
      if (state.question && state.answer) {
        gateType = "trivia";
        gateData = { question: state.question, answer: state.answer };
      }
    } else if (state.pin) {
      gateType = "pin";
      gateData = { pin: state.pin };
    }
  }

  return {
    custom_slug: state.addons.includes("custom_slug") ? state.customSlug ?? null : null,
    qr_photo_enabled: state.addons.includes("custom_qr"),
    touch_particles: state.addons.includes("touch_particles")
      ? state.particleStyle ?? "hearts"
      : null,
    gate_type: gateType,
    gate_data: gateData,
    receipt_enabled: state.addons.includes("love_receipt"),
    voice_note_enabled: state.addons.includes("voice_note"),
    extra_photos_enabled: state.addons.includes("extra_photos"),
  };
}

/** Validates ucapan payload at runtime (guards against non-string JSON values & protocol-relative URLs). */
export function validateUcapanInput(
  raw: unknown
): { valid: true } | { valid: false; reason: string } {
  if (!isRecord(raw)) {
    return { valid: false, reason: "INVALID_BODY" };
  }

  if (typeof raw.templateSlug !== "string" || !VALID_TEMPLATE_SLUGS[raw.templateSlug]) {
    return { valid: false, reason: "INVALID_TEMPLATE" };
  }

  if (typeof raw.toName !== "string") {
    return { valid: false, reason: "TO_NAME_INVALID" };
  }
  const t = raw.toName.trim();
  if (!t || t.length > 80) return { valid: false, reason: "TO_NAME_INVALID" };

  if (typeof raw.fromName !== "string") {
    return { valid: false, reason: "FROM_NAME_INVALID" };
  }
  const f = raw.fromName.trim();
  if (!f || f.length > 80) return { valid: false, reason: "FROM_NAME_INVALID" };

  if (raw.title !== undefined && raw.title !== null) {
    if (typeof raw.title !== "string" || raw.title.trim().length > 120) {
      return { valid: false, reason: "TITLE_TOO_LONG" };
    }
  }

  if (raw.message !== undefined && raw.message !== null) {
    if (typeof raw.message !== "string" || raw.message.trim().length > 5000) {
      return { valid: false, reason: "MESSAGE_TOO_LONG" };
    }
  }

  const photos = raw.photos ?? [];
  if (!Array.isArray(photos) || photos.length > 10) {
    return { valid: false, reason: "PHOTOS_INVALID" };
  }
  for (const p of photos) {
    if (typeof p !== "string") return { valid: false, reason: "PHOTO_URL_INVALID" };
    if (p.length > 500) return { valid: false, reason: "PHOTO_URL_TOO_LONG" };
    if (p && !isValidMediaUrl(p, 500)) {
      return { valid: false, reason: "PHOTO_URL_INVALID" };
    }
  }

  if (raw.musicUrl !== undefined && raw.musicUrl !== null && raw.musicUrl !== "") {
    if (typeof raw.musicUrl !== "string" || !isValidMediaUrl(raw.musicUrl, 500)) {
      return { valid: false, reason: "MUSIC_URL_INVALID" };
    }
  }

  if (raw.videoUrl !== undefined && raw.videoUrl !== null && raw.videoUrl !== "") {
    if (typeof raw.videoUrl !== "string" || !isValidMediaUrl(raw.videoUrl, 500)) {
      return { valid: false, reason: "VIDEO_URL_INVALID" };
    }
  }

  if (raw.voiceNoteUrl !== undefined && raw.voiceNoteUrl !== null && raw.voiceNoteUrl !== "") {
    if (typeof raw.voiceNoteUrl !== "string" || !isValidMediaUrl(raw.voiceNoteUrl, 500)) {
      return { valid: false, reason: "VOICE_NOTE_URL_INVALID" };
    }
  }

  if (raw.mood !== undefined && raw.mood !== null && raw.mood !== "") {
    if (typeof raw.mood !== "string" || !VALID_MOODS[raw.mood as MoodKey]) {
      return { valid: false, reason: "MOOD_INVALID" };
    }
  }

  if (raw.email !== undefined && raw.email !== null && raw.email !== "") {
    if (!isValidEmail(raw.email)) {
      return { valid: false, reason: "EMAIL_INVALID" };
    }
  }

  const timeline = raw.timeline;
  if (timeline !== undefined && timeline !== null) {
    if (!Array.isArray(timeline) || timeline.length > 12) {
      return { valid: false, reason: "TIMELINE_INVALID" };
    }
    for (const item of timeline) {
      if (!isRecord(item)) return { valid: false, reason: "TIMELINE_ITEM_INVALID" };
      if (item.title !== undefined && item.title !== null && (typeof item.title !== "string" || item.title.length > 80)) {
        return { valid: false, reason: "TIMELINE_TITLE_TOO_LONG" };
      }
      if (item.date !== undefined && item.date !== null && (typeof item.date !== "string" || item.date.length > 20)) {
        return { valid: false, reason: "TIMELINE_DATE_TOO_LONG" };
      }
      if (
        item.description !== undefined &&
        item.description !== null &&
        (typeof item.description !== "string" || item.description.length > 500)
      ) {
        return { valid: false, reason: "TIMELINE_DESC_TOO_LONG" };
      }
    }
  }

  if (raw.unlockAt !== undefined && raw.unlockAt !== null && raw.unlockAt !== "") {
    const normalized = normalizeUnlockAt(raw.unlockAt);
    if (normalized === null) {
      return { valid: false, reason: "UNLOCK_AT_INVALID" };
    }
  }

  return { valid: true };
}

export interface UcapanRow {
  id: string;
  owner_id?: string | null;
  template_slug: string;
  to_name: string;
  from_name: string;
  title: string;
  message: string;
  photos: string[];
  music_url: string | null;
  email: string | null;
  timeline: RawTimelineEntry[] | null;
  draft_addons?: DraftAddonConfig | null;
  custom_slug?: string | null;
  qr_photo_enabled?: boolean;
  touch_particles?: string | null;
  gate_type?: string | null;
  gate_data?: GateData | null;
  receipt_enabled?: boolean;
  voice_note_enabled?: boolean;
  extra_photos_enabled?: boolean;
  recipient_response?: unknown;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UcapanStatsRow {
  ucapan_id: string;
  total_views: number;
  first_view_at: string | null;
  last_view_at: string | null;
}

export const MAX_HESITATION_COUNT = 500;

export interface RecipientResponsePayload {
  type: "apology";
  decision: "forgiven";
  hesitationCount: number;
}

export function validateRecipientResponseInput(
  raw: unknown
):
  | { valid: true; data: RecipientResponsePayload }
  | { valid: false; reason: string } {
  if (!isRecord(raw)) {
    return { valid: false, reason: "INVALID_BODY" };
  }
  if (raw.type !== "apology") {
    return { valid: false, reason: "INVALID_RESPONSE_TYPE" };
  }
  if (raw.decision !== "forgiven") {
    return { valid: false, reason: "INVALID_DECISION" };
  }
  if (
    typeof raw.hesitationCount !== "number" ||
    !Number.isInteger(raw.hesitationCount) ||
    raw.hesitationCount < 0 ||
    raw.hesitationCount > MAX_HESITATION_COUNT
  ) {
    return { valid: false, reason: "INVALID_HESITATION_COUNT" };
  }
  return {
    valid: true,
    data: {
      type: "apology",
      decision: "forgiven",
      hesitationCount: raw.hesitationCount,
    },
  };
}

export function parseRecipientResponse(raw: unknown): RecipientResponse | null {
  const checked = validateRecipientResponseInput(raw);
  if (!checked.valid || !isRecord(raw)) return null;
  if (
    typeof raw.respondedAt !== "number" ||
    !Number.isFinite(raw.respondedAt) ||
    raw.respondedAt <= 0
  ) {
    return null;
  }
  return {
    ...checked.data,
    respondedAt: Math.trunc(raw.respondedAt),
  };
}

function parseGateData(raw: unknown): GateData | null {
  if (!isRecord(raw)) return null;
  const result: GateData = {};
  if (typeof raw.pin === "string") result.pin = raw.pin;
  if (typeof raw.question === "string") result.question = raw.question;
  if (typeof raw.answer === "string") result.answer = raw.answer;
  return Object.keys(result).length > 0 ? result : null;
}

function parseDraftAddons(raw: unknown): DraftAddonConfig | null {
  if (!isRecord(raw)) return null;
  const addons = sanitizeAddons(raw.addons);
  const gateType: GateType | null =
    raw.gateType === "trivia" ? "trivia" : raw.gateType === "pin" ? "pin" : null;
  const config: DraftAddonConfig = {
    addons,
    customSlug: typeof raw.customSlug === "string" ? raw.customSlug : null,
    pin: typeof raw.pin === "string" ? raw.pin : null,
    particleStyle: normalizeParticleStyle(raw.particleStyle),
  };
  if (gateType) config.gateType = gateType;
  if (typeof raw.question === "string") config.question = raw.question;
  if (typeof raw.answer === "string") config.answer = raw.answer;
  return config;
}

export function extractUnlockAtFromTimeline(timeline: unknown): string | null {
  if (!Array.isArray(timeline)) return null;
  let unlockAt: string | null = null;
  for (const item of timeline) {
    if (
      isRecord(item) &&
      item.date === META_TIMELINE_TAG &&
      typeof item.unlockAt === "string" &&
      item.unlockAt
    ) {
      const normalized = normalizeUnlockAt(item.unlockAt);
      if (normalized) unlockAt = normalized;
    }
  }
  return unlockAt;
}

export function mapUcapanRow(
  row: UcapanRow,
  stats?: UcapanStatsRow | null
): StoredUcapan {
  const rawTimeline = Array.isArray(row.timeline) ? row.timeline : [];
  const cleanTimeline: TimelineItem[] = [];
  let mood: MoodKey | undefined;
  let videoUrl: string | undefined;
  let voiceNoteUrl: string | undefined;
  let unlockAt: string | undefined;

  for (const item of rawTimeline) {
    if (isRecord(item) && item.date === META_TIMELINE_TAG) {
      if (typeof item.mood === "string" && VALID_MOODS[item.mood as MoodKey]) {
        mood = item.mood as MoodKey;
      }
      if (typeof item.videoUrl === "string" && item.videoUrl) {
        videoUrl = item.videoUrl;
      }
      if (typeof item.voiceNoteUrl === "string" && item.voiceNoteUrl) {
        voiceNoteUrl = item.voiceNoteUrl;
      }
      if (typeof item.unlockAt === "string" && item.unlockAt) {
        const normalized = normalizeUnlockAt(item.unlockAt);
        if (normalized) unlockAt = normalized;
      }
    } else if (isRecord(item)) {
      cleanTimeline.push({
        date: typeof item.date === "string" ? item.date : "",
        title: typeof item.title === "string" ? item.title : "",
        description: typeof item.description === "string" ? item.description : undefined,
      });
    }
  }

  const parsedDraft = parseDraftAddons(row.draft_addons);
  const liveGateData = parseGateData(row.gate_data);
  const recipientResponse = parseRecipientResponse(row.recipient_response);

  // For unpaid drafts, fall back to draft_addons so Builder & Checkout restore preferences cross-device.
  const effectiveCustomSlug = row.paid
    ? row.custom_slug ?? null
    : parsedDraft
      ? parsedDraft.addons.includes("custom_slug")
        ? parsedDraft.customSlug ?? null
        : null
      : row.custom_slug ?? null;

  const effectiveQrPhoto = row.paid
    ? Boolean(row.qr_photo_enabled)
    : parsedDraft
      ? parsedDraft.addons.includes("custom_qr")
      : Boolean(row.qr_photo_enabled);

  const effectiveTouchParticles = row.paid
    ? row.touch_particles ?? null
    : parsedDraft
      ? parsedDraft.addons.includes("touch_particles")
        ? parsedDraft.particleStyle ?? "hearts"
        : null
      : row.touch_particles ?? null;

  const effectiveGateType = row.paid
    ? row.gate_type ?? null
    : parsedDraft
      ? parsedDraft.addons.includes("intimate_gate")
        ? parsedDraft.gateType === "trivia"
          ? parsedDraft.question && parsedDraft.answer
            ? "trivia"
            : null
          : parsedDraft.pin
            ? "pin"
            : null
        : null
      : row.gate_type ?? null;

  const effectiveGateData = row.paid
    ? liveGateData
    : parsedDraft
      ? parsedDraft.addons.includes("intimate_gate")
        ? parsedDraft.gateType === "trivia"
          ? parsedDraft.question && parsedDraft.answer
            ? { question: parsedDraft.question, answer: parsedDraft.answer }
            : null
          : parsedDraft.pin
            ? { pin: parsedDraft.pin }
            : null
        : null
      : liveGateData;

  const effectiveReceipt = row.paid
    ? Boolean(row.receipt_enabled)
    : parsedDraft
      ? parsedDraft.addons.includes("love_receipt")
      : Boolean(row.receipt_enabled);

  const effectiveVoiceNote = row.paid
    ? Boolean(row.voice_note_enabled)
    : parsedDraft
      ? parsedDraft.addons.includes("voice_note")
      : Boolean(row.voice_note_enabled);

  const effectiveExtraPhotos = row.paid
    ? Boolean(row.extra_photos_enabled)
    : parsedDraft
      ? parsedDraft.addons.includes("extra_photos")
      : Boolean(row.extra_photos_enabled);

  return {
    id: row.id,
    templateSlug: row.template_slug,
    toName: row.to_name,
    fromName: row.from_name,
    title: row.title,
    message: row.message,
    photos: row.photos ?? [],
    musicUrl: row.music_url ?? undefined,
    videoUrl,
    voiceNoteUrl,
    mood,
    email: row.email ?? undefined,
    timeline: cleanTimeline.length > 0 ? cleanTimeline : undefined,
    paid: row.paid,
    paidAt: row.paid_at ? Date.parse(row.paid_at) : undefined,
    createdAt: Date.parse(row.created_at),
    customSlug: effectiveCustomSlug,
    qrPhotoEnabled: effectiveQrPhoto,
    touchParticles: effectiveTouchParticles,
    gateType: effectiveGateType,
    gateData: effectiveGateData,
    receiptEnabled: effectiveReceipt,
    voiceNoteEnabled: effectiveVoiceNote,
    extraPhotosEnabled: effectiveExtraPhotos,
    draftAddons: parsedDraft,
    recipientResponse: recipientResponse ?? undefined,
    unlockAt: unlockAt ?? undefined,
    views: stats
      ? {
          count: stats.total_views ?? 0,
          firstSeen: stats.first_view_at ? Date.parse(stats.first_view_at) : undefined,
          lastSeen: stats.last_view_at ? Date.parse(stats.last_view_at) : undefined,
        }
      : undefined,
  };
}

export function toUcapanRow(content: Partial<UcapanContent>) {
  const cleanPhotos = (content.photos ?? []).filter(
    (p): p is string => typeof p === "string" && p.trim() !== ""
  );
  const cleanTimeline: TimelineItem[] = (content.timeline ?? []).filter(
    (item) =>
      item &&
      item.date !== META_TIMELINE_TAG &&
      Boolean(item.date?.trim() || item.title?.trim() || item.description?.trim())
  );
  const hasMetaData =
    content.mood ||
    content.videoUrl?.trim() ||
    content.voiceNoteUrl?.trim() ||
    content.unlockAt?.trim();
  const metaEntry: TimelineMetaEntry[] = hasMetaData
    ? [
        {
          date: META_TIMELINE_TAG,
          title: "",
          mood: content.mood ?? null,
          videoUrl: content.videoUrl?.trim() || null,
          voiceNoteUrl: content.voiceNoteUrl?.trim() || null,
          unlockAt: content.unlockAt?.trim() || null,
        },
      ]
    : [];
  const finalTimeline: RawTimelineEntry[] = [...cleanTimeline, ...metaEntry];

  return {
    template_slug: content.templateSlug ?? "",
    to_name: content.toName ?? "",
    from_name: content.fromName ?? "",
    title: content.title ?? "",
    message: content.message ?? "",
    photos: cleanPhotos,
    music_url: content.musicUrl?.trim() || null,
    email: content.email?.trim() || null,
    timeline: finalTimeline.length > 0 ? finalTimeline : null,
  };
}

/** Strips creator email, draftAddons, and gate secrets (pin/answer) before sending to public clients. */
export function stripPublicUcapan(ucapan: StoredUcapan): StoredUcapan {
  const safeGateData: GateData | null =
    ucapan.gateData?.question ? { question: ucapan.gateData.question } : null;
  const allowVoiceNote = !ucapan.paid || Boolean(ucapan.voiceNoteEnabled);
  const effectivePhotos =
    ucapan.paid && !ucapan.extraPhotosEnabled
      ? (ucapan.photos ?? []).slice(0, FREE_PHOTO_LIMIT)
      : ucapan.photos;
  return {
    ...ucapan,
    photos: effectivePhotos,
    voiceNoteUrl: allowVoiceNote ? ucapan.voiceNoteUrl : undefined,
    email: undefined,
    draftAddons: undefined,
    gateData: safeGateData,
    locked: false,
    // unlockAt dipertahankan agar CountdownGate bisa tampil di sisi penerima
  };
}

/**
 * Redacts all private letter content (message, title, photos, media, timeline)
 * when an Intimate Gate is active and has not yet been unlocked on the server.
 */
export function stripLockedUcapan(ucapan: StoredUcapan): StoredUcapan {
  const safeGateData: GateData | null =
    ucapan.gateData?.question ? { question: ucapan.gateData.question } : null;
  return {
    id: ucapan.id,
    templateSlug: ucapan.templateSlug,
    toName: ucapan.toName,
    fromName: ucapan.fromName,
    title: "",
    message: "",
    photos: [],
    musicUrl: undefined,
    videoUrl: undefined,
    voiceNoteUrl: undefined,
    mood: ucapan.mood,
    email: undefined,
    timeline: undefined,
    paid: ucapan.paid,
    paidAt: ucapan.paidAt,
    createdAt: ucapan.createdAt,
    customSlug: ucapan.customSlug,
    qrPhotoEnabled: ucapan.qrPhotoEnabled,
    touchParticles: ucapan.touchParticles,
    gateType: ucapan.gateType,
    gateData: safeGateData,
    receiptEnabled: ucapan.receiptEnabled,
    voiceNoteEnabled: ucapan.voiceNoteEnabled,
    extraPhotosEnabled: ucapan.extraPhotosEnabled,
    recipientResponse: undefined,
    // unlockAt dipertahankan agar CountdownGate tampil sebelum Intimate Gate
    unlockAt: ucapan.unlockAt,
    locked: true,
  };
}
