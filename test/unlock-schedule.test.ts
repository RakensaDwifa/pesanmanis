import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  normalizeUnlockAt,
  isUcapanCountdownLocked,
  getCountdownParts,
  toLocalDatetimeInputValue,
  fromLocalDatetimeInputValue,
} from "../lib/unlock-schedule.ts";
import { toUcapanRow, mapUcapanRow, stripPublicUcapan, stripLockedUcapan } from "../lib/supabase/rows.ts";
import type { UcapanRow } from "../lib/supabase/rows.ts";

// ─────────────────────────────────────────────
// normalizeUnlockAt
// ─────────────────────────────────────────────
describe("normalizeUnlockAt", () => {
  test("valid ISO string returns normalized ISO", () => {
    const input = "2027-06-15T10:00:00.000Z";
    const result = normalizeUnlockAt(input);
    assert.ok(result !== null);
    assert.ok(result.endsWith("Z") || result.includes("T"));
    assert.equal(new Date(result!).toISOString(), new Date(input).toISOString());
  });

  test("invalid string returns null", () => {
    assert.equal(normalizeUnlockAt("not-a-date"), null);
    assert.equal(normalizeUnlockAt(""), null);
    assert.equal(normalizeUnlockAt(null), null);
    assert.equal(normalizeUnlockAt(undefined), null);
    assert.equal(normalizeUnlockAt(123), null);
  });

  test("year below 2020 returns null", () => {
    assert.equal(normalizeUnlockAt("2019-01-01T00:00:00Z"), null);
  });

  test("year above 2100 returns null", () => {
    assert.equal(normalizeUnlockAt("2101-01-01T00:00:00Z"), null);
  });

  test("year within range returns value", () => {
    assert.ok(normalizeUnlockAt("2050-03-20T12:00:00Z") !== null);
    assert.ok(normalizeUnlockAt("2020-01-01T00:00:00Z") !== null);
    assert.ok(normalizeUnlockAt("2100-12-31T23:59:59Z") !== null);
  });
});

// ─────────────────────────────────────────────
// isUcapanCountdownLocked
// ─────────────────────────────────────────────
describe("isUcapanCountdownLocked", () => {
  test("future date returns true", () => {
    const future = new Date(Date.now() + 1_000_000).toISOString();
    assert.equal(isUcapanCountdownLocked(future), true);
  });

  test("past date returns false", () => {
    const past = new Date(Date.now() - 1_000_000).toISOString();
    assert.equal(isUcapanCountdownLocked(past), false);
  });

  test("null/undefined returns false", () => {
    assert.equal(isUcapanCountdownLocked(null), false);
    assert.equal(isUcapanCountdownLocked(undefined), false);
  });

  test("accepts explicit nowMs override", () => {
    const target = new Date("2027-01-01T00:00:00Z").getTime();
    const before = target - 1000;
    const after = target + 1000;
    assert.equal(
      isUcapanCountdownLocked("2027-01-01T00:00:00Z", before),
      true
    );
    assert.equal(
      isUcapanCountdownLocked("2027-01-01T00:00:00Z", after),
      false
    );
  });
});

// ─────────────────────────────────────────────
// getCountdownParts
// ─────────────────────────────────────────────
describe("getCountdownParts", () => {
  test("1 day 2 hours remaining → correct parts", () => {
    const nowMs = 0;
    const targetMs = (1 * 86400 + 2 * 3600) * 1000;
    const target = new Date(targetMs).toISOString();
    const parts = getCountdownParts(target, nowMs);
    assert.equal(parts.days, 1);
    assert.equal(parts.hours, 2);
    assert.equal(parts.minutes, 0);
    assert.equal(parts.seconds, 0);
    assert.ok(parts.total > 0);
  });

  test("past date → all zeros", () => {
    const past = new Date(Date.now() - 5000).toISOString();
    const parts = getCountdownParts(past);
    assert.equal(parts.days, 0);
    assert.equal(parts.hours, 0);
    assert.equal(parts.minutes, 0);
    assert.equal(parts.seconds, 0);
    assert.equal(parts.total, 0);
  });

  test("exactly 90 seconds → 0d 0h 1m 30s", () => {
    const nowMs = 1_000_000_000;
    const target = new Date(nowMs + 90_000).toISOString();
    const parts = getCountdownParts(target, nowMs);
    assert.equal(parts.days, 0);
    assert.equal(parts.hours, 0);
    assert.equal(parts.minutes, 1);
    assert.equal(parts.seconds, 30);
  });
});

// ─────────────────────────────────────────────
// toLocalDatetimeInputValue / fromLocalDatetimeInputValue
// ─────────────────────────────────────────────
describe("datetime-local input value helpers", () => {
  test("toLocalDatetimeInputValue produces YYYY-MM-DDTHH:MM format", () => {
    const iso = "2027-08-15T10:30:00.000Z";
    const result = toLocalDatetimeInputValue(iso);
    assert.match(result, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  test("invalid iso returns empty string", () => {
    assert.equal(toLocalDatetimeInputValue("not-valid"), "");
  });

  test("fromLocalDatetimeInputValue returns valid ISO string", () => {
    const local = "2027-08-15T17:30";
    const result = fromLocalDatetimeInputValue(local);
    assert.ok(result.includes("T"));
    assert.ok(!isNaN(Date.parse(result)));
  });

  test("fromLocalDatetimeInputValue empty input returns empty string", () => {
    assert.equal(fromLocalDatetimeInputValue(""), "");
  });
});

// ─────────────────────────────────────────────
// Serialization roundtrip: toUcapanRow → mapUcapanRow
// ─────────────────────────────────────────────
describe("unlockAt serialization roundtrip", () => {
  const baseContent = {
    templateSlug: "amplop-cinta",
    toName: "Sayang",
    fromName: "Kamu",
    title: "Test",
    message: "Hello",
    photos: [] as string[],
  };

  const baseRow: Omit<UcapanRow, "timeline"> = {
    id: "test-id",
    template_slug: "amplop-cinta",
    to_name: "Sayang",
    from_name: "Kamu",
    title: "Test",
    message: "Hello",
    photos: [],
    music_url: null,
    email: null,
    paid: true,
    paid_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  test("unlockAt survives toUcapanRow → mapUcapanRow roundtrip", () => {
    const unlockAt = "2027-12-25T08:00:00.000Z";
    const rowData = toUcapanRow({ ...baseContent, unlockAt });
    const fullRow: UcapanRow = { ...baseRow, timeline: rowData.timeline };
    const stored = mapUcapanRow(fullRow);
    assert.equal(stored.unlockAt, unlockAt);
  });

  test("absent unlockAt → undefined after mapUcapanRow", () => {
    const rowData = toUcapanRow({ ...baseContent });
    const fullRow: UcapanRow = { ...baseRow, timeline: rowData.timeline };
    const stored = mapUcapanRow(fullRow);
    assert.equal(stored.unlockAt, undefined);
  });

  test("null unlockAt → undefined after mapUcapanRow", () => {
    const rowData = toUcapanRow({ ...baseContent, unlockAt: null });
    const fullRow: UcapanRow = { ...baseRow, timeline: rowData.timeline };
    const stored = mapUcapanRow(fullRow);
    assert.equal(stored.unlockAt, undefined);
  });
});

// ─────────────────────────────────────────────
// stripPublicUcapan / stripLockedUcapan
// ─────────────────────────────────────────────
describe("strip functions preserve unlockAt", () => {
  const makeUcapan = (unlockAt?: string | null) => ({
    id: "abc",
    templateSlug: "amplop-cinta" as const,
    toName: "X",
    fromName: "Y",
    title: "",
    message: "",
    photos: [] as string[],
    paid: true,
    createdAt: Date.now(),
    email: "test@test.com",
    gateData: { pin: "1234" },
    gateType: "pin" as const,
    unlockAt: unlockAt ?? undefined,
  });

  test("stripPublicUcapan keeps unlockAt", () => {
    const unlockAt = "2028-01-01T00:00:00.000Z";
    const result = stripPublicUcapan(makeUcapan(unlockAt) as Parameters<typeof stripPublicUcapan>[0]);
    assert.equal(result.unlockAt, unlockAt);
  });

  test("stripPublicUcapan strips email", () => {
    const result = stripPublicUcapan(makeUcapan() as Parameters<typeof stripPublicUcapan>[0]);
    assert.equal(result.email, undefined);
  });

  test("stripLockedUcapan keeps unlockAt", () => {
    const unlockAt = "2028-06-01T00:00:00.000Z";
    const result = stripLockedUcapan(makeUcapan(unlockAt) as Parameters<typeof stripLockedUcapan>[0]);
    assert.equal(result.unlockAt, unlockAt);
    assert.equal(result.locked, true);
  });
});
