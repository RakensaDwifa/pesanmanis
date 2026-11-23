import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  PROMO_AMOUNT,
  NORMAL_AMOUNT,
  PROMO_QUOTA,
  priceForPromoUsed,
  amountMatchesPaid,
  formatPrice,
  calculateCheckoutTotal,
  sanitizeAddons,
  ALL_ADDON_KEYS,
} from "../lib/pricing.ts";

import { validateSlugFormat, RESERVED_SLUGS } from "../lib/slug.ts";
import { buildDraftAddonColumns } from "../lib/supabase/rows.ts";

import { verifyMidtransSignature } from "../lib/midtrans.ts";

import {
  REFERRAL_REWARD_AMOUNT,
  REFERRAL_MAX_REWARDED_PER_REFERRER,
  referralRewardFor,
} from "../lib/referral-policy.ts";

test("pricing: kalkulasi kuota promo dan harga normal", () => {
  // Awal: kuota 20, harga promo 8900
  const initial = priceForPromoUsed(0);
  assert.equal(initial.amount, PROMO_AMOUNT);
  assert.equal(initial.isPromo, true);
  assert.equal(initial.remaining, PROMO_QUOTA);

  // Tengah: 15 promo terpakai, sisa 5
  const mid = priceForPromoUsed(15);
  assert.equal(mid.amount, PROMO_AMOUNT);
  assert.equal(mid.isPromo, true);
  assert.equal(mid.remaining, 5);

  // Batas: 20 promo terpakai, kembali ke normal 19000
  const limit = priceForPromoUsed(20);
  assert.equal(limit.amount, NORMAL_AMOUNT);
  assert.equal(limit.isPromo, false);
  assert.equal(limit.remaining, 0);

  // Lewat batas: 25 pembelian, tetap normal 19000
  const over = priceForPromoUsed(25);
  assert.equal(over.amount, NORMAL_AMOUNT);
  assert.equal(over.isPromo, false);
  assert.equal(over.remaining, 0);
});

test("pricing: validasi format rupiah", () => {
  assert.equal(formatPrice(8900), "Rp 8.900");
  assert.equal(formatPrice(19000), "Rp 19.000");
});

test("pricing: pencocokan nominal gross_amount webhook", () => {
  // String desimal dari Midtrans "8900.00" vs expected 8900
  assert.equal(amountMatchesPaid("8900.00", 8900), true);
  assert.equal(amountMatchesPaid("19000", 19000), true);

  // Beda nominal: tagihan promo tapi dibayar 1000 atau sebaliknya
  assert.equal(amountMatchesPaid("8900.00", 19000), false);
  assert.equal(amountMatchesPaid("1000.00", 8900), false);

  // Nilai expected kosong/0 (transaksi legacy tanpa kolom amount) diizinkan
  assert.equal(amountMatchesPaid("8900.00", 0), true);
  assert.equal(amountMatchesPaid("8900.00", null), true);
});

test("midtrans: verifikasi signature SHA512", () => {
  const originalKey = process.env.MIDTRANS_SERVER_KEY;
  try {
    process.env.MIDTRANS_SERVER_KEY = "test-server-key-xyz";

    const orderId = "UP-TEST-123";
    const statusCode = "200";
    const grossAmount = "8900.00";

    const raw = orderId + statusCode + grossAmount + "test-server-key-xyz";
    const validSignature = crypto.createHash("sha512").update(raw).digest("hex");

    assert.equal(
      verifyMidtransSignature(orderId, statusCode, grossAmount, validSignature),
      true
    );

    assert.equal(
      verifyMidtransSignature(orderId, statusCode, grossAmount, "invalid-sig"),
      false
    );
  } finally {
    process.env.MIDTRANS_SERVER_KEY = originalKey;
  }
});

test("referral: reward 2.000 dan batas maksimal 5 reward per akun", () => {
  assert.equal(REFERRAL_REWARD_AMOUNT, 2000);
  assert.equal(REFERRAL_MAX_REWARDED_PER_REFERRER, 5);

  // Pembelian 1-5 pengundang dapat 2.000
  assert.equal(referralRewardFor(0), 2000);
  assert.equal(referralRewardFor(1), 2000);
  assert.equal(referralRewardFor(4), 2000);

  // Pembelian ke-6 dan seterusnya dibatasi (0 reward)
  assert.equal(referralRewardFor(5), 0);
  assert.equal(referralRewardFor(10), 0);
});

test("addons: sanitasi input dan kalkulasi paket bundling checkout", () => {
  // Sanitasi filter key tidak valid & duplikat
  assert.deepEqual(
    sanitizeAddons(["custom_slug", "custom_slug", "invalid_key", null, 123]),
    ["custom_slug"]
  );

  // Tanpa add-on: total = base price
  const noAddon = calculateCheckoutTotal(8900, []);
  assert.equal(noAddon.addonTotal, 0);
  assert.equal(noAddon.totalAmount, 8900);
  assert.equal(noAddon.bundleApplied, "none");

  // Satu add-on: custom_slug (2000)
  const singleAddon = calculateCheckoutTotal(8900, ["custom_slug"]);
  assert.equal(singleAddon.addonTotal, 2000);
  assert.equal(singleAddon.totalAmount, 10900);

  // Kombo Estetika: custom_slug + custom_qr (4000 -> 3000, hemat 1000)
  const comboEstetika = calculateCheckoutTotal(8900, ["custom_slug", "custom_qr"]);
  assert.equal(comboEstetika.addonSubtotal, 4000);
  assert.equal(comboEstetika.addonTotal, 3000);
  assert.equal(comboEstetika.discount, 1000);
  assert.equal(comboEstetika.totalAmount, 11900);
  assert.equal(comboEstetika.bundleApplied, "combos");

  // Kombo Intim: intimate_gate + touch_particles (4500 -> 3500, hemat 1000)
  const comboIntim = calculateCheckoutTotal(8900, ["intimate_gate", "touch_particles"]);
  assert.equal(comboIntim.addonSubtotal, 4500);
  assert.equal(comboIntim.addonTotal, 3500);
  assert.equal(comboIntim.discount, 1000);
  assert.equal(comboIntim.totalAmount, 12400);

  // All-in-One: 5 add-on sekaligus (11000 -> 7500, hemat 3500)
  const allInOne = calculateCheckoutTotal(8900, ALL_ADDON_KEYS);
  assert.equal(allInOne.addonSubtotal, 11000);
  assert.equal(allInOne.addonTotal, 7500);
  assert.equal(allInOne.discount, 3500);
  assert.equal(allInOne.totalAmount, 16400);
  assert.equal(allInOne.bundleApplied, "all_in_one");

  // All-in-One pada harga normal (19000 + 7500 = 26500)
  const allInOneNormal = calculateCheckoutTotal(19000, ALL_ADDON_KEYS);
  assert.equal(allInOneNormal.totalAmount, 26500);
});

test("slug: validasi aturan penamaan slug dan reserved words", () => {
  // Valid slug
  assert.equal(validateSlugFormat("ari-nadia").valid, true);
  assert.equal(validateSlugFormat("dimas2026").valid, true);
  assert.equal(validateSlugFormat("Surat Cinta").normalized, "surat-cinta");

  // Invalid: terlalu pendek
  assert.equal(validateSlugFormat("ab").valid, false);

  // Invalid: karakter terlarang
  assert.equal(validateSlugFormat("a@b#c$").valid, false);

  // Invalid: reserved words
  assert.equal(validateSlugFormat("admin").valid, false);
  assert.equal(validateSlugFormat("api").valid, false);
  assert.equal(validateSlugFormat("checkout").valid, false);
});

test("rows: buildDraftAddonColumns sanitasi dan reset kolom add-on", () => {
  assert.deepEqual(buildDraftAddonColumns(undefined), {});

  const full = buildDraftAddonColumns({
    addons: ["custom_slug", "custom_qr", "intimate_gate", "touch_particles", "love_receipt"],
    customSlug: "Raka Nadia",
    pin: "1402",
    particleStyle: "roses",
  });
  assert.equal(full.custom_slug, "raka-nadia");
  assert.equal(full.qr_photo_enabled, true);
  assert.equal(full.touch_particles, "roses");
  assert.equal(full.gate_type, "pin");
  assert.deepEqual(full.gate_data, { pin: "1402" });
  assert.equal(full.receipt_enabled, true);

  // Saat semua add-on dilepas, kolom di-reset ke null/false
  const cleared = buildDraftAddonColumns({ addons: [] });
  assert.equal(cleared.custom_slug, null);
  assert.equal(cleared.qr_photo_enabled, false);
  assert.equal(cleared.touch_particles, null);
  assert.equal(cleared.gate_type, null);
  assert.equal(cleared.gate_data, null);
  assert.equal(cleared.receipt_enabled, false);
});



