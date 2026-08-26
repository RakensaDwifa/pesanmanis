import { BRAND } from "@/lib/brand";

// Watermark tipis untuk ucapan versi Free (tanpa musik/video).
// Fixed di pojok kanan bawah, tidak mengganggu interaksi (pointer-events-none).
export default function Watermark() {
  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-50 select-none rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
      ✨ {BRAND.name}
    </div>
  );
}
