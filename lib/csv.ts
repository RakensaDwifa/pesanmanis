/**
 * Pure RFC 4180 CSV serializer with spreadsheet formula-injection protection.
 * Safe for both client downloads and server exports (zero Node/browser-only dependencies).
 */

const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;
const SPACED_FORMULA_RE = /^[ ]+[=+\-@]/;

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);

  // Neutralize Excel / Google Sheets formula injection (OWASP CSV Injection mitigation).
  if (FORMULA_TRIGGER_RE.test(text) || SPACED_FORMULA_RE.test(text)) {
    text = `'${text}`;
  }

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toSafeCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(",");
  const bodyLines = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(","));
  return [headerLine, ...bodyLines].join("\r\n");
}
