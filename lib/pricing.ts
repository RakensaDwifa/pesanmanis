// Sumber kebenaran tunggal untuk harga ucapan berbayar (PesanManis).
//
// Strategi harga Tiering 2 Level:
// - Tier "classic"   : promo Rp 8.900, normal Rp 12.900
// - Tier "signature" : promo Rp 14.900, normal Rp 24.900
// Promo berlaku untuk PROMO_QUOTA pembeli pertama yang lunas, lalu otomatis
// kembali ke harga normal masing-masing tier.
//
// Aturan penting:
// - File ini TIDAK boleh mengimpor Supabase (dipakai juga di komponen client).
// - Harga final selalu ditentukan server lewat lib/pricing-server.ts.
// - Kolom `payments.amount` wajib diisi server; jangan andalkan default DB.

export type TemplateTier = "classic" | "signature";

export const TIER_PRICING: Record<
  TemplateTier,
  { label: string; promo: number; normal: number }
> = {
  classic: {
    label: "Klasik",
    promo: 8900,
    normal: 12900,
  },
  signature: {
    label: "Signature",
    promo: 14900,
    normal: 24900,
  },
};

const SIGNATURE_TEMPLATE_SLUGS = new Set(["kaca-berembun", "bonceng-malam"]);

export function getTemplateTier(slug?: string | null): TemplateTier {
  if (!slug) return "classic";
  return SIGNATURE_TEMPLATE_SLUGS.has(slug.trim()) ? "signature" : "classic";
}

export const PROMO_AMOUNT = TIER_PRICING.classic.promo;
export const NORMAL_AMOUNT = TIER_PRICING.classic.normal;
export const SIGNATURE_PROMO_AMOUNT = TIER_PRICING.signature.promo;
export const SIGNATURE_NORMAL_AMOUNT = TIER_PRICING.signature.normal;
export const PROMO_QUOTA = 20;

export function formatPrice(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export const PROMO_AMOUNT_LABEL = formatPrice(PROMO_AMOUNT);
export const NORMAL_AMOUNT_LABEL = formatPrice(NORMAL_AMOUNT);
export const SIGNATURE_PROMO_AMOUNT_LABEL = formatPrice(SIGNATURE_PROMO_AMOUNT);
export const SIGNATURE_NORMAL_AMOUNT_LABEL = formatPrice(SIGNATURE_NORMAL_AMOUNT);

export interface PriceInfo {
  /** Harga yang harus dibayar saat ini. */
  amount: number;
  /** Harga normal tier terkait (tanpa promo). */
  normalAmount: number;
  /** Tier template yang dihitung. */
  tier: TemplateTier;
  /** Label ringkas tier untuk UI. */
  tierLabel: string;
  /** True bila masih dalam periode promo. */
  isPromo: boolean;
  /** Sisa kuota promo (0 bila promo habis). */
  remaining: number;
}

/**
 * Hitung harga aktif berdasarkan jumlah pembelian promo yang sudah lunas dan tier template.
 * Dipakai di server; jangan dipakai untuk menampilkan harga final di client
 * tanpa data dari /api/pricing.
 */
export function priceForPromoUsed(
  promoUsed: number,
  tier: TemplateTier = "classic"
): PriceInfo {
  const tierConfig = TIER_PRICING[tier] ?? TIER_PRICING.classic;
  const used = Number.isFinite(promoUsed) ? Math.max(0, Math.floor(promoUsed)) : 0;
  const remaining = Math.max(0, PROMO_QUOTA - used);
  const isPromo = remaining > 0;
  return {
    amount: isPromo ? tierConfig.promo : tierConfig.normal,
    normalAmount: tierConfig.normal,
    tier,
    tierLabel: tierConfig.label,
    isPromo,
    remaining,
  };
}

/**
 * Hitung peta harga untuk seluruh tier dalam satu pemanggilan.
 */
export function getAllTierPrices(promoUsed: number): Record<TemplateTier, PriceInfo> {
  return {
    classic: priceForPromoUsed(promoUsed, "classic"),
    signature: priceForPromoUsed(promoUsed, "signature"),
  };
}

/**
 * Harga cadangan saat kuota promo tidak bisa dihitung (mis. DB bermasalah).
 * Sengaja memilih promo agar pengguna tidak tertagih harga penuh tanpa
 * pemberitahuan, dan supaya transaksi tetap bisa diselesaikan.
 */
export const PRICE_FALLBACK: PriceInfo = priceForPromoUsed(0, "classic");

/**
 * Validasi nominal notifikasi Midtrans terhadap nominal yang tersimpan
 * di baris `payments`. Nilai kosong/0 dilewati agar transaksi lama tetap
 * bisa diproses.
 */
export function amountMatchesPaid(
  grossAmount: string | number | null | undefined,
  expectedAmount: number | null | undefined
): boolean {
  const expected = Number(expectedAmount ?? 0);
  if (!Number.isFinite(expected) || expected <= 0) return true;

  const received = Number(grossAmount ?? NaN);
  if (!Number.isFinite(received)) return false;

  // Midtrans mengirim gross_amount sebagai string desimal (contoh "8900.00").
  return Math.round(received) === Math.round(expected);
}

// ============================================================
// Katalog Add-on & Skema Bundling
// ============================================================

export const ADDON_PRICING = {
  custom_slug: {
    id: "custom_slug",
    label: "Link Cantik (Custom URL)",
    description: "Alamat personal estetik (mis. /u/ari-nadia)",
    amount: 2000,
  },
  custom_qr: {
    id: "custom_qr",
    label: "Foto di QR Code",
    description: "Tampilkan foto kenangan di tengah QR Code",
    amount: 2000,
  },
  touch_particles: {
    id: "touch_particles",
    label: "Efek Partikel Estetik",
    description: "Hujan kelopak mawar atau hati saat layar disentuh",
    amount: 2000,
  },
  intimate_gate: {
    id: "intimate_gate",
    label: "Kunci PIN & Kuis Nostalgia",
    description: "Harus jawab pertanyaan cinta sebelum surat terbuka",
    amount: 2500,
  },
  love_receipt: {
    id: "love_receipt",
    label: "Love Receipt & Sertifikat",
    description: "Struk/sertifikat cinta yang bisa diunduh ke galeri HP",
    amount: 2500,
  },
  voice_note: {
    id: "voice_note",
    label: "Voice Note (Pesan Suara)",
    description: "Rekam suara langsung atau unggah audio pesan pribadi (maks 3 menit)",
    amount: 3000,
  },
} as const;

export type AddonKey = keyof typeof ADDON_PRICING;

export const ALL_ADDON_KEYS: AddonKey[] = [
  "custom_slug",
  "custom_qr",
  "touch_particles",
  "intimate_gate",
  "love_receipt",
  "voice_note",
];

export const ALL_IN_ONE_BUNDLE_AMOUNT = 9500;
export const COMBO_ESTETIKA_AMOUNT = 3000;
export const COMBO_INTIM_AMOUNT = 3500;

export interface CheckoutPriceCalculation {
  baseAmount: number;
  addons: AddonKey[];
  addonSubtotal: number;
  discount: number;
  addonTotal: number;
  totalAmount: number;
  bundleApplied: "all_in_one" | "combos" | "none";
}

/**
 * Filter array string menjadi hanya AddonKey yang valid & unik.
 */
export function sanitizeAddons(rawAddons: unknown): AddonKey[] {
  if (!Array.isArray(rawAddons)) return [];
  const validSet = new Set<AddonKey>();
  for (const item of rawAddons) {
    if (typeof item === "string" && item in ADDON_PRICING) {
      validSet.add(item as AddonKey);
    }
  }
  return Array.from(validSet);
}

/**
 * Hitung kalkulasi rincian harga add-on dan total checkout.
 * Menerapkan diskon otomatis bundling bila syarat terpenuhi.
 */
export function calculateCheckoutTotal(
  baseAmount: number,
  rawAddons: unknown
): CheckoutPriceCalculation {
  const addons = sanitizeAddons(rawAddons);
  const base = Number.isFinite(baseAmount) ? Math.max(0, Math.floor(baseAmount)) : PROMO_AMOUNT;

  // Hitung subtotal normal tanpa diskon
  const addonSubtotal = addons.reduce((sum, key) => sum + ADDON_PRICING[key].amount, 0);

  // Cek apakah mengambil semua (All-in-One: 6 fitur)
  if (addons.length === ALL_ADDON_KEYS.length) {
    const addonTotal = ALL_IN_ONE_BUNDLE_AMOUNT;
    const discount = Math.max(0, addonSubtotal - addonTotal);
    return {
      baseAmount: base,
      addons,
      addonSubtotal,
      discount,
      addonTotal,
      totalAmount: base + addonTotal,
      bundleApplied: "all_in_one",
    };
  }

  // Cek kombo parsial
  const hasEstetikaCombo = addons.includes("custom_slug") && addons.includes("custom_qr");
  const hasIntimCombo = addons.includes("intimate_gate") && addons.includes("touch_particles");

  let addonTotal = 0;
  let bundleApplied: "all_in_one" | "combos" | "none" = "none";

  const handledKeys = new Set<AddonKey>();

  if (hasEstetikaCombo) {
    addonTotal += COMBO_ESTETIKA_AMOUNT;
    handledKeys.add("custom_slug");
    handledKeys.add("custom_qr");
    bundleApplied = "combos";
  }

  if (hasIntimCombo) {
    addonTotal += COMBO_INTIM_AMOUNT;
    handledKeys.add("intimate_gate");
    handledKeys.add("touch_particles");
    bundleApplied = "combos";
  }

  for (const key of addons) {
    if (!handledKeys.has(key)) {
      addonTotal += ADDON_PRICING[key].amount;
    }
  }

  const discount = Math.max(0, addonSubtotal - addonTotal);

  return {
    baseAmount: base,
    addons,
    addonSubtotal,
    discount,
    addonTotal,
    totalAmount: base + addonTotal,
    bundleApplied,
  };
}


/**
 * @deprecated Gunakan PROMO_AMOUNT / NORMAL_AMOUNT + priceForPromoUsed().
 * Dipertahankan hanya agar impor lama tidak rusak.
 */
export const PAID_AMOUNT = PROMO_AMOUNT;

/** @deprecated Gunakan PROMO_AMOUNT_LABEL / NORMAL_AMOUNT_LABEL. */
export const PAID_AMOUNT_LABEL = PROMO_AMOUNT_LABEL;
