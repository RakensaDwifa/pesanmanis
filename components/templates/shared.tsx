"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Share2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UcapanContent } from "@/lib/types";
import { AnalyticsEvents } from "@/lib/analytics";
import { getMood } from "@/lib/mood";
import { playSfx } from "@/lib/sfx";
import ParallaxBackground from "@/components/ParallaxBackground";
import CursorTrail from "@/components/CursorTrail";
import CassettePlayer from "@/components/CassettePlayer";
import SfxToggle from "@/components/SfxToggle";

const HEART_EMOJIS = ["❤️", "💖", "💕", "🌹", "✨"];

// Deterministic pseudo-random spread so SSR and client render identically with organic layout.
const HEART_PRESETS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: ((i * 29 + 11) % 94) + 3,
  delay: ((i * 1.9 + 0.4) % 9.5),
  duration: 9 + ((i * 3.1) % 8),
  size: 14 + ((i * 5.7) % 22),
  emoji: HEART_EMOJIS[i % HEART_EMOJIS.length],
}));

function FloatingHearts({ count = 12 }: { count?: number }) {
  const hearts = useMemo(() => HEART_PRESETS.slice(0, count), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {hearts.map((h) => (
        <motion.span
          key={h.id}
          className="absolute top-full select-none"
          style={{ left: `${h.left}%`, fontSize: h.size }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: "-110vh", opacity: [0, 1, 1, 0], rotate: [0, 20, -20, 0] }}
          transition={{
            duration: h.duration,
            delay: h.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {h.emoji}
        </motion.span>
      ))}
    </div>
  );
}

function CloseButton({ href }: { href?: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      aria-label="Tutup"
      className="fixed top-5 right-5 z-50 flex items-center justify-center rounded-full bg-white/85 backdrop-blur-md border border-outline-variant/40 text-on-surface-variant shadow-lg w-11 h-11 hover:scale-105 transition-transform"
    >
      <X className="h-5 w-5" />
    </a>
  );
}

/** Tombol bagikan — hanya tampil di halaman publik (/t/... atau /u/...), bukan preview builder. */
function ShareCardButton() {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const visible = Boolean(
    pathname && (pathname.startsWith("/t/") || pathname.startsWith("/u/"))
  );
  if (!visible) return null;

  const share = async () => {
    const url = window.location.href;
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: document.title, url });
        AnalyticsEvents.shareClicked("unknown", "native");
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      AnalyticsEvents.shareClicked("unknown", "clipboard");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={() => void share()}
      aria-label="Bagikan ucapan"
      title="Bagikan"
      className="fixed top-16 right-5 z-50 flex items-center justify-center rounded-full bg-white/85 backdrop-blur-md border border-outline-variant/40 text-primary shadow-lg w-11 h-11 hover:scale-105 transition-transform"
    >
      {copied ? <Check className="h-5 w-5 text-green-600" /> : <Share2 className="h-5 w-5" />}
    </button>
  );
}

interface ShellProps {
  content: UcapanContent;
  children: React.ReactNode;
  className?: string;
  closeHref?: string;
  preview?: boolean;
}

export function TemplateShell({ content, children, className, closeHref, preview }: ShellProps) {
  const mood = getMood(content.mood);
  const moodStyle = {
    background: mood.gradient,
    "--color-primary": mood.primary,
    "--color-primary-container": mood.primaryContainer,
    "--color-primary-fixed": mood.primaryFixed,
    "--color-on-primary-fixed": mood.onPrimaryFixed,
    "--color-on-primary-fixed-variant": mood.onPrimaryFixedVariant,
    "--color-surface": mood.surface,
    "--color-surface-container-low": mood.surfaceContainerLow,
    "--color-on-surface": mood.onSurface,
    "--color-on-surface-variant": mood.onSurfaceVariant,
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden flex flex-col items-center justify-center text-on-surface",
        preview ? "h-full min-h-full" : "min-h-screen",
        className
      )}
      style={moodStyle}
    >
      <ParallaxBackground mood={mood} />
      <FloatingHearts />
      {!preview && <CursorTrail />}
      <div
        className={
          preview
            ? "absolute bottom-3 left-3 z-30 flex items-center gap-2 scale-90 origin-bottom-left"
            : "fixed bottom-20 left-5 z-50 flex items-center gap-2"
        }
      >
        <CassettePlayer content={content} />
        <SfxToggle />
      </div>
      <CloseButton href={closeHref} />
      {!preview && <ShareCardButton />}
      <div
        className={cn(
          "relative z-10 w-full max-w-xl",
          preview
            ? "px-3 py-2 my-auto flex flex-col items-center justify-center"
            : "px-5 py-16"
        )}
      >
        {content.videoUrl ? <VideoBlock url={content.videoUrl} /> : null}
        {children}
      </div>
    </div>
  );
}

function parseYouTubeEmbedUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl.trim());
    const host = u.hostname.replace(/^www\./, "");
    let videoId: string | null = null;
    if (host === "youtu.be") {
      videoId = u.pathname.slice(1).split("/")[0] || null;
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") {
        videoId = u.searchParams.get("v");
      } else if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/")) {
        videoId = u.pathname.split("/")[2] || null;
      }
    }
    if (videoId && /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
    }
  } catch {
    // bukan URL valid
  }
  return null;
}

export function VideoBlock({ url }: { url: string }) {
  const ytEmbed = parseYouTubeEmbedUrl(url);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mb-6 overflow-hidden rounded-2xl border border-outline-variant/30 shadow-card bg-black/5"
    >
      {ytEmbed ? (
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={ytEmbed}
            title="Video ucapan"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>
      ) : (
        <video
          src={url}
          controls
          playsInline
          className="w-full max-h-[60vh] bg-black"
        />
      )}
    </motion.div>
  );
}

export function Signature({ fromName }: { fromName: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="text-right font-heading italic text-primary text-2xl mt-8"
    >
      — {fromName}
    </motion.p>
  );
}

export function PhotoGrid({ photos }: { photos: string[] }) {
  const validPhotos = (photos ?? []).filter((p) => typeof p === "string" && p.trim() !== "");
  if (validPhotos.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 mt-8">
      {validPhotos.map((src, i) => (
        <motion.div
          key={`${src}-${i}`}
          initial={{ opacity: 0, scale: 0.8, rotate: i % 2 === 0 ? -3 : 3 }}
          animate={{ opacity: 1, scale: 1, rotate: i % 2 === 0 ? -2 : 2 }}
          transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
          className="bg-white p-2.5 pb-4 rounded-lg shadow-card border border-outline-variant/30"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Kenangan ${i + 1}`}
            className="w-full h-36 object-cover rounded-md"
          />
        </motion.div>
      ))}
    </div>
  );
}

export function OpenButton({ onClick, label = "Buka" }: { onClick: () => void; label?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={() => {
        playSfx("pop");
        onClick();
      }}
      className="px-8 py-4 bg-primary text-white text-label-lg font-semibold rounded-full shadow-[0_8px_30px_rgba(222,112,56,0.35)]"
    >
      {label}
    </motion.button>
  );
}

export function TimelineSection({ timeline }: { timeline?: { date: string; title: string; description?: string }[] }) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-outline-variant/30">
      <h3 className="font-heading text-title-lg text-primary text-center mb-6">
        ✨ Perjalanan Cinta Kita ✨
      </h3>
      <div className="relative border-l-2 border-primary/30 ml-4 pl-6 space-y-6">
        {timeline.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
            className="relative"
          >
            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm" />
            <span className="inline-block px-3 py-1 bg-primary-fixed/40 text-primary rounded-full text-label-md font-semibold mb-1">
              {item.date}
            </span>
            <h4 className="font-heading text-title-md text-on-surface">{item.title}</h4>
            {item.description && (
              <p className="text-body-md text-on-surface-variant mt-1">{item.description}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
