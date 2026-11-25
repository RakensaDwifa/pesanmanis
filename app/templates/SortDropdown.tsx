"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import { EASE_WARM, SPRING_TACTILE } from "@/components/landing/MotionPrimitives";

export type SortOptionValue = "popular" | "newest" | "name";

interface SortOption {
  value: SortOptionValue;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { value: "popular", label: "Terpopuler" },
  { value: "newest", label: "Terbaru" },
  { value: "name", label: "Nama (A-Z)" },
];

interface SortDropdownProps {
  value: SortOptionValue;
  onChange: (value: SortOptionValue) => void;
}

export default function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(() =>
    Math.max(
      0,
      SORT_OPTIONS.findIndex((opt) => opt.value === value)
    )
  );
  const reduced = useReducedMotion();

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const currentOption =
    SORT_OPTIONS.find((opt) => opt.value === value) ?? SORT_OPTIONS[0];

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const selectOption = (nextValue: SortOptionValue) => {
    onChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        const idx = SORT_OPTIONS.findIndex((opt) => opt.value === value);
        setHighlightedIdx(idx >= 0 ? idx : 0);
      }
      return next;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        const idx = SORT_OPTIONS.findIndex((opt) => opt.value === value);
        setHighlightedIdx(idx >= 0 ? idx : 0);
        setOpen(true);
      } else {
        setHighlightedIdx((prev) => (prev + 1) % SORT_OPTIONS.length);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        const idx = SORT_OPTIONS.findIndex((opt) => opt.value === value);
        setHighlightedIdx(idx >= 0 ? idx : SORT_OPTIONS.length - 1);
        setOpen(true);
      } else {
        setHighlightedIdx(
          (prev) => (prev - 1 + SORT_OPTIONS.length) % SORT_OPTIONS.length
        );
      }
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      if (open) {
        event.preventDefault();
        const chosen = SORT_OPTIONS[highlightedIdx];
        if (chosen) selectOption(chosen.value);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className="relative shrink-0"
    >
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label="Urutkan template"
        whileHover={reduced ? undefined : { y: -1 }}
        whileTap={reduced ? undefined : { scale: 0.97 }}
        transition={SPRING_TACTILE}
        className={`w-full sm:w-auto inline-flex items-center justify-between gap-2.5 pl-3.5 pr-3 py-2.5 sm:py-2 text-xs sm:text-[13px] font-medium rounded-full bg-surface border text-on-surface cursor-pointer transition-colors ${
          open
            ? "border-primary ring-2 ring-primary/15"
            : "border-outline-variant/40 hover:border-primary/60"
        }`}
      >
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <ArrowUpDown className="h-3.5 w-3.5 text-primary/80 shrink-0" />
          <span>
            <span className="xl:hidden 2xl:inline">Urutkan: </span>
            {currentOption.label}
          </span>
        </span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={SPRING_TACTILE}
          className="inline-flex shrink-0 text-on-surface-variant/80"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listboxId}
            role="listbox"
            aria-label="Pilihan urutan template"
            data-lenis-prevent
            initial={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, y: -6, scale: 0.96 }
            }
            animate={
              reduced
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, y: -4, scale: 0.97 }
            }
            transition={{ duration: 0.2, ease: EASE_WARM }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 mt-2 w-full sm:w-[210px] z-40 rounded-2xl bg-surface border border-outline-variant/40 shadow-card-hover p-1.5 space-y-0.5 overflow-hidden"
          >
            {SORT_OPTIONS.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIdx;
              return (
                <li key={opt.value} role="presentation">
                  <motion.button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    onClick={() => selectOption(opt.value)}
                    whileTap={reduced ? undefined : { scale: 0.98 }}
                    transition={SPRING_TACTILE}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium text-left cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/12 text-primary font-semibold"
                        : isHighlighted
                          ? "bg-surface-container text-on-surface"
                          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <AnimatePresence mode="wait" initial={false}>
                      {isSelected && (
                        <motion.span
                          key="check"
                          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                          animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                          transition={SPRING_TACTILE}
                          className="inline-flex text-primary shrink-0"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
