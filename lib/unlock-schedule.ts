/**
 * Pure helper functions for unlock schedule (countdown / jadwal buka).
 * Zero Next.js / Supabase imports — safe for Node test runner & browser.
 */

const MIN_YEAR = 2020;
const MAX_YEAR = 2100;

/** Normalize an arbitrary input to a valid ISO 8601 string, or null if invalid. */
export function normalizeUnlockAt(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  return d.toISOString();
}

/**
 * Returns true when the ucapan is currently locked (countdown not yet reached).
 * Returns false when unlockAt is null/undefined/invalid or time has passed.
 */
export function isUcapanCountdownLocked(
  unlockAt: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!unlockAt) return false;
  const target = Date.parse(unlockAt);
  if (!Number.isFinite(target)) return false;
  return nowMs < target;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Total remaining milliseconds (0 when past). */
  total: number;
}

/** Break remaining time into days / hours / minutes / seconds. All zero when past. */
export function getCountdownParts(
  unlockAt: string,
  nowMs: number = Date.now()
): CountdownParts {
  const target = Date.parse(unlockAt);
  const diff = Number.isFinite(target) ? Math.max(0, target - nowMs) : 0;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, total: diff };
}

/**
 * Converts an ISO string to the value expected by `<input type="datetime-local">`:
 * "YYYY-MM-DDTHH:MM" in local time.
 */
export function toLocalDatetimeInputValue(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  // Offset correction: shift UTC → local
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  return local.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

/**
 * Converts a `datetime-local` input value ("YYYY-MM-DDTHH:MM") back to ISO 8601.
 * The browser treats the value as local time, so `new Date(value)` already handles offset.
 */
export function fromLocalDatetimeInputValue(localValue: string): string {
  if (!localValue) return "";
  const d = new Date(localValue);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
}

/** Detect Indonesian timezone abbreviation based on user's local timezone. */
export function detectIndonesianTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === "Asia/Jakarta" || tz === "Asia/Pontianak") return "WIB (UTC+7)";
    if (tz === "Asia/Makassar" || tz === "Asia/Balikpapan") return "WITA (UTC+8)";
    if (tz === "Asia/Jayapura") return "WIT (UTC+9)";
    // Fallback: show UTC offset
    const offset = -new Date().getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
    const m = String(Math.abs(offset) % 60).padStart(2, "0");
    return `UTC${sign}${h}:${m}`;
  } catch {
    return "UTC";
  }
}
