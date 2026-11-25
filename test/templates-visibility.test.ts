/**
 * test/templates-visibility.test.ts
 *
 * Memverifikasi visibilitas & proteksi template WIP (`bonceng-malam`):
 * - Landing carousel hanya menerima `getActiveTemplates()` (tidak termasuk WIP).
 * - Katalog `/templates` menerima `getCatalogTemplates()` termasuk `comingSoon`.
 * - Pembuatan/checkout baru (`isTemplateSelectable` / `getTemplate().active`)
 *   menolak `bonceng-malam`, tetapi slug tetap valid di `VALID_TEMPLATE_SLUGS`
 *   untuk kompatibilitas ucapan lama.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  getActiveTemplates,
  getCatalogTemplates,
  getTemplate,
  isTemplateSelectable,
} from "../lib/templates.ts";
import { VALID_TEMPLATE_SLUGS, validateUcapanInput } from "../lib/supabase/rows.ts";

test("templates: bonceng-malam ditandai comingSoon dan tidak masuk getActiveTemplates()", () => {
  const bonceng = getTemplate("bonceng-malam");
  assert.ok(bonceng, "entri bonceng-malam harus tetap ada di TEMPLATES");
  assert.equal(bonceng.active, false);
  assert.equal(bonceng.comingSoon, true);
  assert.equal(bonceng.badge, undefined);

  const activeSlugs = getActiveTemplates().map((t) => t.slug);
  assert.equal(activeSlugs.includes("bonceng-malam"), false);
  assert.equal(activeSlugs.includes("amplop-cinta"), true);
  assert.equal(activeSlugs.includes("kaca-berembun"), true);
});

test("templates: getCatalogTemplates() menyertakan bonceng-malam untuk status Segera Hadir", () => {
  const catalog = getCatalogTemplates();
  const bonceng = catalog.find((t) => t.slug === "bonceng-malam");
  assert.ok(bonceng, "bonceng-malam harus tetap tampil di katalog /templates");
  assert.equal(bonceng.comingSoon, true);
  assert.equal(bonceng.active, false);
});

test("templates: isTemplateSelectable menolak template non-aktif & mempertahankan kompatibilitas data lama", () => {
  assert.equal(isTemplateSelectable("bonceng-malam"), false);
  assert.equal(isTemplateSelectable("tidak-ada"), false);
  assert.equal(isTemplateSelectable("amplop-cinta"), true);
  assert.equal(isTemplateSelectable("kaca-berembun"), true);

  // Kompatibilitas data/row lama untuk ucapan yang sudah terlanjur memakai bonceng-malam
  assert.equal(VALID_TEMPLATE_SLUGS["bonceng-malam"], true);
  assert.equal(
    validateUcapanInput({
      templateSlug: "bonceng-malam",
      toName: "Senja",
      fromName: "Raka",
    }).valid,
    true
  );
});
