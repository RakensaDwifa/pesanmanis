import { createBrandOgImageResponse } from "@/lib/og-brand-image";

export const alt = "PesanManis — Kirim rasa, bukan sekadar kata.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return createBrandOgImageResponse();
}
