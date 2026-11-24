"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";

interface QrCodeCardProps {
  url: string;
  toName: string;
  photoUrl?: string | null;
  qrPhotoEnabled?: boolean;
  /** Mode ringkas untuk dipakai di kartu Dashboard. */
  compact?: boolean;
}

function sanitizeFileSegment(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return cleaned || "ucapan";
}

async function fetchImageAsDataUrl(src: string): Promise<string | null> {
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function QrCodeCard({
  url,
  toName,
  photoUrl,
  qrPhotoEnabled = false,
  compact = false,
}: QrCodeCardProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [safeCenterDataUrl, setSafeCenterDataUrl] = useState<string | null>(null);

  const shouldEmbedPhoto = Boolean(qrPhotoEnabled && photoUrl);

  // Pre-fetch center photo into a data URL so html-to-image PNG export never hits CORS canvas tainting.
  useEffect(() => {
    if (!shouldEmbedPhoto || !photoUrl) return;
    let cancelled = false;
    void fetchImageAsDataUrl(photoUrl).then((dataUrl) => {
      if (!cancelled) setSafeCenterDataUrl(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [shouldEmbedPhoto, photoUrl]);

  const effectiveCenterSrc = shouldEmbedPhoto
    ? safeCenterDataUrl ?? (photoUrl?.startsWith("data:") ? photoUrl : null)
    : null;

  const qrSize = compact ? 136 : 180;
  const centerSize = compact ? 30 : 40;

  const handleDownloadPng = async () => {
    if (!exportRef.current || downloading) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(exportRef.current, {
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `QR-${BRAND.name}-${sanitizeFileSegment(toName)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("QR Code PNG berhasil diunduh");
    } catch {
      toast.error("Gagal mengunduh QR Code. Coba lagi ya.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={
        compact
          ? "flex flex-col sm:flex-row sm:items-center gap-5"
          : "flex flex-col items-center gap-4"
      }
    >
      {/* Kartu QR siap cetak & ekspor PNG */}
      <div
        ref={exportRef}
        data-light-card
        style={{ backgroundColor: "#ffffff", color: "#241914" }}
        className="w-fit mx-auto sm:mx-0 rounded-2xl border border-outline-variant/30 shadow-sm px-5 py-4 flex flex-col items-center text-center"
      >
        <p
          style={{ color: "#de7038" }}
          className="font-heading text-xs font-bold tracking-wide uppercase mb-2"
        >
          Untuk {toName || "Kamu"} 💌
        </p>
        <div style={{ backgroundColor: "#ffffff" }} className="p-1.5 rounded-xl">
          <QRCodeSVG
            value={url}
            size={qrSize}
            level="H"
            fgColor="#241914"
            bgColor="#ffffff"
            imageSettings={
              effectiveCenterSrc
                ? {
                    src: effectiveCenterSrc,
                    height: centerSize,
                    width: centerSize,
                    excavate: true,
                  }
                : undefined
            }
          />
        </div>
        <p style={{ color: "#55443c" }} className="text-[11px] font-medium mt-2">
          Scan untuk membuka kejutan
        </p>
        <p style={{ color: "#867366" }} className="text-[10px] mt-0.5">
          {BRAND.name}
        </p>
      </div>

      {/* Info & Tombol Unduh */}
      <div className={compact ? "min-w-0 flex-1 space-y-2.5" : "text-center space-y-2"}>
        {compact && (
          <>
            <p className="text-label-lg font-semibold text-on-surface">
              Scan QR untuk membuka
            </p>
            <p className="text-body-md text-on-surface-variant break-all">{url}</p>
          </>
        )}
        <button
          type="button"
          onClick={() => void handleDownloadPng()}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-label-md font-semibold shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-60"
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan PNG…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" /> Unduh QR PNG
            </>
          )}
        </button>
      </div>
    </div>
  );
}
