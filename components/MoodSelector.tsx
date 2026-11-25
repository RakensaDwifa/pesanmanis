"use client";

import type { MoodKey } from "@/lib/mood";
import { MOOD_LIST } from "@/lib/mood";
import { cn } from "@/lib/utils";

export default function MoodSelector({
  value,
  onChange,
}: {
  value?: MoodKey;
  onChange: (m: MoodKey) => void;
}) {
  return (
    <div>
      <label className="block text-label-lg font-semibold text-on-surface mb-2">
        Gaya &amp; Mood Tampilan
      </label>
      <div className="flex flex-wrap gap-2">
        {MOOD_LIST.map((m) => {
          const active = value === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onChange(m.key)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-label-md font-semibold transition-all cursor-pointer",
                active
                  ? "border-transparent text-white shadow-md"
                  : "border-outline-variant/60 bg-surface text-on-surface-variant hover:border-primary/40",
              )}
              style={active ? { background: m.primary } : undefined}
            >
              <span aria-hidden>{m.emoji}</span>
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="text-label-md text-on-surface-variant mt-2">
        Pilih warna &amp; suasana ucapanmu. Bisa diganti kapan saja.
      </p>
    </div>
  );
}
