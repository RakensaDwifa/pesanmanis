import Link from "next/link";
import { BRAND } from "@/lib/brand";

// Badge halus di pojok kanan bawah yang dapat diklik penerima untuk membuat kejutan serupa.
export default function Watermark() {
  return (
    <Link
      href="/templates"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-7 right-20 z-40 select-none rounded-full bg-black/45 hover:bg-black/65 px-3 py-1 text-[11px] font-medium text-white/95 backdrop-blur-sm transition-colors whitespace-nowrap"
      title={`Buat kejutan serupa di ${BRAND.name}`}
    >
      ✨ Buat di {BRAND.name}
    </Link>
  );
}
