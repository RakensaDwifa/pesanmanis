import assert from "node:assert/strict";
import test from "node:test";

import { SEO_TOPICS, getSeoTopic } from "../lib/seo-topics.ts";
import { getTemplate } from "../lib/templates.ts";

test("seo-topics: memiliki tepat 8 topik dengan slug unik", () => {
  assert.equal(SEO_TOPICS.length, 8);
  const slugs = new Set(SEO_TOPICS.map((t) => t.slug));
  assert.equal(slugs.size, SEO_TOPICS.length);
});

test("seo-topics: seluruh recommendedSlugs merujuk ke template aktif (bukan comingSoon)", () => {
  for (const topic of SEO_TOPICS) {
    assert.ok(topic.title.length > 10, `Title topik ${topic.slug} terlalu pendek`);
    assert.ok(topic.metaDescription.length > 30, `Meta description ${topic.slug} terlalu pendek`);
    assert.ok(topic.recommendedSlugs.length >= 2, `Topik ${topic.slug} butuh minimal 2 rekomendasi`);
    assert.ok(topic.copyableExamples.length >= 3, `Topik ${topic.slug} butuh minimal 3 contoh salin`);
    assert.ok(topic.faqs.length >= 2, `Topik ${topic.slug} butuh minimal 2 FAQ`);

    for (const tplSlug of topic.recommendedSlugs) {
      const tpl = getTemplate(tplSlug);
      assert.ok(tpl, `Template ${tplSlug} pada topik ${topic.slug} harus ada`);
      assert.equal(tpl.active, true, `Template ${tplSlug} pada topik ${topic.slug} harus active: true`);
      assert.notEqual(tpl.comingSoon, true, `Template ${tplSlug} pada topik ${topic.slug} tidak boleh comingSoon`);
    }
  }
});

test("seo-topics: getSeoTopic mengembalikan topik atau undefined dengan aman", () => {
  const bday = getSeoTopic("ulang-tahun-pacar");
  assert.ok(bday);
  assert.equal(bday.slug, "ulang-tahun-pacar");
  assert.equal(getSeoTopic("tidak-ada"), undefined);
});
