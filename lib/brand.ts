import {
  NORMAL_AMOUNT_LABEL,
  PROMO_AMOUNT,
  PROMO_AMOUNT_LABEL,
  PROMO_QUOTA,
} from "./pricing";

export const BRAND = {
  name: "PesanManis",
  domain: "pesanmanis.com",
  baseUrl:
    process.env.NEXT_PUBLIC_APP_URL ?? "https://pesanmanis.vercel.app",
  tagline: "Kirim rasa, bukan sekadar kata.",
  description: `Buat website ucapan personal untuk orang spesial kamu. Birthday, anniversary, love letter — kirim kejutan manis yang bikin dia tersenyum. Promo perkenalan ${PROMO_AMOUNT_LABEL} (harga normal ${NORMAL_AMOUNT_LABEL}).`,
  contactEmail: "hello@pesanmanis.com",
  supportUrl: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    ? `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent("Halo Admin PesanManis, saya butuh bantuan.")}`
    : "mailto:hello@pesanmanis.com?subject=Bantuan%20PesanManis",
  price: PROMO_AMOUNT,
  priceLabel: PROMO_AMOUNT_LABEL,
  normalPriceLabel: NORMAL_AMOUNT_LABEL,
  promoQuota: PROMO_QUOTA,
  socials: {
    instagram:
      process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://www.instagram.com",
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL ?? "https://www.tiktok.com",
  },
} as const;
