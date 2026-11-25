"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Download,
  Flower2,
  Heart,
  Loader2,
  Mail,
  QrCode,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";

export type QrShape = "classic" | "heart" | "envelope" | "flower" | "star";

interface QrCodeCardProps {
  url: string;
  toName: string;
  photoUrl?: string | null;
  qrPhotoEnabled?: boolean;
  /** Mode ringkas untuk dipakai di kartu Dashboard. */
  compact?: boolean;
}

const QR_SHAPES: readonly {
  id: QrShape;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "classic", label: "Klasik", Icon: QrCode },
  { id: "heart", label: "Hati", Icon: Heart },
  { id: "envelope", label: "Amplop", Icon: Mail },
  { id: "flower", label: "Bunga", Icon: Flower2 },
  { id: "star", label: "Bintang", Icon: Star },
];

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

/**
 * Bingkai/siluet SVG tematik berlatar pastel dengan warna hex eksplisit
 * (aman untuk ekspor PNG `html-to-image` & dark mode `data-light-card`).
 * Berada di belakang area QR sehingga quiet zone putih tetap bersih 100%.
 */
function ShapedQrBackdrop({ shape }: { shape: Exclude<QrShape, "classic"> }) {
  if (shape === "heart") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 260 250"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
      >
        {/* Siluet hati lebar agar kotak QR + quiet zone masuk utuh tanpa memotong sudut */}
        <path
          d="M130 244 C42 204 6 154 6 88 C6 40 42 10 84 10 C106 10 122 20 130 32 C138 20 154 10 176 10 C218 10 254 40 254 88 C254 154 218 204 130 244 Z"
          fill="#fff0ec"
          stroke="#f43f5e"
          strokeWidth="4"
        />
        <path
          d="M130 232 C50 195 17 149 17 89 C17 48 48 21 85 21 C104 21 119 29 130 41 C141 29 156 21 175 21 C212 21 243 48 243 89 C243 149 210 195 130 232 Z"
          fill="none"
          stroke="#fda4af"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  if (shape === "envelope") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 260 250"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
      >
        {/* Flap atas amplop */}
        <path
          d="M14 68 L130 12 L246 68 Z"
          fill="#ffe4d6"
          stroke="#de7038"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Badan amplop */}
        <rect
          x="12"
          y="62"
          width="236"
          height="176"
          rx="20"
          fill="#fff7f2"
          stroke="#de7038"
          strokeWidth="3.5"
        />
        {/* Garis lipatan sudut bawah */}
        <path
          d="M18 230 L96 164 M242 230 L164 164"
          stroke="#ffb597"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Segel mini hati di puncak flap */}
        <circle cx="130" cy="24" r="10" fill="#de7038" />
        <path
          d="M130 29 C126 26.5 124 24.5 124 22.3 C124 20.6 125.4 19.4 127 19.4 C128.2 19.4 129.3 20 130 21 C130.7 20 131.8 19.4 133 19.4 C134.6 19.4 136 20.6 136 22.3 C136 24.5 134 26.5 130 29 Z"
          fill="#ffffff"
        />
      </svg>
    );
  }

  if (shape === "flower") {
    const petalAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 260 250"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
      >
        {petalAngles.map((deg) => (
          <ellipse
            key={deg}
            cx="130"
            cy="50"
            rx="46"
            ry="48"
            fill="#fff1f6"
            stroke="#f472b6"
            strokeWidth="3"
            transform={`rotate(${deg} 130 125)`}
          />
        ))}
        <circle
          cx="130"
          cy="125"
          r="92"
          fill="#fff8fb"
          stroke="#fbcfe8"
          strokeWidth="2.5"
        />
      </svg>
    );
  }

  // shape === "star"
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 260 250"
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
    >
      {/* Badge 8-point rounded starburst agar ruang quiet-zone tengah tetap lapang */}
      <path
        d="M130 8 L159 32 L198 22 L206 61 L243 75 L231 112 L252 145 L222 172 L228 210 L189 216 L169 245 L130 232 L91 245 L71 216 L32 210 L38 172 L8 145 L29 112 L17 75 L54 61 L62 22 L101 32 Z"
        fill="#fef9ec"
        stroke="#f59e0b"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <circle
        cx="130"
        cy="129"
        r="90"
        fill="#fffdf6"
        stroke="#fde68a"
        strokeWidth="2.5"
      />
    </svg>
  );
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
  const [qrShape, setQrShape] = useState<QrShape>("classic");

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

  const isShaped = qrShape !== "classic";
  const qrSize = isShaped ? (compact ? 94 : 118) : compact ? 136 : 180;
  const centerSize = Math.round(qrSize * 0.22);

  // Offset vertikal agar sudut quiet zone putih 100% di dalam siluet tiap bentuk
  const qrContainerOffsetClass =
    qrShape === "heart"
      ? "-mt-4"
      : qrShape === "envelope"
        ? "mt-6"
        : qrShape === "star"
          ? "mt-1"
          : "";

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
      const shapeSuffix = qrShape !== "classic" ? `${qrShape}-` : "";
      link.download = `QR-${BRAND.name}-${shapeSuffix}${sanitizeFileSegment(toName)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("QR Code PNG berhasil diunduh");
    } catch {
      toast.error("Gagal mengunduh QR Code. Coba lagi ya.");
    } finally {
      setDownloading(false);
    }
  };

  const shapeSelector = (
    <div
      role="radiogroup"
      aria-label="Pilih bentuk bingkai QR Code"
      className={
        compact
          ? "flex flex-wrap items-center gap-1.5"
          : "flex flex-wrap items-center justify-center gap-1.5"
      }
    >
      {QR_SHAPES.map(({ id, label, Icon }) => {
        const active = qrShape === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setQrShape(id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-label-md font-semibold border transition-colors motion-reduce:transition-none cursor-pointer ${
              active
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-surface-container text-on-surface-variant border-outline-variant/40 hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={
        compact
          ? "flex flex-col sm:flex-row sm:items-center gap-5"
          : "flex flex-col items-center gap-4"
      }
    >
      {/* Kartu QR siap cetak & ekspor PNG (warna hex eksplisit agar html-to-image selalu konsisten) */}
      <div
        ref={exportRef}
        data-light-card
        style={{
          backgroundColor: "#ffffff",
          color: "#241914",
          borderColor: "#d9c3b5",
        }}
        className="w-fit max-w-full mx-auto sm:mx-0 rounded-2xl border shadow-sm px-5 py-4 flex flex-col items-center text-center"
      >
        <p
          style={{ color: "#de7038" }}
          className="font-heading text-xs font-bold tracking-wide uppercase mb-2"
        >
          Untuk {toName || "Kamu"} 💌
        </p>

        {qrShape === "classic" ? (
          <div style={{ backgroundColor: "#ffffff" }} className="p-2 rounded-xl">
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
        ) : (
          <div
            className={`relative flex items-center justify-center ${
              compact ? "w-[196px] h-[188px]" : "w-[250px] h-[240px]"
            }`}
          >
            <ShapedQrBackdrop shape={qrShape} />
            {/* Quiet zone putih bersih mengelilingi seluruh modul QR */}
            <div
              style={{
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 8px rgba(36, 25, 20, 0.08)",
              }}
              className={`relative z-[1] p-1.5 rounded-xl ${qrContainerOffsetClass}`}
            >
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
          </div>
        )}

        <p style={{ color: "#55443c" }} className="text-[11px] font-medium mt-2">
          Scan untuk membuka kejutan
        </p>
        <p style={{ color: "#867366" }} className="text-[10px] mt-0.5">
          {BRAND.name}
        </p>
      </div>

      {/* Info, Pemilih Bentuk & Tombol Unduh (di luar exportRef agar tidak ikut ke PNG) */}
      <div
        className={
          compact
            ? "min-w-0 flex-1 space-y-3"
            : "flex flex-col items-center text-center space-y-3 w-full"
        }
      >
        {compact && (
          <div className="space-y-1">
            <p className="text-label-lg font-semibold text-on-surface">
              Scan QR untuk membuka
            </p>
            <p className="text-body-md text-on-surface-variant break-all">{url}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <p
            className={`text-[11px] font-medium text-on-surface-variant ${
              compact ? "text-left" : "text-center"
            }`}
          >
            Bentuk bingkai QR
          </p>
          {shapeSelector}
        </div>

        <button
          type="button"
          onClick={() => void handleDownloadPng()}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-label-md font-semibold shadow-sm hover:-translate-y-0.5 transition-all motion-reduce:transition-none disabled:opacity-60 cursor-pointer"
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
