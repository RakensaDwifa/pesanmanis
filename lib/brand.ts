import { PAID_AMOUNT, PAID_AMOUNT_LABEL } from "./pricing";

export const BRAND = {
  name: "PesanManis",
  domain: "pesanmanis.com",
  baseUrl:
    process.env.NEXT_PUBLIC_APP_URL ?? "https://pesanmanis.vercel.app",
  tagline: "Kirim rasa, bukan sekadar kata.",
  description:
    "Buat website ucapan personal untuk orang spesial kamu. Birthday, anniversary, love letter — kirim kejutan manis yang bikin dia tersenyum. Cuma Rp 8.900.",
  contactEmail: "hello@pesanmanis.com",
  price: PAID_AMOUNT,
  priceLabel: PAID_AMOUNT_LABEL,
  socials: {
    instagram:
      process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://www.instagram.com",
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL ?? "https://www.tiktok.com",
  },
} as const;
