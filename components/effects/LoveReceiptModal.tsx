"use client";

import { useEffect, useState, useRef } from "react";
import { Download, Heart, Receipt, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LoveReceiptModalProps {
  toName: string;
  fromName: string;
  dateStr?: string;
  templateSlug?: string;
  /** "embedded" → tombol menempel di dalam frame preview. */
  variant?: "floating" | "embedded";
}

function sanitizeFileSegment(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return cleaned || "spesial";
}

export default function LoveReceiptModal({
  toName,
  fromName,
  dateStr,
  variant = "floating",
}: LoveReceiptModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const parsedDate = dateStr ? new Date(dateStr) : null;
  const formattedDate =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Hari Spesial";

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  async function handleDownload() {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(receiptRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `Struk-Cinta-${sanitizeFileSegment(toName)}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error("Gagal mengunduh struk cinta. Coba lagi ya.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={
          variant === "floating"
            ? "fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-xs font-semibold text-gray-800 shadow-xl border border-rose-200/60 backdrop-blur hover:bg-rose-50 hover:text-rose-600 transition-all hover:scale-105"
            : "absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-[11px] font-semibold text-gray-800 shadow-lg border border-rose-200/60 backdrop-blur hover:bg-rose-50 hover:text-rose-600 transition-all"
        }
        title="Simpan Bukti Struk Cinta"
      >
        <Receipt className="h-4 w-4 text-rose-500" />
        <span>Struk Cinta 🧾</span>
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div
          data-lenis-prevent
          onClick={() => setIsOpen(false)}
          className={
            variant === "floating"
              ? "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
              : "absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Bukti Struk Cinta"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-neutral-100 p-5 shadow-2xl flex flex-col items-center"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Tutup struk"
              className="absolute top-4 right-4 rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-rose-500 fill-rose-500" /> Bukti Kasih Sayang
            </h4>

            {/* Receipt Container to Capture */}
            <div
              ref={receiptRef}
              data-light-card
              style={{ backgroundColor: "#ffffff", color: "#1f2937" }}
              className="w-full p-5 rounded-2xl border border-gray-200 shadow-sm font-mono text-xs text-gray-800 space-y-3"
            >
              <div className="text-center border-b border-dashed border-gray-300 pb-3">
                <p className="font-bold text-sm tracking-wider uppercase">PESANMANIS STORE</p>
                <p className="text-[10px] text-gray-400">Jl. Menuju Hatimu No. 1</p>
                <p className="text-[10px] text-gray-400 mt-1">{formattedDate}</p>
              </div>

              <div className="text-[11px] space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500 shrink-0">Penerima :</span>
                  <span className="font-bold truncate text-right">{toName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500 shrink-0">Pengirim :</span>
                  <span className="font-bold truncate text-right">{fromName}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-gray-300 py-2.5 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Cinta Tulus 100%</span>
                  <span>Rp 0</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelukan Hangat</span>
                  <span>Unlimited</span>
                </div>
                <div className="flex justify-between">
                  <span>Masa Depan Berdua</span>
                  <span>Berharga</span>
                </div>
                <div className="flex justify-between">
                  <span>Kesabaran Ekstra</span>
                  <span>Gratis</span>
                </div>
              </div>

              <div className="flex justify-between font-bold text-xs pt-1">
                <span>TOTAL HARGA</span>
                <span className="text-rose-600">TAK TERHINGGA ❤️</span>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-gray-300 text-[10px] text-gray-400 space-y-1">
                <p>Simpan struk ini sebagai jaminan cinta seumur hidup.</p>
                <p className="tracking-widest font-sans text-xs">||| | |||| | ||||| |||</p>
              </div>
            </div>

            {/* Action Download */}
            <div className="mt-4 w-full flex gap-2">
              <button
                onClick={() => void handleDownload()}
                disabled={downloading}
                className="w-full rounded-full bg-rose-500 py-3 text-xs font-semibold text-white shadow hover:bg-rose-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan Gambar…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Unduh ke Galeri HP
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
