"use client";

/**
 * InAppBrowserBanner.tsx
 *
 * Banner fixed yang muncul saat pengguna membuka halaman dari WebView
 * TikTok / Instagram / Facebook. Menyarankan mereka membuka di browser
 * eksternal agar audio autoplay, animasi, dan download QR/PNG berjalan
 * optimal.
 *
 * - Deteksi hanya di client (tidak ada hydration mismatch).
 * - Status "tutup" disimpan ke sessionStorage: tidak muncul lagi di sesi
 *   yang sama setelah pengguna menutupnya.
 * - Styling mengikuti design token PesanManis (Tailwind CSS v4):
 *     bg-surface-container / text-on-surface / border-outline-variant
 *   plus dukungan dark mode dan prefers-reduced-motion.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { X, Copy, Check } from "lucide-react";
import { detectInAppBrowser } from "@/lib/in-app-browser";

const DISMISSED_KEY = "pm:iab-banner-dismissed";
const emptySubscribe = () => () => {};

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    sessionStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    /* ignore — sessionStorage unavailable (privacy mode) */
  }
}

async function copyUrlWithFallback(url: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    /* fallback below for restricted WebViews or non-HTTPS */
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export default function InAppBrowserBanner() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  if (!isClient || dismissed || readDismissed()) return null;

  const result = detectInAppBrowser(navigator.userAgent);
  if (!result.isInApp) return null;

  const label = result.appName
    ? `Dibuka dari ${result.appName}?`
    : "Dibuka dari in-app browser?";

  const handleCopy = async () => {
    const ok = await copyUrlWithFallback(window.location.href);
    if (!ok) return;
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleDismiss = () => {
    setDismissed(true);
    writeDismissed();
  };

  return (
    /**
     * Posisi: fixed top-3, horizontal mepet ke kiri agar tidak bertumpuk
     * dengan CloseButton (top-5 right-5) dan ShareCardButton (top-16 right-5).
     * Di mobile: mengambil 100% lebar dikurangi sudut kanan (right-16).
     * Di sm+: di-center dengan max-w-md.
     */
    <div
      role="alert"
      aria-live="polite"
      className={[
        "fixed top-3 left-3 right-16",
        "sm:right-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md sm:w-full",
        "z-[60]",
        // Surface & border
        "bg-surface-container border border-outline-variant/40",
        // Shadow ringan
        "shadow-card",
        // Radius
        "rounded-2xl",
        // Padding
        "px-4 py-3",
        // Flex layout
        "flex items-start gap-3",
        // Animasi masuk — hormati prefers-reduced-motion
        "motion-safe:animate-[fadeSlideDown_0.25s_ease-out_both]",
      ].join(" ")}
    >
      {/* Konten teks */}
      <div className="flex-1 min-w-0">
        <p className="text-label-lg text-on-surface font-semibold leading-snug">
          {label}
        </p>
        <p className="text-body-md text-on-surface-variant mt-0.5 leading-snug">
          Buka di Chrome / Safari agar musik &amp; efek berjalan maksimal.
        </p>

        {/* Tombol Salin Link */}
        <button
          type="button"
          onClick={handleCopy}
          className={[
            "mt-2 inline-flex items-center gap-1.5",
            "text-label-md font-semibold rounded-full px-3 py-1",
            "transition-colors duration-150",
            copied
              ? "bg-primary/10 text-primary"
              : "bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80",
            // Aksesibilitas: ukuran ketuk minimal 36px
            "min-h-[36px]",
          ].join(" ")}
          aria-label="Salin link halaman ini"
        >
          {copied ? (
            <>
              <Check size={14} strokeWidth={2.5} aria-hidden />
              Tersalin!
            </>
          ) : (
            <>
              <Copy size={14} strokeWidth={2} aria-hidden />
              Salin Link
            </>
          )}
        </button>
      </div>

      {/* Tombol tutup */}
      <button
        type="button"
        onClick={handleDismiss}
        className={[
          "shrink-0 mt-0.5",
          "size-7 rounded-full",
          "flex items-center justify-center",
          "text-on-surface-variant",
          "hover:bg-surface-container-high transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1",
        ].join(" ")}
        aria-label="Tutup banner"
      >
        <X size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
