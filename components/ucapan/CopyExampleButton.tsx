"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

export default function CopyExampleButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Contoh teks berhasil disalin");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin teks. Kamu bisa salin manual ya.");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-outline-variant/60 bg-surface hover:border-primary/60 hover:text-primary text-label-md font-semibold text-on-surface-variant transition-colors cursor-pointer shrink-0"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-700 dark:text-emerald-400">Tersalin</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span>Salin Teks</span>
        </>
      )}
    </button>
  );
}
