// Pure TypeScript runtime validators for API Route Handlers and shared mappers.
// Keeps zero runtime dependencies while preventing TypeError crashes on malformed JSON payloads.

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim();
}

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

export function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_REGEX.test(trimmed);
}

/**
 * Validates that a media URL is either a safe relative path (starts with single "/")
 * or an HTTPS URL. Explicitly rejects protocol-relative URLs ("//evil.com/..."),
 * javascript:, data:, and oversized strings.
 */
export function isValidMediaUrl(value: unknown, maxLength = 500): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.length > maxLength) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extracts a Storage object path belonging to the configured Supabase project's "foto" bucket.
 * Returns null if the URL is external or does not match the project's public bucket URL.
 */
export function extractOwnedFotoStoragePath(
  rawUrl: unknown,
  configuredSupabaseUrl: string,
  ownerUserId: string
): string | null {
  if (typeof rawUrl !== "string" || !configuredSupabaseUrl || !ownerUserId) return null;
  const base = configuredSupabaseUrl.replace(/\/+$/, "");
  const expectedPrefix = `${base}/storage/v1/object/public/foto/`;
  if (!rawUrl.startsWith(expectedPrefix)) return null;

  const rawPath = rawUrl.slice(expectedPrefix.length).split("?")[0];
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (!decoded || decoded.includes("..") || decoded.startsWith("/")) return null;

  // Enforce ownership via per-user folder prefix ("<userId>/<filename>")
  if (!decoded.startsWith(`${ownerUserId}/`)) return null;
  return decoded;
}

/**
 * Extracts a Storage object path belonging to the configured Supabase project's "musik" bucket.
 * Strips any media range fragment (`#t=...`) and query string before checking ownership.
 */
export function extractOwnedAudioStoragePath(
  rawUrl: unknown,
  configuredSupabaseUrl: string,
  ownerUserId: string
): string | null {
  if (typeof rawUrl !== "string" || !configuredSupabaseUrl || !ownerUserId) return null;
  const base = configuredSupabaseUrl.replace(/\/+$/, "");
  const expectedPrefix = `${base}/storage/v1/object/public/musik/`;
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith(expectedPrefix)) return null;

  const rawPath = trimmed.slice(expectedPrefix.length).split("#")[0].split("?")[0];
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (!decoded || decoded.includes("..") || decoded.startsWith("/")) return null;

  if (!decoded.startsWith(`${ownerUserId}/`)) return null;
  return decoded;
}

/**
 * Returns true when a URL points to YouTube (watch, shorts, embed, or youtu.be).
 */
export function isYouTubeVideoUrl(rawUrl: unknown): boolean {
  if (typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "youtu.be" ||
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    );
  } catch {
    return false;
  }
}

/**
 * Extracts an R2 object key (`videos/<ownerUserId>/<file>`) belonging to the configured
 * R2 public base URL. Returns null if external or not owned by `ownerUserId`.
 */
export function extractOwnedR2VideoKey(
  rawUrl: unknown,
  configuredR2PublicUrl: string,
  ownerUserId: string
): string | null {
  if (typeof rawUrl !== "string" || !configuredR2PublicUrl || !ownerUserId) return null;
  const base = configuredR2PublicUrl.trim().replace(/\/+$/, "");
  const expectedPrefix = `${base}/`;
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith(expectedPrefix)) return null;

  const rawKey = trimmed.slice(expectedPrefix.length).split("#")[0].split("?")[0];
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawKey);
  } catch {
    return null;
  }
  if (!decoded || decoded.includes("..") || decoded.startsWith("/")) return null;
  if (!decoded.startsWith(`videos/${ownerUserId}/`)) return null;
  return decoded;
}

/**
 * Normalizes a base app URL from environment variables, handling empty strings and trailing slashes.
 */
export function normalizeBaseUrl(raw: string | undefined, fallback: string): string {
  const candidate = (raw ?? "").trim().replace(/\/+$/, "");
  if (!candidate) return fallback;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return candidate;
    }
  } catch {
    // fallback below
  }
  return fallback;
}

/**
 * Validates that a redirect path is strictly same-origin relative (prevents // and /\ open redirects).
 */
export function sanitizeRelativeRedirect(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }
  if (/[\r\n]/.test(trimmed)) return fallback;
  try {
    const resolved = new URL(trimmed, "https://pesanmanis.local");
    if (resolved.origin !== "https://pesanmanis.local") return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
