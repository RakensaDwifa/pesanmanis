import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDraftAddonColumns,
  buildDraftAddonState,
  mapUcapanRow,
  stripLockedUcapan,
  stripPublicUcapan,
  type UcapanRow,
} from "../lib/supabase/rows.ts";
import { escapeCsvCell, toSafeCsv } from "../lib/csv.ts";

test("p3-trivia: buildDraftAddonState & buildDraftAddonColumns untuk mode Kuis Nostalgia", () => {
  const validState = buildDraftAddonState({
    addons: ["intimate_gate", "custom_slug"],
    customSlug: "Nabila Raka",
    gateType: "trivia",
    question: "  Tempat kencan pertama kita?  ",
    answer: "  Kedai Kopi Senja  ",
  });

  assert.deepEqual(validState, {
    addons: ["intimate_gate", "custom_slug"],
    customSlug: "nabila-raka",
    gateType: "trivia",
    pin: null,
    question: "Tempat kencan pertama kita?",
    answer: "Kedai Kopi Senja",
    particleStyle: null,
  });

  const validCols = buildDraftAddonColumns({
    addons: ["intimate_gate"],
    gateType: "trivia",
    question: "Tanggal jadian kita?",
    answer: "14 Februari",
  });
  assert.equal(validCols.gate_type, "trivia");
  assert.deepEqual(validCols.gate_data, {
    question: "Tanggal jadian kita?",
    answer: "14 Februari",
  });

  // Pertanyaan terlalu pendek (<3 karakter) atau jawaban kosong tidak boleh mengaktifkan gate
  const invalidColsShort = buildDraftAddonColumns({
    addons: ["intimate_gate"],
    gateType: "trivia",
    question: "Hi",
    answer: "Ya",
  });
  assert.equal(invalidColsShort.gate_type, null);
  assert.equal(invalidColsShort.gate_data, null);

  const invalidColsNoAnswer = buildDraftAddonColumns({
    addons: ["intimate_gate"],
    gateType: "trivia",
    question: "Makanan favoritku?",
    answer: "   ",
  });
  assert.equal(invalidColsNoAnswer.gate_type, null);
  assert.equal(invalidColsNoAnswer.gate_data, null);
});

test("p3-trivia: mapUcapanRow memulihkan draft trivia & stripLockedUcapan menyembunyikan jawaban", () => {
  const draftState = buildDraftAddonState({
    addons: ["intimate_gate"],
    gateType: "trivia",
    question: "Lagu favorit kita berdua?",
    answer: "Nadin Amizah",
  });

  const unpaidRow: UcapanRow = {
    id: "770e8400-e29b-41d4-a716-446655440000",
    template_slug: "surat-cinta",
    to_name: "Nabila",
    from_name: "Raka",
    title: "Untuk Nabila",
    message: "Pesan rahasia yang hanya terbuka kalau jawab kuis.",
    photos: ["https://demo.supabase.co/storage/v1/object/public/foto/a.webp"],
    music_url: null,
    email: "raka@example.com",
    timeline: null,
    draft_addons: draftState,
    paid: false,
    paid_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  const mappedUnpaid = mapUcapanRow(unpaidRow);
  assert.equal(mappedUnpaid.gateType, "trivia");
  assert.deepEqual(mappedUnpaid.gateData, {
    question: "Lagu favorit kita berdua?",
    answer: "Nadin Amizah",
  });

  const paidTriviaRow: UcapanRow = {
    ...unpaidRow,
    paid: true,
    paid_at: "2026-01-01T01:00:00Z",
    draft_addons: null,
    gate_type: "trivia",
    gate_data: {
      question: "Lagu favorit kita berdua?",
      answer: "Nadin Amizah",
    },
  };

  const mappedPaid = mapUcapanRow(paidTriviaRow);

  // Saat terkunci: pertanyaan tampil, jawaban + isi surat + foto + email disensor total
  const locked = stripLockedUcapan(mappedPaid);
  assert.equal(locked.locked, true);
  assert.equal(locked.gateType, "trivia");
  assert.deepEqual(locked.gateData, { question: "Lagu favorit kita berdua?" });
  assert.equal(locked.message, "");
  assert.deepEqual(locked.photos, []);
  assert.equal(locked.email, undefined);

  // Saat sudah terbuka: isi surat tampil, namun jawaban kuis & email pembuat tetap tidak dikirim ke publik
  const unlocked = stripPublicUcapan(mappedPaid);
  assert.equal(unlocked.locked, false);
  assert.equal(unlocked.message, paidTriviaRow.message);
  assert.deepEqual(unlocked.gateData, { question: "Lagu favorit kita berdua?" });
  assert.equal(unlocked.email, undefined);
});

test("p3-csv: escapeCsvCell & toSafeCsv mencegah formula injection dan patuh RFC 4180", () => {
  // Formula injection triggers harus diawali apostrof tunggal
  assert.equal(escapeCsvCell("=SUM(A1:A10)"), "'=SUM(A1:A10)");
  assert.equal(escapeCsvCell("+1+1"), "'+1+1");
  assert.equal(escapeCsvCell("-2+3"), "'-2+3");
  assert.equal(escapeCsvCell("@HYPERLINK(\"http://evil\")"), "\"'@HYPERLINK(\"\"http://evil\"\")\"");
  assert.equal(escapeCsvCell("\t=cmd|' /C calc'!A0"), "'\t=cmd|' /C calc'!A0");
  assert.equal(escapeCsvCell("  =IMPORTXML(\"http://x\",\"//a\")"), "\"'  =IMPORTXML(\"\"http://x\"\",\"\"//a\"\")\"");

  // Nilai biasa & tanda koma/kutip/baris baru
  assert.equal(escapeCsvCell(null), "");
  assert.equal(escapeCsvCell(undefined), "");
  assert.equal(escapeCsvCell(19000), "19000");
  assert.equal(escapeCsvCell("Halo, \"Sayang\""), "\"Halo, \"\"Sayang\"\"\"");
  assert.equal(escapeCsvCell("Baris 1\nBaris 2"), "\"Baris 1\nBaris 2\"");

  const csv = toSafeCsv(
    ["Ref", "Email", "Nominal"],
    [
      ["UP-001", "nabila@example.com", 8900],
      ["UP-002", "=evil@example.com", 19000],
    ]
  );
  assert.equal(
    csv,
    "Ref,Email,Nominal\r\nUP-001,nabila@example.com,8900\r\nUP-002,'=evil@example.com,19000"
  );
});
