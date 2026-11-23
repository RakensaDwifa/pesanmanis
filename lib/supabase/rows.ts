import type { UcapanContent } from "@/lib/types";

/** Validasi input ucapan sebelum insert/update. Melempar error jika tidak valid. */
export function validateUcapanInput(content: Partial<UcapanContent>): { valid: true } | { valid: false; reason: string } {
  if (!content.templateSlug || !getTemplate(content.templateSlug)) {
    return { valid: false, reason: "INVALID_TEMPLATE" };
  }
  const t = (content.toName ?? "").trim();
  if (!t || t.length > 80) return { valid: false, reason: "TO_NAME_INVALID" };
  const f = (content.fromName ?? "").trim();
  if (!f || f.length > 80) return { valid: false, reason: "FROM_NAME_INVALID" };
  const title = (content.title ?? "").trim();
  if (title.length > 120) return { valid: false, reason: "TITLE_TOO_LONG" };
  const msg = (content.message ?? "").trim();
  if (msg.length > 5000) return { valid: false, reason: "MESSAGE_TOO_LONG" };
  const photos = content.photos ?? [];
  if (!Array.isArray(photos) || photos.length > 10) return { valid: false, reason: "PHOTOS_INVALID" };
  for (const p of photos) {
    if (typeof p !== "string" || p.length > 500) return { valid: false, reason: "PHOTO_URL_TOO_LONG" };
    if (p && !p.startsWith("/") && !p.startsWith("https://")) return { valid: false, reason: "PHOTO_URL_INVALID" };
  }
  const music = content.musicUrl ?? "";
  if (music && (music.length > 500 || (!music.startsWith("/") && !music.startsWith("https://")))) {
    return { valid: false, reason: "MUSIC_URL_INVALID" };
  }
  const email = content.email ?? "";
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { valid: false, reason: "EMAIL_INVALID" };
  }
  const timeline = content.timeline;
  if (timeline !== undefined && timeline !== null) {
    if (!Array.isArray(timeline) || timeline.length > 12) return { valid: false, reason: "TIMELINE_INVALID" };
    for (const item of timeline) {
      if (!item || typeof item !== "object") return { valid: false, reason: "TIMELINE_ITEM_INVALID" };
      if (item.title && (typeof item.title !== "string" || item.title.length > 80)) return { valid: false, reason: "TIMELINE_TITLE_TOO_LONG" };
      if (item.date && (typeof item.date !== "string" || item.date.length > 20)) return { valid: false, reason: "TIMELINE_DATE_TOO_LONG" };
      if (item.description && (typeof item.description !== "string" || item.description.length > 500)) return { valid: false, reason: "TIMELINE_DESC_TOO_LONG" };
    }
  }
  return { valid: true };
}

// Lazy import untuk menghindari circular dependency
function getTemplate(slug: string) {
  // Synchronous check - will be replaced by actual import at runtime
  const templates: Record<string, boolean> = {
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
  return templates[slug] ?? false;
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
  timeline: any | null;
  custom_slug?: string | null;
  qr_photo_enabled?: boolean;
  touch_particles?: string | null;
  gate_type?: string | null;
  gate_data?: any | null;
  receipt_enabled?: boolean;
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

export interface ViewSummary {
  count: number;
  firstSeen?: number;
  lastSeen?: number;
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
  gateData?: any | null;
  receiptEnabled?: boolean;
}

export function mapUcapanRow(
  row: UcapanRow,
  stats?: UcapanStatsRow | null
): StoredUcapan {
  return {
    id: row.id,
    templateSlug: row.template_slug,
    toName: row.to_name,
    fromName: row.from_name,
    title: row.title,
    message: row.message,
    photos: row.photos ?? [],
    musicUrl: row.music_url ?? undefined,
    email: row.email ?? undefined,
    timeline: row.timeline ?? undefined,
    paid: row.paid,
    paidAt: row.paid_at ? Date.parse(row.paid_at) : undefined,
    createdAt: Date.parse(row.created_at),
    customSlug: row.custom_slug ?? null,
    qrPhotoEnabled: Boolean(row.qr_photo_enabled),
    touchParticles: row.touch_particles ?? null,
    gateType: row.gate_type ?? null,
    gateData: row.gate_data ?? null,
    receiptEnabled: Boolean(row.receipt_enabled),
    views: stats
      ? {
          count: stats.total_views ?? 0,
          firstSeen: stats.first_view_at
            ? Date.parse(stats.first_view_at)
            : undefined,
          lastSeen: stats.last_view_at
            ? Date.parse(stats.last_view_at)
            : undefined,
        }
      : undefined,
  };
}

export function toUcapanRow(content: Partial<UcapanContent>) {
  return {
    template_slug: content.templateSlug ?? "",
    to_name: content.toName ?? "",
    from_name: content.fromName ?? "",
    title: content.title ?? "",
    message: content.message ?? "",
    photos: content.photos ?? [],
    music_url: content.musicUrl ?? null,
    email: content.email?.trim() || null,
    timeline: content.timeline ?? null,
  };
}

/** Hapus email dan rahasia gate_data (pin/answer) sebelum dikirim ke client publik. */
export function stripPublicUcapan(ucapan: StoredUcapan): StoredUcapan {
  const safeGateData =
    ucapan.gateData && typeof ucapan.gateData === "object" && "question" in ucapan.gateData
      ? { question: ucapan.gateData.question }
      : null;
  return {
    ...ucapan,
    email: undefined,
    gateData: safeGateData,
  };
}
