import {
  NORMAL_AMOUNT_LABEL,
  PROMO_AMOUNT,
  PROMO_AMOUNT_LABEL,
  PROMO_QUOTA,
  SIGNATURE_NORMAL_AMOUNT_LABEL,
  SIGNATURE_PROMO_AMOUNT,
  SIGNATURE_PROMO_AMOUNT_LABEL,
} from "./pricing";
import { normalizeBaseUrl } from "./validation";

const BRAND_DOMAIN = "pesanmanis.web.id";
const CONTACT_EMAIL = `hello@${BRAND_DOMAIN}`;

export const BRAND = {
  name: "PesanManis",
  domain: BRAND_DOMAIN,
  baseUrl: normalizeBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL,
    `https://${BRAND_DOMAIN}`
  ),
  tagline: "Kirim rasa, bukan sekadar kata.",
  description: `Buat website ucapan personal untuk orang spesial kamu. Birthday, anniversary, love letter — kirim kejutan manis yang bikin dia tersenyum. Harga promo perkenalan mulai ${PROMO_AMOUNT_LABEL} (harga normal mulai ${NORMAL_AMOUNT_LABEL}).`,
  contactEmail: CONTACT_EMAIL,
  supportUrl: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    ? `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent("Halo Admin PesanManis, saya butuh bantuan.")}`
    : `mailto:${CONTACT_EMAIL}?subject=Bantuan%20PesanManis`,
  price: PROMO_AMOUNT,
  priceLabel: PROMO_AMOUNT_LABEL,
  normalPriceLabel: NORMAL_AMOUNT_LABEL,
  signaturePrice: SIGNATURE_PROMO_AMOUNT,
  signaturePriceLabel: SIGNATURE_PROMO_AMOUNT_LABEL,
  signatureNormalPriceLabel: SIGNATURE_NORMAL_AMOUNT_LABEL,
  promoQuota: PROMO_QUOTA,
  socials: {
    instagram:
      process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com",
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL || "https://www.tiktok.com",
  },
} as const;
