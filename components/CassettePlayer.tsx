"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";
import type { UcapanContent } from "@/lib/types";
import { playSfx } from "@/lib/sfx";

export default function CassettePlayer({ content }: { content: UcapanContent }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | undefined>(content.musicUrl);

  // Sync audio element when musicUrl changes (e.g. switching tracks inside Builder Live Preview).
  useEffect(() => {
    const prevUrl = currentUrlRef.current;
    currentUrlRef.current = content.musicUrl;
    if (prevUrl === content.musicUrl) return;

    const existing = audioRef.current;
    if (!existing) return;

    const wasPlaying = !existing.paused;
    existing.pause();

    if (!content.musicUrl) {
      existing.src = "";
      audioRef.current = null;
      return;
    }

    existing.src = content.musicUrl;
    existing.load();
    if (wasPlaying) {
      existing.play().catch(() => {
        setPlaying(false);
      });
    }
  }, [content.musicUrl]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  if (!content.musicUrl) return null;

  const toggle = () => {
    let el = audioRef.current;
    if (!el) {
      el = new Audio(content.musicUrl);
      el.loop = true;
      audioRef.current = el;
    }

    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play()
        .then(() => {
          setPlaying(true);
          playSfx("pop");
        })
        .catch(() => {
          setPlaying(false);
        });
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/85 backdrop-blur-md border border-outline-variant/40 shadow-lg pl-2 pr-3 py-2">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        title={playing ? "Jeda musik" : "Putar musik"}
        className="flex items-center justify-center rounded-xl bg-primary text-white w-10 h-10 shrink-0 hover:scale-105 active:scale-95 transition-transform"
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1.5">
          <motion.span
            className="block w-3 h-3 rounded-full"
            style={{ background: "conic-gradient(var(--color-primary-fixed) 0 25%, var(--color-primary) 0 50%, var(--color-primary-fixed) 0 75%, var(--color-primary) 0)" }}
            animate={playing ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
          <span className="w-8 h-0.5 rounded bg-outline-variant" />
          <motion.span
            className="block w-3 h-3 rounded-full"
            style={{ background: "conic-gradient(var(--color-primary-fixed) 0 25%, var(--color-primary) 0 50%, var(--color-primary-fixed) 0 75%, var(--color-primary) 0)" }}
            animate={playing ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <span className="text-[10px] leading-none text-on-surface-variant mt-1">musik</span>
      </div>
    </div>
  );
}
