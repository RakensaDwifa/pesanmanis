"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Check, ChevronRight, Loader2, Lock,
  QrCode, Wallet, Sparkles, KeyRound, Receipt, Link2,
} from "lucide-react";
import { getUcapan } from "@/lib/store";
import { getTemplate, templateEmoji } from "@/lib/templates";
import { usePricing } from "@/lib/use-pricing";
import { ADDON_PRICING, calculateCheckoutTotal, formatPrice, type AddonKey } from "@/lib/pricing";
import type { StoredUcapan } from "@/lib/store";

const PAYMENT_METHODS = [
  { icon: "📱", name: "QRIS", note: "GoPay, OVO, DANA, ShopeePay, LinkAja & m-banking" },
  { icon: "👛", name: "GoPay", note: "E-wallet" },
  { icon: "🛍️", name: "ShopeePay", note: "E-wallet" },
  { icon: "💚", name: "OVO", note: "E-wallet" },
  { icon: "💙", name: "DANA", note: "E-wallet" },
];

const ADDON_META: Record<AddonKey, { icon: React.ElementType; note: string }> = {
  custom_slug: { icon: Link2, note: "Pilih alamat link (mis. /u/ari-nadia)" },
  custom_qr: { icon: QrCode, note: "Foto kalian di tengah QR Code" },
  touch_particles: { icon: Sparkles, note: "Efek kelopak/hati saat layar disentuh" },
  intimate_gate: { icon: KeyRound, note: "Harus jawab pertanyaan sebelum surat terbuka" },
  love_receipt: { icon: Receipt, note: "Struk cinta bisa diunduh ke galeri HP" },
};

const COMBO_BADGES: Partial<Record<AddonKey, string>> = {
  custom_slug: "Paket Estetika",
  custom_qr: "Paket Estetika",
  intimate_gate: "Paket Intim",
  touch_particles: "Paket Intim",
};

function SlugInput({
  ucapanId,
  value,
  onNormalized,
  onChange,
}: {
  ucapanId: string;
  value: string;
  onNormalized: (v: string) => void;
  onChange: (v: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [reason, setReason] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setStatus("idle");
      setReason("");
      return;
    }
    setStatus("checking");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/ucapan/check-slug?slug=${encodeURIComponent(value)}&ucapanId=${ucapanId}`
        ).then((r) => r.json());
        if (res.available) {
          setStatus("ok");
          onNormalized(res.normalized);
        } else {
          setStatus(res.reason?.includes("terlarang") ? "invalid" : "taken");
          setReason(res.reason ?? "");
          onNormalized("");
        }
      } catch {
        setStatus("idle");
        onNormalized("");
      }
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ucapanId]);

  return (
    <div className="mt-3">
      <div className="flex items-center rounded-2xl border border-outline-variant/50 overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 transition-all">
        <span className="text-xs text-gray-400 pl-3 pr-1 whitespace-nowrap">pesanmanis.com/u/</span>
        <input
          type="text"
          placeholder="ari-nadia-anniversary"
          className="flex-1 py-2.5 pr-3 text-sm outline-none bg-transparent font-medium"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={50}
        />
        <span className="pr-3 text-lg">
          {status === "checking" && <span className="text-gray-400 text-xs">⏳</span>}
          {status === "ok" && <span className="text-green-500">✓</span>}
          {(status === "taken" || status === "invalid") && <span className="text-red-500">✗</span>}
        </span>
      </div>
      {(status === "taken" || status === "invalid") && reason && (
        <p className="text-xs text-red-500 mt-1 ml-1">{reason}</p>
      )}
      {status === "ok" && (
        <p className="text-xs text-green-600 mt-1 ml-1">Alamat ini tersedia! ✨</p>
      )}
      <p className="text-xs text-gray-400 mt-1 ml-1">Hanya huruf kecil, angka, dan tanda hubung</p>
    </div>
  );
}

export default function Checkout({ id }: { id: string }) {
  const router = useRouter();
  const [ucapan, setUcapan] = useState<StoredUcapan | null>(null);
  const [loadingUcapan, setLoadingUcapan] = useState(true);
  const pricing = usePricing();
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Add-on state
  const [selectedAddons, setSelectedAddons] = useState<Set<AddonKey>>(new Set());
  const [slugInput, setSlugInput] = useState("");
  const [slugNormalized, setSlugNormalized] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [particleStyle, setParticleStyle] = useState<"hearts" | "roses" | "sparkles">("hearts");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ucapan/${id}`)
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        setUcapan(json.ucapan ?? getUcapan(id));
      })
      .catch(() => { if (!cancelled) setUcapan(getUcapan(id)); })
      .finally(() => { if (!cancelled) setLoadingUcapan(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    fetch("/api/payment/channels")
      .then((r) => r.json())
      .then((json: { demo: boolean }) => setDemoMode(json.demo))
      .catch(() => setDemoMode(true));
  }, [id]);

  const toggleAddon = (key: AddonKey) => {
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (key === "custom_slug") { setSlugInput(""); setSlugNormalized(""); }
        if (key === "intimate_gate") setPinInput("");
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (loadingUcapan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!ucapan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-5 text-center">
        <p className="text-headline-md text-on-surface mb-3">Data ucapan tidak ditemukan</p>
        <a href="/templates" className="text-primary font-semibold">Mulai dari awal</a>
      </div>
    );
  }

  const calculation = calculateCheckoutTotal(pricing.amount, Array.from(selectedAddons));
  const totalFormatted = formatPrice(calculation.totalAmount);

  const pay = async () => {
    if (selectedAddons.has("custom_slug") && !slugNormalized) {
      setError("Masukkan alamat link custom yang valid terlebih dahulu.");
      return;
    }
    if (selectedAddons.has("intimate_gate") && !/^\d{4,6}$/.test(pinInput)) {
      setError("PIN harus berupa 4–6 angka.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 900));
        router.push(`/checkout/${id}/selesai?demo=1`);
        return;
      }
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ucapanId: id,
          customerName: ucapan.fromName || "Pelanggan",
          addons: Array.from(selectedAddons),
          customSlug: slugNormalized || undefined,
          touchParticles: selectedAddons.has("touch_particles") ? particleStyle : undefined,
          gateType: selectedAddons.has("intimate_gate") ? "pin" : undefined,
          gateData: selectedAddons.has("intimate_gate") ? { pin: pinInput } : undefined,
        }),
      }).then((r) => r.json());
      if (res.ok && res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        setError(res.message ?? "Gagal membuat transaksi. Coba lagi ya.");
      }
    } finally {
      setLoading(false);
    }
  };

  const templateMeta = getTemplate(ucapan.templateSlug);

  return (
    <div className="min-h-screen bg-surface pt-20">
      <div className="max-w-lg mx-auto px-5 py-10">
        <a
          href={`/buat/${ucapan.templateSlug}`}
          className="inline-flex items-center gap-1.5 text-body-md font-semibold text-on-surface-variant hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali edit
        </a>

        <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card overflow-hidden">
          {/* Header gradient template */}
          <div
            className={`bg-gradient-to-br ${templateMeta?.gradient ?? "from-primary-fixed to-surface-container-high"} px-6 py-7 flex items-center gap-4`}
          >
            <span className="text-5xl drop-shadow-md">{templateEmoji(ucapan.templateSlug)}</span>
            <div className="min-w-0">
              <h1 className="font-heading text-title-lg text-on-surface truncate">
                {templateMeta?.name ?? ucapan.templateSlug}
              </h1>
              <p className="text-body-md text-on-surface-variant truncate">
                Untuk {ucapan.toName} · dari {ucapan.fromName || "seseorang"}
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* ── Add-on Upsell ── */}
            <div>
              <p className="text-label-lg font-semibold text-on-surface mb-3 flex items-center gap-2">
                ✨ Tingkatkan Kejutanmu{" "}
                <span className="text-xs font-normal text-on-surface-variant">(opsional)</span>
              </p>
              <div className="grid gap-2.5">
                {(Object.keys(ADDON_PRICING) as AddonKey[]).map((key) => {
                  const addon = ADDON_PRICING[key];
                  const meta = ADDON_META[key];
                  const Icon = meta.icon;
                  const checked = selectedAddons.has(key);
                  const badge = COMBO_BADGES[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleAddon(key)}
                      className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                        checked
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-outline-variant/50 bg-surface-container-low hover:border-primary/40"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                          checked ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-body-md font-semibold text-on-surface">
                            {addon.label}
                          </span>
                          {badge && (
                            <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                              {badge}
                            </span>
                          )}
                        </div>
                        <p className="text-label-md text-on-surface-variant leading-tight">{meta.note}</p>
                      </div>
                      <span className={`text-label-md font-bold whitespace-nowrap ${checked ? "text-primary" : "text-on-surface-variant"}`}>
                        +{formatPrice(addon.amount)}
                      </span>
                      {checked && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Input slug kondisional */}
              {selectedAddons.has("custom_slug") && (
                <SlugInput
                  ucapanId={id}
                  value={slugInput}
                  onChange={setSlugInput}
                  onNormalized={setSlugNormalized}
                />
              )}

              {/* Input PIN kondisional */}
              {selectedAddons.has("intimate_gate") && (
                <div className="mt-3">
                  <label className="text-xs font-semibold text-on-surface-variant ml-1">
                    PIN Rahasia (4–6 angka)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="mis. tanggal jadian 1204"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="mt-1 w-full rounded-2xl border border-outline-variant/50 px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30"
                    maxLength={6}
                  />
                  <p className="text-xs text-gray-400 mt-1 ml-1">
                    Penerima harus memasukkan PIN ini untuk membuka suratmu
                  </p>
                </div>
              )}

              {/* Selector partikel kondisional */}
              {selectedAddons.has("touch_particles") && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-on-surface-variant ml-1 mb-1.5">
                    Pilih Efek Sentuhan
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: "hearts", label: "Hati", emoji: "❤️" },
                      { key: "roses", label: "Mawar", emoji: "🌹" },
                      { key: "sparkles", label: "Kilau", emoji: "✨" },
                    ] as const).map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setParticleStyle(p.key)}
                        className={`rounded-2xl border px-2 py-2.5 text-xs font-semibold transition-all ${
                          particleStyle === p.key
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                            : "border-outline-variant/50 bg-surface-container-low text-on-surface-variant"
                        }`}
                      >
                        <span className="block text-lg mb-0.5">{p.emoji}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Badge diskon bundling */}
              {calculation.bundleApplied !== "none" && calculation.discount > 0 && (
                <div className="mt-3 rounded-2xl bg-green-50 border border-green-200 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-green-700">🎉 Diskon Paket Aktif</span>
                  <span className="text-xs font-bold text-green-700">
                    −{formatPrice(calculation.discount)}
                  </span>
                </div>
              )}

              {/* All-in-One hint */}
              {selectedAddons.size > 0 &&
                selectedAddons.size < Object.keys(ADDON_PRICING).length &&
                calculation.bundleApplied !== "all_in_one" && (
                  <button
                    type="button"
                    onClick={() => setSelectedAddons(new Set(Object.keys(ADDON_PRICING) as AddonKey[]))}
                    className="mt-2 w-full text-xs text-primary font-semibold text-center hover:underline flex items-center justify-center gap-1"
                  >
                    <ChevronRight className="h-3 w-3" />
                    Ambil semua sekaligus &amp; hemat lebih banyak
                  </button>
                )}
            </div>

            {/* ── Ringkasan harga ── */}
            <div className="rounded-2xl bg-surface-container-low p-5">
              <div className="flex justify-between text-body-md text-on-surface-variant mb-2">
                <span>Website ucapan personal</span>
                <span className="font-semibold text-on-surface">{pricing.formattedPrice}</span>
              </div>
              {calculation.addonTotal > 0 && (
                <div className="flex justify-between text-body-md text-on-surface-variant mb-2">
                  <span>Paket tambahan ({selectedAddons.size} fitur)</span>
                  <span className="font-semibold text-on-surface">
                    +{formatPrice(calculation.addonTotal)}
                    {calculation.discount > 0 && (
                      <span className="line-through text-xs text-gray-400 ml-1">
                        {formatPrice(calculation.addonSubtotal)}
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-body-md text-on-surface-variant mb-3">
                <span>Biaya layanan</span>
                <span className="font-semibold text-on-surface">Rp 0</span>
              </div>
              <div className="h-px bg-outline-variant/40 mb-3" />
              <div className="flex items-center justify-between">
                <span className="text-body-md font-medium text-on-surface">Total</span>
                <span className="text-headline-md font-bold text-primary">{totalFormatted}</span>
              </div>
            </div>

            {/* ── Metode Pembayaran ── */}
            {demoMode ? (
              <div className="rounded-2xl border border-primary/20 bg-primary-fixed/20 p-5 space-y-2">
                <p className="text-label-lg font-semibold text-primary">🧪 Mode Demo Aktif</p>
                <p className="text-body-md text-on-surface-variant">
                  Konfigurasi payment gateway belum ada, jadi pembayaran akan disimulasikan.
                  Setelah ini ucapan langsung aktif — cocok untuk uji coba alur.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-label-lg font-semibold text-on-surface mb-3 flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Metode Pembayaran
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <div
                      key={m.name}
                      className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3"
                    >
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <p className="text-body-md font-semibold text-on-surface">{m.name}</p>
                        <p className="text-label-md text-on-surface-variant">{m.note}</p>
                      </div>
                      <QrCode className="ml-auto h-5 w-5 text-primary" />
                    </div>
                  ))}
                </div>
                <p className="text-label-md text-on-surface-variant mt-3">
                  Pilih metode di halaman pembayaran setelah klik bayar.
                </p>
              </div>
            )}

            {error && (
              <p className="text-body-md text-red-600 text-center">{error}</p>
            )}

            <button
              onClick={() => void pay()}
              disabled={loading || pricing.loading}
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white text-label-lg font-semibold rounded-full shadow-[0_8px_30px_rgba(222,112,56,0.35)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Memproses…</>
              ) : (
                <><Lock className="h-4 w-4" />
                  {demoMode ? "Aktifkan Sekarang (Demo)" : `Bayar ${totalFormatted}`}
                </>
              )}
            </button>
            <p className="text-label-md text-on-surface-variant text-center flex items-center justify-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Pembayaran aman via Midtrans
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
