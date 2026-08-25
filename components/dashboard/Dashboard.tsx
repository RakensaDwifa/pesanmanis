"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  CopyPlus,
  ExternalLink,
  Eye,
  Gift,
  Heart,
  LayoutGrid,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Wallet,
} from "lucide-react";
import { deleteUcapan, getViews, listUcapan } from "@/lib/store";
import { toast } from "sonner";
import { AnalyticsEvents } from "@/lib/analytics";
import { getTemplate, templateEmoji } from "@/lib/templates";
import type { StoredUcapan, ViewRecord } from "@/lib/store";

const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface RemoteUcapan extends StoredUcapan {
  views?: { count: number; firstSeen?: number; lastSeen?: number };
}

export default function Dashboard() {
  const [ucapans, setUcapans] = useState<RemoteUcapan[]>([]);
  const [demo, setDemo] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [localViews, setLocalViews] = useState<Record<string, ViewRecord>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openQr, setOpenQr] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/ucapan")
      .then(async (r) => {
        const json = await r.json();
        if (json.demo) {
          setDemo(true);
          setUcapans(listUcapan());
          const v: Record<string, ViewRecord> = {};
          for (const u of listUcapan()) {
            const rec = getViews(u.id);
            if (rec) v[u.id] = rec;
          }
          setLocalViews(v);
        } else if (json.ok) {
          setDemo(false);
          setUcapans(json.ucapans ?? []);
        }
      })
      .catch(() => {
        setDemo(true);
        setUcapans(listUcapan());
      })
      .finally(() => setLoaded(true));
  }, []);

  const remove = async (id: string) => {
    if (demo) {
      deleteUcapan(id);
      setUcapans(listUcapan());
      setLocalViews((v) => {
        const next = { ...v };
        delete next[id];
        return next;
      });
      return;
    }
    await fetch(`/api/ucapan/${id}`, { method: "DELETE" });
    setUcapans((list) => list.filter((u) => u.id !== id));
  };

  const duplicate = async (id: string) => {
    if (demo) {
      toast.info("Duplikat tersedia saat terhubung ke Supabase");
      return;
    }
    setDuplicatingId(id);
    try {
      const res = await fetch("/api/ucapan/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error("Gagal menduplikat ucapan. Coba lagi ya.");
        return;
      }
      toast.success("Kartu berhasil diduplikat");
      // Refresh list dari server
      const refreshed = await fetch("/api/ucapan");
      const rjson = await refreshed.json();
      if (rjson.ok) setUcapans(rjson.ucapans ?? []);
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi ya.");
    } finally {
      setDuplicatingId(null);
    }
  };

  const copyLink = async (id: string) => {
    const url = `${window.location.origin}/t/${id.slice(0, 8)}/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      AnalyticsEvents.shareClicked("unknown", "clipboard");
    } catch {
      // abaikan
    }
  };

  const shareCard = async (u: (typeof ucapans)[number]) => {
    const url = `${window.location.origin}/t/${u.id.slice(0, 8)}/${u.id}`;
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({
          title: u.title || "Untuk Kamu",
          text: `Sebuah kejutan untuk ${u.toName} 💝`,
          url,
        });
        AnalyticsEvents.shareClicked(u.templateSlug, "native");
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    await copyLink(u.id);
    AnalyticsEvents.shareClicked(u.templateSlug, "clipboard");
  };

  const viewOf = (u: RemoteUcapan) =>
    demo ? localViews[u.id] : u.views ?? undefined;

  if (!loaded) {
    return (
      <div className="min-h-screen bg-surface pt-24 pb-16">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10">
          <p className="text-body-md text-on-surface-variant">Memuat dashboard…</p>
        </div>
      </div>
    );
  }

  const totalViews = ucapans.reduce((acc, u) => acc + (viewOf(u)?.count ?? 0), 0);
  const activeCount = ucapans.filter((u) => u.paid).length;

  const sidebar = (
    <aside className="lg:sticky lg:top-24 self-start bg-white rounded-3xl border border-outline-variant/30 shadow-card p-6">
      <p className="text-label-md text-on-surface-variant mb-1">Hai 👋</p>
      <h1 className="font-heading text-title-lg text-on-surface mb-6">
        Dashboard Kamu
      </h1>
      <nav className="space-y-1.5 mb-6">
        <span className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-primary-fixed/40 text-primary text-label-lg font-semibold">
          <LayoutGrid className="h-4.5 w-4.5" /> Ucapan Saya
        </span>
        <Link
          href="/dashboard/referral"
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-on-surface-variant hover:bg-surface-container-low hover:text-primary text-label-lg font-semibold transition-colors"
        >
          <Gift className="h-4.5 w-4.5" /> Referral
        </Link>
      </nav>
      <Link
        href="/templates"
        className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-primary text-white text-label-lg font-semibold rounded-full shadow-[0_6px_20px_rgba(222,112,56,0.35)] hover:-translate-y-0.5 transition-all duration-200"
      >
        <Plus className="h-4 w-4" /> Buat Ucapan Baru
      </Link>
      {demo && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
          <p className="text-label-md text-amber-800 leading-relaxed">
            🧪 Mode demo — data hanya di browser ini. Sambungkan Supabase untuk
            sinkron antar perangkat.
          </p>
        </div>
      )}
    </aside>
  );

  return (
    <div className="min-h-screen bg-surface pt-24 pb-16">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10">
        {/* Sidebar — di atas untuk mobile */}
        <div className="lg:hidden mb-6">{sidebar}</div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          <div className="hidden lg:block">{sidebar}</div>

          <div>
            {/* Ringkasan */}
            {ucapans.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: "Total ucapan", value: String(ucapans.length) },
                  { label: "Aktif", value: String(activeCount) },
                  { label: "Total dilihat", value: String(totalViews) },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-white rounded-2xl border border-outline-variant/25 shadow-card px-4 py-4 text-center"
                  >
                    <p className="font-heading text-title-lg text-primary">{s.value}</p>
                    <p className="text-label-md text-on-surface-variant mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {ucapans.length === 0 ? (
              <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-14 text-center">
                <div className="w-16 h-16 rounded-full bg-primary-fixed/30 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-heading text-title-lg text-on-surface mb-2">
                  Belum ada ucapan
                </h2>
                <p className="text-body-md text-on-surface-variant mb-6 max-w-sm mx-auto">
                  Buat kejutan pertama untuk orang tersayang — cuma butuh 5 menit.
                </p>
                <Link
                  href="/templates"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md"
                >
                  Pilih Template
                </Link>
              </div>
            ) : (
              <div className="grid gap-5">
                {ucapans.map((u) => {
                  const view = viewOf(u);
                  const editOpen =
                    now - (u.paidAt ?? u.createdAt) < EDIT_WINDOW_MS;
                  const qr = openQr === u.id;
                  const url = `${window.location.origin}/t/${u.id.slice(0, 8)}/${u.id}`;
                  const meta = getTemplate(u.templateSlug);
                  return (
                    <div
                      key={u.id}
                      className="bg-white rounded-3xl border border-outline-variant/30 shadow-card overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Thumbnail template */}
                        <div
                          className={`sm:w-32 shrink-0 bg-gradient-to-br ${meta?.gradient ?? "from-primary-fixed to-surface-container-high"} flex items-center justify-center py-5 sm:py-0`}
                        >
                          <span className="text-5xl">{templateEmoji(u.templateSlug)}</span>
                        </div>

                        <div className="flex-1 p-5 md:p-6 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-heading text-title-md text-on-surface truncate">
                                  {u.title || "Untuk Kamu"}
                                </h2>
                                <span
                                  className={`text-label-md font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                                    u.paid
                                      ? "bg-green-100 text-green-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {u.paid ? "Aktif" : "Menunggu bayar"}
                                </span>
                              </div>
                              <p className="text-body-md text-on-surface-variant mt-0.5 truncate">
                                Untuk {u.toName} · dari {u.fromName} · {meta?.name ?? u.templateSlug}
                              </p>
                            </div>
                            {/* Stats inline */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-label-md font-semibold text-on-surface">
                                <Eye className="h-3.5 w-3.5 text-primary" />
                                {view ? `${view.count}×` : "0×"}
                              </span>
                            </div>
                          </div>

                          {view?.firstSeen && (
                            <p className="text-label-md text-on-surface-variant mt-2">
                              👀 Pertama dibuka{" "}
                              {new Date(view.firstSeen).toLocaleString("id-ID")}
                            </p>
                          )}

                          {/* Aksi */}
                          <div className="flex items-center gap-2 flex-wrap mt-4">
                            <button
                              onClick={() => copyLink(u.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-label-md font-semibold bg-primary text-white shadow-sm hover:-translate-y-0.5 transition-all"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copiedId === u.id ? "Tersalin!" : "Salin Link"}
                            </button>
                            <button
                              onClick={() => void shareCard(u)}
                              aria-label="Bagikan"
                              title="Bagikan"
                              className="p-2 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors"
                            >
                              <Share2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setOpenQr(qr ? null : u.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-label-md font-semibold bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors"
                            >
                              QR
                            </button>
                            <button
                              onClick={() => void duplicate(u.id)}
                              disabled={duplicatingId === u.id}
                              aria-label="Duplikat ucapan"
                              title="Duplikat ucapan ini"
                              className="p-2 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
                            >
                              <CopyPlus className="h-4 w-4" />
                            </button>
                            {u.paid && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Buka ucapan"
                                className="p-2 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            <Link
                              href={`/buat/${u.templateSlug}?edit=${u.id}`}
                              aria-label="Edit ucapan"
                              className={`p-2 rounded-full transition-colors ${
                                editOpen
                                  ? "bg-surface-container-low text-on-surface hover:bg-surface-container"
                                  : "bg-surface-container-low/50 text-on-surface-variant/50 cursor-not-allowed pointer-events-none"
                              }`}
                              title={editOpen ? "Edit ucapan" : "Masa edit 7 hari sudah habis"}
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => remove(u.id)}
                              aria-label="Hapus ucapan"
                              className="p-2 rounded-full bg-surface-container-low text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {qr && (
                            <div className="mt-4 pt-4 border-t border-outline-variant/30 flex items-center gap-6">
                              <QRCodeSVG value={url} size={130} fgColor="#241914" />
                              <div className="min-w-0">
                                <p className="text-label-lg font-semibold text-on-surface mb-1">
                                  Scan QR untuk membuka
                                </p>
                                <p className="text-body-md text-on-surface-variant break-all">
                                  {url}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
