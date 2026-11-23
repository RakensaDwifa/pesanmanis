"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Lock, QrCode, Wallet, Pencil,
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

const PARTICLE_LABELS: Record<string, string> = {
  hearts: "Hati ❤️",
  roses: "Mawar 🌹",
  sparkles: "Kilau ✨",
};

interface SavedAddons {
  addons: AddonKey[];
  customSlug?: string;
  pin?: string;
  particleStyle?: string;
}

/** Harus sama dengan addonsStorageKey() di Builder. */
function addonsStorageKey(ucapanId: string) {
  return `pm:addons:${ucapanId}`;
}

function readSavedAddons(ucapanId: string): SavedAddons | null {
  try {
    const raw = sessionStorage.getItem(addonsStorageKey(ucapanId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedAddons>;
    return {
      addons: Array.isArray(parsed.addons) ? parsed.addons : [],
      customSlug: parsed.customSlug,
      pin: parsed.pin,
      particleStyle: parsed.particleStyle,
    };
  } catch {
    return null;
  }
}

export default function Checkout({ id }: { id: string }) {
  const router = useRouter();
  const [ucapan, setUcapan] = useState<StoredUcapan | null>(null);
  const [loadingUcapan, setLoadingUcapan] = useState(true);
  const pricing = usePricing();
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedAddons>({ addons: [] });
  const [creditBalance, setCreditBalance] = useState(0);
  const [useCredits, setUseCredits] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ucapan/${id}`)
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        const u: StoredUcapan | null = json.ucapan ?? getUcapan(id);
        setUcapan(u);
        if (u?.paid) {
          router.replace(`/checkout/${id}/selesai`);
          return;
        }
        // Fallback: jika sessionStorage kosong (mis. kembali dari email abandoned cart),
        // baca konfigurasi add-on yang tersimpan di baris ucapan.
        const fromSession = readSavedAddons(id);
        if (!fromSession || fromSession.addons.length === 0) {
          const addons: AddonKey[] = [];
          if (u?.customSlug) addons.push("custom_slug");
          if (u?.qrPhotoEnabled) addons.push("custom_qr");
          if (u?.touchParticles) addons.push("touch_particles");
          if (u?.gateType) addons.push("intimate_gate");
          if (u?.receiptEnabled) addons.push("love_receipt");
          if (addons.length > 0) {
            setSaved({
              addons,
              customSlug: u?.customSlug ?? undefined,
              pin: u?.gateData?.pin ? String(u.gateData.pin) : undefined,
              particleStyle: u?.touchParticles ?? undefined,
            });
          }
        }
      })
      .catch(() => { if (!cancelled) setUcapan(getUcapan(id)); })
      .finally(() => { if (!cancelled) setLoadingUcapan(false); });
    return () => { cancelled = true; };
  }, [id, router]);

  useEffect(() => {
    setSaved(readSavedAddons(id) ?? { addons: [] });
  }, [id]);

  useEffect(() => {
    fetch("/api/payment/channels")
      .then((r) => r.json())
      .then((json: { demo: boolean }) => setDemoMode(json.demo))
      .catch(() => setDemoMode(true));

    fetch("/api/referral")
      .then((r) => r.json())
      .then((json: { ok?: boolean; stats?: { balance?: number; earned?: number } }) => {
        if (json.ok && json.stats) {
          const bal = Number(json.stats.balance ?? json.stats.earned ?? 0);
          if (bal > 0) setCreditBalance(bal);
        }
      })
      .catch(() => undefined);
  }, [id]);

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

  const calculation = calculateCheckoutTotal(pricing.amount, saved.addons);
  const MIN_PAYABLE = 1000;
  const maxCreditDiscount =
    creditBalance > 0 && calculation.totalAmount > MIN_PAYABLE
      ? Math.min(creditBalance, calculation.totalAmount - MIN_PAYABLE)
      : 0;
  const appliedCredit = useCredits ? maxCreditDiscount : 0;
  const finalPayableAmount = Math.max(MIN_PAYABLE, calculation.totalAmount - appliedCredit);
  const totalFormatted = formatPrice(finalPayableAmount);
  const selected = calculation.addons;

  const pay = async () => {
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
          addons: selected,
          customSlug: selected.includes("custom_slug") ? saved.customSlug : undefined,
          touchParticles: selected.includes("touch_particles")
            ? saved.particleStyle ?? "hearts"
            : undefined,
          gateType: selected.includes("intimate_gate") ? "pin" : undefined,
          gateData: selected.includes("intimate_gate") ? { pin: saved.pin } : undefined,
          useCredits,
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
  const editHref = `/buat/${ucapan.templateSlug}?edit=${id}`;

  return (
    <div className="min-h-screen bg-surface pt-20">
      <div className="max-w-lg mx-auto px-5 py-10">
        <a
          href={editHref}
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
            {/* ── Tambahan (read-only) ── */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-label-lg font-semibold text-on-surface">
                  ✨ Tambahan
                </p>
                <a
                  href={editHref}
                  className="inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" /> Ubah di editor
                </a>
              </div>

              {selected.length === 0 ? (
                <p className="text-body-md text-on-surface-variant rounded-2xl bg-surface-container-low px-4 py-3">
                  Tanpa add-on. Bisa ditambahkan kapan saja dari editor.
                </p>
              ) : (
                <div className="grid gap-2">
                  {selected.map((key) => (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-outline-variant/50 bg-surface-container-low px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-body-md font-semibold text-on-surface">
                          {ADDON_PRICING[key].label}
                        </p>
                        {key === "custom_slug" && saved.customSlug && (
                          <p className="text-label-md text-green-600 truncate">
                            /u/{saved.customSlug}
                          </p>
                        )}
                        {key === "intimate_gate" && (
                          <p className="text-label-md text-on-surface-variant">
                            PIN {saved.pin ? "•".repeat(saved.pin.length) : "belum diisi"}
                          </p>
                        )}
                        {key === "touch_particles" && (
                          <p className="text-label-md text-on-surface-variant">
                            {PARTICLE_LABELS[saved.particleStyle ?? "hearts"]}
                          </p>
                        )}
                      </div>
                      <span className="text-label-md font-bold text-primary whitespace-nowrap">
                        +{formatPrice(ADDON_PRICING[key].amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {calculation.bundleApplied !== "none" && calculation.discount > 0 && (
                <div className="mt-3 rounded-2xl bg-green-50 border border-green-200 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-label-md font-semibold text-green-700">🎉 Diskon Paket Aktif</span>
                  <span className="text-label-md font-bold text-green-700">
                    −{formatPrice(calculation.discount)}
                  </span>
                </div>
              )}
            </div>

            {/* ── Ringkasan harga ── */}
            <div className="rounded-2xl bg-surface-container-low p-5">
              <div className="flex justify-between text-body-md text-on-surface-variant mb-2">
                <span>Website ucapan personal</span>
                <span className="font-semibold text-on-surface">{formatPrice(calculation.baseAmount)}</span>
              </div>
              {calculation.addonTotal > 0 && (
                <div className="flex justify-between text-body-md text-on-surface-variant mb-2">
                  <span>Paket tambahan ({selected.length} fitur)</span>
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
              {maxCreditDiscount > 0 && (
                <label className="flex items-center justify-between gap-3 rounded-xl bg-green-50 border border-green-200 px-3.5 py-2.5 mb-3 cursor-pointer">
                  <span className="flex items-center gap-2 text-label-md font-semibold text-green-800">
                    <input
                      type="checkbox"
                      checked={useCredits}
                      onChange={(e) => setUseCredits(e.target.checked)}
                      className="rounded border-green-400 text-primary focus:ring-primary"
                    />
                    Pakai saldo referral ({formatPrice(creditBalance)})
                  </span>
                  <span className="text-label-md font-bold text-green-700">
                    −{formatPrice(maxCreditDiscount)}
                  </span>
                </label>
              )}
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
