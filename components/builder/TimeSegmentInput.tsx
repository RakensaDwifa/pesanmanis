"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  clampAudioBoundary,
  formatSeconds,
  parseTimeInput,
  splitMinutesSeconds,
} from "@/lib/music-library";

interface TimeSegmentInputProps {
  idPrefix: string;
  label: string;
  valueSeconds: number;
  minSeconds: number;
  maxSeconds: number;
  /** When true (e.g. custom YouTube URL with unknown duration), allows exceeding maxSeconds up to 10h. */
  allowExpandMax?: boolean;
  onChangeSeconds: (nextSeconds: number) => void;
  onHint?: (message: string | null) => void;
}

const HARD_MAX_SECONDS = 36000;

export default function TimeSegmentInput({
  idPrefix,
  label,
  valueSeconds,
  minSeconds,
  maxSeconds,
  allowExpandMax = false,
  onChangeSeconds,
  onHint,
}: TimeSegmentInputProps) {
  const minInputRef = useRef<HTMLInputElement | null>(null);
  const secInputRef = useRef<HTMLInputElement | null>(null);
  const skipBlurCommitRef = useRef(false);

  const [activeDraft, setActiveDraft] = useState<{
    part: "min" | "sec";
    value: string;
  } | null>(null);

  const { minutes, seconds } = splitMinutesSeconds(valueSeconds);
  const effectiveMax = allowExpandMax
    ? Math.max(maxSeconds, HARD_MAX_SECONDS)
    : Math.max(minSeconds, maxSeconds);
  const maxMinutes = Math.floor(effectiveMax / 60);

  const displayedMin =
    activeDraft?.part === "min"
      ? activeDraft.value
      : String(minutes).padStart(2, "0");
  const displayedSec =
    activeDraft?.part === "sec"
      ? activeDraft.value
      : String(seconds).padStart(2, "0");

  const focusSegment = (target: "min" | "sec") => {
    const el = target === "min" ? minInputRef.current : secInputRef.current;
    if (!el) return;
    el.focus();
    requestAnimationFrame(() => el.select());
  };

  const applyClamped = (candidateSeconds: number, customHint?: string | null) => {
    const { value, clamped } = clampAudioBoundary(
      candidateSeconds,
      minSeconds,
      effectiveMax
    );
    if (value !== valueSeconds) {
      onChangeSeconds(value);
    }
    if (customHint) {
      onHint?.(customHint);
    } else if (clamped === "min") {
      onHint?.(`${label} disesuaikan ke minimal ${formatSeconds(minSeconds)}.`);
    } else if (clamped === "max") {
      onHint?.(`${label} disesuaikan ke maksimal ${formatSeconds(effectiveMax)}.`);
    } else {
      onHint?.(null);
    }
  };

  const commitDraft = (draft: { part: "min" | "sec"; value: string } | null) => {
    setActiveDraft(null);
    if (!draft) return;

    const parsedNum = draft.value === "" ? 0 : Number.parseInt(draft.value, 10);
    if (!Number.isFinite(parsedNum)) return;

    if (draft.part === "min") {
      applyClamped(parsedNum * 60 + seconds);
    } else {
      const clampedSec = Math.min(59, Math.max(0, parsedNum));
      const secHint = parsedNum > 59 ? "Detik maksimal 59." : null;
      applyClamped(minutes * 60 + clampedSec, secHint);
    }
  };

  const handleMinChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, allowExpandMax ? 3 : 2);
    if (digits === "") {
      setActiveDraft({ part: "min", value: "" });
      return;
    }

    const numMin = Number.parseInt(digits, 10);
    const candidate = numMin * 60 + seconds;

    // Live sync slider immediately whenever candidate is within valid bounds
    if (candidate >= minSeconds && candidate <= effectiveMax) {
      onHint?.(null);
      if (candidate !== valueSeconds) onChangeSeconds(candidate);
    }

    // Auto-advance from minutes -> seconds when 2 digits entered, or single digit cannot start a valid 2-digit minute
    const cannotHaveSecondDigit =
      !allowExpandMax && digits.length === 1 && numMin > 0 && numMin * 10 > maxMinutes;
    const shouldAdvance = digits.length >= 2 || cannotHaveSecondDigit;

    if (shouldAdvance) {
      const { value, clamped } = clampAudioBoundary(
        candidate,
        minSeconds,
        effectiveMax
      );
      skipBlurCommitRef.current = true;
      setActiveDraft(null);
      if (value !== valueSeconds) onChangeSeconds(value);
      if (clamped === "min") {
        onHint?.(`${label} disesuaikan ke minimal ${formatSeconds(minSeconds)}.`);
      } else if (clamped === "max") {
        onHint?.(`${label} disesuaikan ke maksimal ${formatSeconds(effectiveMax)}.`);
      } else {
        onHint?.(null);
      }
      requestAnimationFrame(() => focusSegment("sec"));
      return;
    }

    setActiveDraft({ part: "min", value: digits });
  };

  const handleSecChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    if (digits === "") {
      setActiveDraft({ part: "sec", value: "" });
      return;
    }

    const parsedSec = Number.parseInt(digits, 10);
    const clampedSec = Math.min(59, parsedSec);
    const hitSecCap = parsedSec > 59;
    const displayDigits = hitSecCap ? "59" : digits;

    const candidate = minutes * 60 + clampedSec;
    if (candidate >= minSeconds && candidate <= effectiveMax) {
      onHint?.(hitSecCap ? "Detik maksimal 59." : null);
      if (candidate !== valueSeconds) onChangeSeconds(candidate);
    } else if (hitSecCap) {
      onHint?.("Detik maksimal 59.");
    }

    setActiveDraft({ part: "sec", value: displayDigits });
  };

  const stepBy = (deltaSeconds: number) => {
    setActiveDraft(null);
    applyClamped(valueSeconds + deltaSeconds);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").trim();
    if (!text) return;
    if (text.includes(":") || /[a-z]/i.test(text)) {
      const parsed = parseTimeInput(text);
      if (parsed !== null) {
        e.preventDefault();
        setActiveDraft(null);
        applyClamped(parsed);
      }
    }
  };

  const blockNonDigitKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key.length === 1 && !/^\d$/.test(e.key)) {
      e.preventDefault();
      return true;
    }
    return false;
  };

  const handleMinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ":" || e.key === ".") {
      e.preventDefault();
      skipBlurCommitRef.current = true;
      commitDraft(activeDraft);
      requestAnimationFrame(() => focusSegment("sec"));
      return;
    }
    if (
      e.key === "ArrowRight" &&
      e.currentTarget.selectionStart === e.currentTarget.value.length &&
      e.currentTarget.selectionEnd === e.currentTarget.value.length
    ) {
      e.preventDefault();
      skipBlurCommitRef.current = true;
      commitDraft(activeDraft);
      requestAnimationFrame(() => focusSegment("sec"));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepBy(60);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      stepBy(-60);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      skipBlurCommitRef.current = true;
      commitDraft(activeDraft);
      requestAnimationFrame(() => focusSegment("sec"));
      return;
    }
    blockNonDigitKey(e);
  };

  const handleSecKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const atStartCollapsed =
      e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0;
    if (
      (e.key === "Backspace" && (e.currentTarget.value === "" || atStartCollapsed)) ||
      (e.key === "ArrowLeft" && atStartCollapsed)
    ) {
      e.preventDefault();
      skipBlurCommitRef.current = true;
      commitDraft(activeDraft);
      requestAnimationFrame(() => focusSegment("min"));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepBy(1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      stepBy(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      skipBlurCommitRef.current = true;
      commitDraft(activeDraft);
      e.currentTarget.blur();
      return;
    }
    blockNonDigitKey(e);
  };

  const handleSegmentBlur = () => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      return;
    }
    commitDraft(activeDraft);
  };

  return (
    <div>
      <label
        htmlFor={`${idPrefix}-min`}
        className="block text-[11px] font-semibold text-on-surface-variant mb-1"
      >
        {label}
      </label>
      <div
        role="group"
        aria-label={`${label} (menit dan detik)`}
        onClick={(e) => {
          if (e.target !== secInputRef.current && e.target !== minInputRef.current) {
            focusSegment("min");
          }
        }}
        className={cn(
          "flex items-center justify-center gap-1 rounded-xl border border-outline-variant/75 bg-surface px-2.5 py-2 transition-all cursor-text",
          "focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/25"
        )}
      >
        <div className="flex items-baseline gap-0.5">
          <input
            ref={minInputRef}
            id={`${idPrefix}-min`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            aria-label={`${label} menit`}
            value={displayedMin}
            onFocus={(e) => {
              setActiveDraft({ part: "min", value: String(minutes).padStart(2, "0") });
              e.currentTarget.select();
            }}
            onChange={(e) => handleMinChange(e.target.value)}
            onBlur={handleSegmentBlur}
            onKeyDown={handleMinKeyDown}
            onPaste={handlePaste}
            className="w-7 bg-transparent text-center font-mono text-sm font-bold text-on-surface tabular-nums focus:outline-none selection:bg-primary/25"
          />
          <span className="text-[10px] font-medium text-on-surface-variant/75 select-none">
            mnt
          </span>
        </div>

        <span
          aria-hidden
          className="font-mono text-sm font-bold text-on-surface-variant/65 select-none px-0.5"
        >
          :
        </span>

        <div className="flex items-baseline gap-0.5">
          <input
            ref={secInputRef}
            id={`${idPrefix}-sec`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            aria-label={`${label} detik`}
            value={displayedSec}
            onFocus={(e) => {
              setActiveDraft({ part: "sec", value: String(seconds).padStart(2, "0") });
              e.currentTarget.select();
            }}
            onChange={(e) => handleSecChange(e.target.value)}
            onBlur={handleSegmentBlur}
            onKeyDown={handleSecKeyDown}
            onPaste={handlePaste}
            className="w-7 bg-transparent text-center font-mono text-sm font-bold text-on-surface tabular-nums focus:outline-none selection:bg-primary/25"
          />
          <span className="text-[10px] font-medium text-on-surface-variant/75 select-none">
            dtk
          </span>
        </div>
      </div>
    </div>
  );
}
