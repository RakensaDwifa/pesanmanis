"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { getUcapan, savePaidUcapan } from "@/lib/store";
import { isRemote } from "@/lib/supabase/config";
import type { StoredUcapan } from "@/lib/types";
import QrCodeCard from "@/components/ui/QrCodeCard";

function SuccessInner({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<"checking" | "waiting" | "failed" | "done">("checking");
  const [copied, setCopied] = useState(false);
  const [ucapan, setUcapan] = useState<StoredUcapan | null>(() =>
    isRemote() ? null : getUcapan(id)
  );
  const [rechecking, setRechecking] = useState(false);

  const finalize = useCallback(async () => {
    let u: StoredUcapan | null = null;
    if (isRemote()) {
      try {
        const res = await fetch(`/api/ucapan/${encodeURIComponent(id)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (json?.ucapan) {
          u = json.ucapan as StoredUcapan;
        }
      } catch {
        /* ignore */
      }
      if (!u?.paid) {
        setState("waiting");
        return;
      }
      setUcapan(u);
      setState("done");
      return;
    }

    // Demo mode lokal
    u = getUcapan(id);
    if (u) {
      const activated = { ...u, paid: true, paidAt: u.paidAt ?? Date.now() };
      savePaidUcapan(activated);
      setUcapan(activated);
    }
    setState("done");
  }, [id]);

  const checkDirectUcapanStatus = useCallback(async (): Promise<boolean> => {
    if (isRemote()) {
      try {
        const res = await fetch(`/api/ucapan/${encodeURIComponent(id)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (json?.ucapan) {
          setUcapan(json.ucapan as StoredUcapan);
          if (json.ucapan.paid) {
            setState("done");
            return true;
          }
        }
      } catch {
        /* ignore */
      }
      return false;
    }

    const local = getUcapan(id);
    if (local?.paid) {
      setUcapan(local);
      setState("done");
      return true;
    }
    return false;
  }, [id]);

  const handleManualRecheck = async () => {
    setRechecking(true);
    const ref = searchParams.get("ref");
    try {
      if (ref && isRemote()) {
        const res = await fetch(`/api/payment/status?ref=${encodeURIComponent(ref)}`).then((r) =>
          r.json()
        );
        if (res.ok && res.status === "PAID") {
          await finalize();
          return;
        }
        if (res.ok && (res.status === "FAILED" || res.status === "EXPIRED")) {
          setState("failed");
          return;
        }
      }
      await checkDirectUcapanStatus();
    } finally {
      setRechecking(false);
    }
  };

  useEffect(() => {
    const demo = searchParams.get("demo");
    const ref = searchParams.get("ref");

    // ?demo=1 hanya diizinkan pada Mode Demo lokal (tidak pernah bypass di produksi/remote).
    if (demo === "1" && !isRemote()) {
      const timer = setTimeout(() => void finalize(), 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    if (ref && isRemote()) {
      const poll = async () => {
        try {
          const res = await fetch(`/api/payment/status?ref=${encodeURIComponent(ref)}`).then(
            (r) => r.json()
          );
          if (cancelled) return;
          if (res.ok && res.status === "PAID") {
            await finalize();
            return;
          }
          if (res.ok && (res.status === "FAILED" || res.status === "EXPIRED")) {
            setState("failed");
            return;
          }
        } catch {
          /* ignore network blip */
        }
        if (cancelled) return;
        const paidDirectly = await checkDirectUcapanStatus();
        if (paidDirectly || cancelled) return;
        attempts += 1;
        if (attempts < 20) {
          pollTimer = setTimeout(() => void poll(), 3000);
        } else {
          setState("waiting");
        }
      };
      void poll();
      return () => {
        cancelled = true;
        if (pollTimer) clearTimeout(pollTimer);
      };
    }

    // Tanpa ?ref=: cek langsung apakah ucapan sudah paid di database / local store
    void (async () => {
      const paid = await checkDirectUcapanStatus();
      if (!paid && !cancelled) {
        setState("waiting");
      }
    })();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [id, searchParams, finalize, checkDirectUcapanStatus]);

  if (state === "failed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-5 pt-24 pb-24 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <p className="text-headline-md text-on-surface mb-2">
          Pembayaran Belum Selesai / Kedaluwarsa
        </p>
        <p className="text-body-md text-on-surface-variant max-w-sm mb-6">
          Transaksi dibatalkan atau melewati batas waktu. Draft ucapanmu masih aman dan bisa
          dibayar ulang kapan saja.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/checkout/${id}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-label-md font-semibold shadow hover:bg-primary/90 transition"
          >
            Coba Bayar Ulang
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-surface-container-low text-on-surface text-label-md font-semibold hover:bg-surface-container transition"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (state === "checking" || state === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-5 text-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-headline-md text-on-surface mb-2">
          {state === "waiting"
            ? "Menunggu konfirmasi pembayaran…"
            : "Memeriksa status pembayaran…"}
        </p>
        <p className="text-body-md text-on-surface-variant max-w-sm mb-6">
          Halaman ini akan otomatis berubah setelah pembayaran terverifikasi. Jangan tutup
          tab ini ya.
        </p>
        {state === "waiting" && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => void handleManualRecheck()}
              disabled={rechecking}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-label-md font-semibold shadow hover:bg-primary/90 disabled:opacity-60 transition"
            >
              <RefreshCw className={`h-4 w-4 ${rechecking ? "animate-spin" : ""}`} />
              {rechecking ? "Memeriksa…" : "Cek Ulang Status"}
            </button>
            <Link
              href={`/checkout/${id}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-low text-on-surface text-label-md font-semibold hover:bg-surface-container transition"
            >
              Kembali ke Pembayaran
            </Link>
          </div>
        )}
      </div>
    );
  }

  const slugSegment = ucapan?.templateSlug || id.slice(0, 8);
  const publicUrl = ucapan?.customSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/u/${ucapan.customSlug}`
    : `${typeof window !== "undefined" ? window.location.origin : ""}/t/${slugSegment}/${id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia
    }
  };

  return (
    <div className="min-h-screen bg-surface pt-24 pb-24 lg:pb-16">
      <div className="max-w-lg mx-auto px-5 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="font-heading text-headline-lg text-primary mb-2">
          Pembayaran Berhasil! 🎉
        </h1>
        <p className="text-body-lg text-on-surface-variant mb-8">
          Kejutanmu sudah aktif selamanya. Bagikan ke dia sekarang!
        </p>

        <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-6 mb-6">
          <p className="text-label-lg font-semibold text-on-surface mb-1.5">Link Ucapan</p>
          <p className="text-body-md text-on-surface-variant break-all mb-4">{publicUrl}</p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={copyLink}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <Copy className="h-4 w-4" /> {copied ? "Tersalin!" : "Salin Link"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Hai ${ucapan?.toName || "kamu"} 💌 Aku buat halaman spesial untukmu: ${publicUrl}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#25D366] text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <MessageCircle className="h-4 w-4" /> Kirim WhatsApp
            </a>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-6 mb-6">
          <p className="text-label-lg font-semibold text-on-surface mb-4">Scan &amp; Unduh QR Code</p>
          <QrCodeCard
            url={publicUrl}
            toName={ucapan?.toName || "Kamu"}
            photoUrl={ucapan?.photos?.[0]}
            qrPhotoEnabled={ucapan?.qrPhotoEnabled}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-surface-container-low text-on-surface text-label-lg font-semibold rounded-full hover:bg-surface-container transition-colors"
          >
            <ExternalLink className="h-4 w-4" /> Buka Ucapan
          </a>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <LayoutDashboard className="h-4 w-4" /> Buka Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage({ id }: { id: string }) {
  return (
    <Suspense>
      <SuccessInner id={id} />
    </Suspense>
  );
}
