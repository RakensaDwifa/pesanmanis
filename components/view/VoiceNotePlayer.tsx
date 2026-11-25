"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Mic, Pause, Play } from "lucide-react";
import { notifyVideoPlay, notifyVideoStop } from "@/lib/media-sync";
import { cn } from "@/lib/utils";

interface VoiceNotePlayerProps {
  url: string;
  fromName?: string;
  variant?: "floating" | "embedded";
}

function formatSec(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function VoiceNotePlayer({
  url,
  fromName,
  variant = "floating",
}: VoiceNotePlayerProps) {
  const reactId = useId();
  const sourceId = `voice-note-${reactId}`;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  useEffect(() => {
    return () => {
      notifyVideoStop(sourceId);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [sourceId, url]);

  const togglePlay = () => {
    let el = audioRef.current;
    if (!el || el.dataset.srcUrl !== url) {
      if (el) {
        el.pause();
      }
      el = new Audio(url);
      el.dataset.srcUrl = url;
      el.ontimeupdate = () => {
        if (!el) return;
        setCurrentSec(el.currentTime || 0);
        if (Number.isFinite(el.duration) && el.duration > 0) {
          setDurationSec(el.duration);
        }
      };
      el.onloadedmetadata = () => {
        if (el && Number.isFinite(el.duration) && el.duration > 0) {
          setDurationSec(el.duration);
        }
      };
      el.onpause = () => {
        setPlaying(false);
        notifyVideoStop(sourceId);
      };
      el.onended = () => {
        setPlaying(false);
        setCurrentSec(0);
        notifyVideoStop(sourceId);
      };
      audioRef.current = el;
    }

    if (playing) {
      el.pause();
      setPlaying(false);
      notifyVideoStop(sourceId);
    } else {
      notifyVideoPlay(sourceId);
      el.play()
        .then(() => {
          setPlaying(true);
        })
        .catch(() => {
          setPlaying(false);
          notifyVideoStop(sourceId);
        });
    }
  };

  const progressPct =
    durationSec > 0 ? Math.min(100, (currentSec / durationSec) * 100) : 0;

  return (
    <div
      data-light-card
      className={cn(
        "flex items-center gap-2.5 rounded-full bg-white/95 backdrop-blur-md border border-[#DE7038]/25 shadow-[0_8px_28px_rgba(36,25,20,0.12)] px-2.5 py-2 transition-all",
        variant === "floating"
          ? "fixed bottom-36 left-5 z-50 max-w-[260px] sm:max-w-[290px]"
          : "absolute bottom-14 left-3 z-20 max-w-[235px]"
      )}
    >
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Jeda pesan suara" : "Putar pesan suara"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DE7038] text-white shadow-sm hover:scale-105 transition-transform cursor-pointer"
      >
        {playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>

      <div className="min-w-0 flex-1 pr-1.5">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#3D1E0F] truncate">
          <Mic className="h-3 w-3 text-[#DE7038] shrink-0" />
          <span className="truncate">
            {fromName ? `Suara ${fromName}` : "Pesan Suara"}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="h-1 flex-1 rounded-full bg-[#DE7038]/15 overflow-hidden">
            <div
              className="h-full bg-[#DE7038] transition-all duration-150"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-[#8B5E42] shrink-0">
            {formatSec(currentSec)}
            {durationSec > 0 ? `/${formatSec(durationSec)}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
