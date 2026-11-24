"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MousePointerClick, RotateCcw } from "lucide-react";
import TemplateRenderer from "@/components/templates/registry";
import type { UcapanContent } from "@/lib/types";

export default function HeroPreviewMockup({
  content,
}: {
  content: UcapanContent;
}) {
  const [opened, setOpened] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  const resetLetter = () => {
    setOpened(false);
    setReplayKey((k) => k + 1);
  };

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-primary-fixed/60 to-surface-container-highest dark:from-primary/20 dark:to-surface-container blur-2xl"
      />
      <div className="relative w-[300px] sm:w-[340px] h-[490px] sm:h-[520px] rounded-[2.5rem] border-[10px] border-white dark:border-[#3A2B24] shadow-[0_30px_80px_rgba(222,112,56,0.24)] overflow-hidden bg-surface">
        <div
          data-lenis-prevent
          data-light-card
          className="h-full w-full overflow-hidden flex items-center justify-center"
        >
          <TemplateRenderer
            key={replayKey}
            content={content}
            preview
            interactive
            onOpenChange={setOpened}
          />
        </div>

        {opened && (
          <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5">
            <button
              type="button"
              onClick={resetLetter}
              aria-label="Tutup surat dan ulangi pratinjau"
              title="Ulangi"
              className="h-8 w-8 rounded-full bg-white/95 text-[#55443C] border border-[#E6D5CB] shadow-sm grid place-items-center hover:text-primary active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <Link
              href={`/buat/${content.templateSlug}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary hover:bg-[#E88048] text-white text-[11px] font-semibold shadow-sm active:scale-95 transition-all"
            >
              Pakai ini <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      <span
        aria-hidden={opened}
        className={`pointer-events-none absolute -right-2 sm:-right-4 -top-3 rotate-6 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-[#2E241F] border border-outline-variant/30 dark:border-[#4E3930] rounded-full shadow-card text-label-md font-semibold text-on-surface transition-all duration-300 ${
          opened ? "opacity-0 scale-90" : "opacity-100 scale-100"
        }`}
      >
        <MousePointerClick className="h-3.5 w-3.5 text-primary" />
        Coba klik suratnya
      </span>
    </div>
  );
}
