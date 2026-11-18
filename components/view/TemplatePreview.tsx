"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StoryFlow from "@/components/story/StoryFlow";
import TemplateRenderer from "@/components/templates/registry";
import { getTemplate, fillContentDefaults, templateEmoji } from "@/lib/templates";
import { MOCK_CONTENT } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";

export default function TemplatePreview({ slug }: { slug: string }) {
  const [storyDone, setStoryDone] = useState(false);
  const router = useRouter();
  const t = getTemplate(slug);
  if (!t) return null;

  // Demo content, isi nama, pesan, dll default.
  const content = fillContentDefaults({ ...MOCK_CONTENT, templateSlug: slug });

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-surface relative pb-8">
      {/* Bar atas */}
      <div className="fixed top-0 inset-x-0 z-30 bg-gradient-to-b from-white/90 to-white/30 backdrop-blur transition-all flex items-center justify-between px-5 py-4 shadow-sm">
        <button
          className="text-primary font-semibold text-label-lg flex items-center gap-1.5"
          onClick={() => router.back()}
        >
          ← Kembali
        </button>
        <div className="flex-1 text-center">
          <span className="text-title-md font-bold text-on-surface mr-3">{t.name}</span>
          <span className="px-2 py-1 bg-primary-fixed/10 rounded-full text-primary text-xs font-semibold">
            {CATEGORY_META[t.type].label}
          </span>
        </div>
        <button
          className="px-4 py-2 rounded-full bg-primary text-white font-semibold shadow hover:bg-primary/90 transition"
          onClick={() => router.push(`/buat/${slug}`)}
        >
          Pakai Template Ini
        </button>
      </div>

      <div className="pt-20 w-full max-w-xl mx-auto">
        {!storyDone ? (
          <StoryFlow
            id={slug + "-demo"}
            category={t.type}
            toName={content.toName}
            persist={false}
            onDone={() => setStoryDone(true)}
          />
        ) : (
          <div className="relative">
            <TemplateRenderer content={content} preview />
            <button
              className="absolute top-3 right-3 px-3 py-1.5 bg-white/80 rounded-full border border-outline-variant/30 text-label-md font-semibold hover:bg-primary/10 transition"
              onClick={() => setStoryDone(false)}
            >
              Ulangi alur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
