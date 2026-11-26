"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy, Mail, MessageCircle, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";

const MOMEN_OPTIONS = [
  "Anniversary / LDR",
  "Birthday Kejutan",
  "Hadiah Wisuda",
  "Permintaan Maaf",
  "Lainnya (Konsep Bebas)",
] as const;

const BUDGET_OPTIONS = [
  {
    value: "Rp 50.000",
    label: "Rp 50.000",
    hint: "Desain personal & animasi manis",
  },
  {
    value: "Rp 100.000",
    label: "Rp 100.000",
    hint: "Ilustrasi kustom / mini-game khusus",
  },
  {
    value: "Rp 150.000",
    label: "Rp 150.000",
    hint: "Cerita naratif penuh & interaksi unik",
  },
] as const;

type BudgetValue = (typeof BUDGET_OPTIONS)[number]["value"];

function buildBriefMessage({
  senderName,
  recipientName,
  moment,
  budget,
  notes,
}: {
  senderName: string;
  recipientName: string;
  moment: string;
  budget: string;
  notes: string;
}): string {
  return [
    `Halo Admin ${BRAND.name}! Saya mau pesan *Kado Custom* ✨`,
    "",
    `• *Nama saya:* ${senderName.trim()}`,
    `• *Untuk:* ${recipientName.trim()}`,
    `• *Momen:* ${moment}`,
    `• *Estimasi budget:* ${budget}`,
    `• *Ide / catatan konsep:*`,
    notes.trim(),
    "",
    "Boleh dibantu diskusi konsep & estimasi pengerjaannya ya?",
  ].join("\n");
}

function getWhatsAppDigits(): string {
  return (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
}

export default function CustomBriefForm() {
  const [senderName, setSenderName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [moment, setMoment] = useState<string>(MOMEN_OPTIONS[0]);
  const [budget, setBudget] = useState<BudgetValue>("Rp 100.000");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  const waDigits = getWhatsAppDigits();
  const hasWhatsApp = waDigits.length >= 8;

  const previewText =
    senderName.trim() && recipientName.trim() && notes.trim()
      ? buildBriefMessage({ senderName, recipientName, moment, budget, notes })
      : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!senderName.trim()) {
      toast.error("Isi nama kamu dulu ya");
      return;
    }
    if (!recipientName.trim()) {
      toast.error("Isi nama penerima ucapannya ya");
      return;
    }
    if (notes.trim().length < 10) {
      toast.error("Ceritakan ide singkatnya minimal 10 karakter ya");
      return;
    }

    const message = buildBriefMessage({
      senderName,
      recipientName,
      moment,
      budget,
      notes,
    });

    if (hasWhatsApp) {
      const waUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
      toast.success("Membuka WhatsApp dengan brief kamu…");
      return;
    }

    // Fallback aman jika NEXT_PUBLIC_WHATSAPP_NUMBER belum diisi
    const mailUrl = BRAND.supportUrl.startsWith("mailto:")
      ? `mailto:${BRAND.contactEmail}?subject=${encodeURIComponent(
          `Request Kado Custom — ${moment}`
        )}&body=${encodeURIComponent(message)}`
      : BRAND.supportUrl;
    window.open(mailUrl, "_blank", "noopener,noreferrer");
    toast.info("Membuka aplikasi email untuk mengirim brief kamu");
  };

  const handleCopyBrief = async () => {
    if (!previewText) {
      toast.error("Lengkapi nama dan catatan ide terlebih dahulu");
      return;
    }
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      toast.success("Teks brief tersalin ke clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin teks brief");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-container-low rounded-3xl border border-outline-variant/30 shadow-card p-6 sm:p-8 space-y-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/12 text-primary text-label-md font-bold mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Brief Mini
          </span>
          <h2 className="font-heading text-headline-md text-on-surface">
            Ceritakan Kado Impianmu
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Isi singkat di bawah — otomatis dirangkai jadi pesan siap kirim ke{" "}
            {hasWhatsApp ? "WhatsApp" : "tim"} admin.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <span className="text-label-lg font-semibold text-on-surface">
            Nama Kamu
          </span>
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            maxLength={60}
            placeholder="Mis. Raka"
            required
            className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-outline-variant/40 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-label-lg font-semibold text-on-surface">
            Untuk Siapa
          </span>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            maxLength={60}
            placeholder="Mis. Nadia (Pacar / Sahabat)"
            required
            className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-outline-variant/40 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </label>
      </div>

      <div className="space-y-2">
        <span className="block text-label-lg font-semibold text-on-surface">
          Momen / Kategori
        </span>
        <div className="flex flex-wrap gap-2">
          {MOMEN_OPTIONS.map((item) => {
            const active = moment === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setMoment(item)}
                className={`px-3.5 py-2 rounded-full text-label-md font-semibold border transition-colors motion-reduce:transition-none cursor-pointer ${
                  active
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-surface text-on-surface-variant border-outline-variant/40 hover:border-primary/40 hover:text-on-surface"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="block text-label-lg font-semibold text-on-surface">
          Estimasi Paket Budget
        </span>
        <div className="grid sm:grid-cols-3 gap-2.5">
          {BUDGET_OPTIONS.map((opt) => {
            const active = budget === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBudget(opt.value)}
                className={`text-left p-3.5 rounded-2xl border transition-all motion-reduce:transition-none cursor-pointer ${
                  active
                    ? "bg-primary-container/60 border-primary ring-2 ring-primary/20"
                    : "bg-surface border-outline-variant/40 hover:border-primary/40"
                }`}
              >
                <p className="font-heading text-title-md font-bold text-primary">
                  {opt.label}
                </p>
                <p className="text-[12px] text-on-surface-variant mt-0.5 leading-snug">
                  {opt.hint}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-label-lg font-semibold text-on-surface">
          Catatan Ide Singkat
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          maxLength={600}
          required
          placeholder="Ceritakan konsep yang kamu mau: mis. tema malam hujan dengan ilustrasi berdua naik motor, lagu favorit kalian, atau mini-game tebak kenangan..."
          className="w-full px-4 py-3 rounded-2xl bg-surface border border-outline-variant/40 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all resize-y"
        />
      </label>

      {!hasWhatsApp && (
        <p className="text-[12px] text-on-surface-variant bg-surface px-3.5 py-2.5 rounded-xl border border-outline-variant/30">
          Brief akan dikirim langsung melalui email ke{" "}
          <span className="font-semibold text-on-surface">{BRAND.contactEmail}</span>, atau kamu bisa menyalin teks brief untuk dikirim manual.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button
          type="submit"
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-primary hover:bg-[#E88048] text-white text-label-lg font-semibold shadow-[0_8px_24px_rgba(222,112,56,0.28)] hover:-translate-y-0.5 transition-all motion-reduce:transition-none cursor-pointer"
        >
          {hasWhatsApp ? (
            <>
              <MessageCircle className="h-4 w-4" />
              Kirim Brief ke WhatsApp
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Kirim Brief via Email Admin
            </>
          )}
          <Send className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => void handleCopyBrief()}
          className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full border border-outline-variant/50 bg-surface text-on-surface hover:border-primary/50 hover:text-primary text-label-md font-semibold transition-colors motion-reduce:transition-none cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              Brief Tersalin!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Salin Teks Brief
            </>
          )}
        </button>
      </div>
    </form>
  );
}
