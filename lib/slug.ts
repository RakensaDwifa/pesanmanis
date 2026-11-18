// Helper validasi dan sanitasi custom slug (PesanManis)

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "buat",
  "checkout",
  "dashboard",
  "login",
  "kebijakan-privasi",
  "sitemap.xml",
  "robots.txt",
  "icon.svg",
  "templates",
  "t",
  "u",
  "preview",
  "settings",
  "terms",
  "privacy",
  "help",
  "faq",
]);

export interface SlugValidationResult {
  valid: boolean;
  normalized: string;
  reason?: string;
}

/**
 * Validasi sintaksis slug secara offline tanpa database.
 */
export function validateSlugFormat(raw: unknown): SlugValidationResult {
  if (typeof raw !== "string") {
    return { valid: false, normalized: "", reason: "Slug harus berupa teks." };
  }

  const trimmed = raw.trim();
  if (/[^a-z0-9-\s]/i.test(trimmed)) {
    return {
      valid: false,
      normalized: "",
      reason: "Slug hanya boleh berisi huruf, angka, dan tanda hubung.",
    };
  }

  const normalized = trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized.length < 3) {
    return { valid: false, normalized, reason: "Slug minimal 3 karakter." };
  }

  if (normalized.length > 50) {
    return { valid: false, normalized, reason: "Slug maksimal 50 karakter." };
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      reason: "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung tunggal.",
    };
  }

  if (RESERVED_SLUGS.has(normalized)) {
    return {
      valid: false,
      normalized,
      reason: `Alamat "${normalized}" merupakan kata terlarang sistem. Silakan pilih nama lain.`,
    };
  }

  return { valid: true, normalized };
}
