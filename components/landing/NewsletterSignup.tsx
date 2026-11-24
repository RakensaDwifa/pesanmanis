"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      toast.error("Format email tidak valid");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error("Gagal mendaftar. Coba lagi ya.");
        setStatus("idle");
        return;
      }
      setStatus("done");
      toast.success("Terima kasih! Tips & template spesial akan dikirim ke emailmu.");
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi ya.");
      setStatus("idle");
    }
  };

  return (
    <div className="w-full max-w-md">
      <p className="text-label-lg font-semibold text-on-surface mb-3 flex items-center justify-center gap-2">
        <Mail className="h-4 w-4 text-primary shrink-0" />
        <span>Dapatkan tips &amp; template spesial</span>
      </p>
      {status === "done" ? (
        <p className="text-body-md text-green-700 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Berhasil terdaftar! Cek inbox kamu nanti ya.</span>
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email kamu…"
            aria-label="Email newsletter"
            className="flex-1 min-w-0 rounded-full border border-outline-variant/60 bg-surface px-4 py-2.5 text-body-md text-on-surface placeholder:text-on-surface-variant/65 focus:outline-none focus:ring-2 focus:ring-primary/35 transition-shadow"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-primary hover:bg-[#E88048] text-white text-label-md font-semibold shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-60 cursor-pointer"
          >
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Daftar"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
