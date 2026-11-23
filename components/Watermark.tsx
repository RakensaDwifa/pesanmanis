import Link from "next/link";
import { BRAND } from "@/lib/brand";

// Badge halus di pojok kanan bawah yang dapat diklik penerima untuk membuat kejutan serupa.
export default function Watermark() {
  return (
    <Link
      href="/templates"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-3 right-3 z-50 select-none rounded-full bg-black/40 hover:bg-black/60 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm transition-colors"
      title={`Buat kejutan serupa di ${BRAND.name}`}
    >
      ✨ Buat di {BRAND.name}
    </Link>
  );
}
