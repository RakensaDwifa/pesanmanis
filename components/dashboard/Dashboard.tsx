"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Copy,
  CopyPlus,
  ExternalLink,
  Eye,
  Gift,
  LayoutGrid,
  Pencil,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
  Wallet,
} from "lucide-react";
import { deleteUcapan, getViews, listUcapan } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { isRemote } from "@/lib/supabase/config";
import { toast } from "sonner";
import { AnalyticsEvents } from "@/lib/analytics";
import { getTemplate, templateEmoji } from "@/lib/templates";
import type { StoredUcapan, ViewRecord } from "@/lib/store";
import QrCodeCard from "@/components/ui/QrCodeCard";

const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface RemoteUcapan extends StoredUcapan {
  reactions?: Record<string, number>;
  replies?: { fromName: string; message: string; createdAt: string }[];
}

function publicUrlFor(u: RemoteUcapan): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (u.paid && u.customSlug) {
    return `${origin}/u/${u.customSlug}`;
  }
  const slug = u.templateSlug || u.id.slice(0, 8);
  return `${origin}/t/${slug}/${u.id}`;
}

export default function Dashboard() {
  const [ucapans, setUcapans] = useState<RemoteUcapan[]>([]);
  const [demo, setDemo] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [localViews, setLocalViews] = useState<Record<string, ViewRecord>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openQr, setOpenQr] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [realtimeLive, setRealtimeLive] = useState(false);
  const [now] = useState(() => Date.now());
  const lastViewToastRef = useRef<Map<string, number>>(new Map());
  const ucapansRef = useRef<RemoteUcapan[]>(ucapans);

  useEffect(() => {
    ucapansRef.current = ucapans;
  }, [ucapans]);

  const idSignature = useMemo(
    () =>
      ucapans
        .map((u) => u.id)
        .sort()
        .join(","),
    [ucapans]
  );

  const fetchDashboardPayload = useCallback(async () => {
    try {
      const r = await fetch("/api/ucapan");
      const json = await r.json();
      if (json.demo) {
        const list = listUcapan();
        const v: Record<string, ViewRecord> = {};
        for (const u of list) {
          const rec = getViews(u.id);
          if (rec) v[u.id] = rec;
        }
        return { mode: "demo" as const, ucapans: list, views: v };
      }
      if (r.ok && json.ok) {
        return {
          mode: "remote" as const,
          ucapans: (json.ucapans ?? []) as RemoteUcapan[],
        };
      }
      return {
        mode: "error" as const,
        message: "Gagal memuat daftar ucapan. Coba muat ulang ya.",
      };
    } catch {
      if (!isRemote()) {
        return { mode: "demo" as const, ucapans: listUcapan(), views: {} };
      }
      return {
        mode: "error" as const,
        message: "Tidak bisa terhubung ke server. Periksa internetmu lalu coba lagi.",
      };
    }
  }, []);

  const applyDashboardPayload = useCallback(
    (
      result:
        | { mode: "demo"; ucapans: RemoteUcapan[]; views: Record<string, ViewRecord> }
        | { mode: "remote"; ucapans: RemoteUcapan[] }
        | { mode: "error"; message: string }
    ) => {
      if (result.mode === "demo") {
        setDemo(true);
        setLoadError(null);
        setUcapans(result.ucapans);
        setLocalViews(result.views);
      } else if (result.mode === "remote") {
        setDemo(false);
        setLoadError(null);
        setUcapans(result.ucapans);
      } else {
        setLoadError(result.message);
      }
      setLoaded(true);
    },
    []
  );

  const loadUcapans = useCallback(async () => {
    setLoadError(null);
    const result = await fetchDashboardPayload();
    applyDashboardPayload(result);
  }, [applyDashboardPayload, fetchDashboardPayload]);

  useEffect(() => {
    let cancelled = false;
    void fetchDashboardPayload().then((result) => {
      if (!cancelled) applyDashboardPayload(result);
    });
    return () => {
      cancelled = true;
    };
  }, [applyDashboardPayload, fetchDashboardPayload]);

  // Supabase Realtime: sinkronkan views, reactions, dan replies secara live
  useEffect(() => {
    if (demo || !isRemote() || !idSignature) return;
    const ownedIds = new Set(idSignature.split(",").filter(Boolean));
    if (ownedIds.size === 0) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`dashboard-live:${idSignature.slice(0, 32)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "views" },
        (payload) => {
          const row = payload.new as {
            ucapan_id?: string;
            first_seen?: string;
            last_seen?: string;
          };
          const targetId = row?.ucapan_id;
          if (!targetId || !ownedIds.has(targetId)) return;

          const seenTs = row.first_seen ? Date.parse(row.first_seen) : Date.now();
          setUcapans((prev) =>
            prev.map((u) => {
              if (u.id !== targetId) return u;
              const prevViews = u.views;
              return {
                ...u,
                views: {
                  count: (prevViews?.count ?? 0) + 1,
                  firstSeen: prevViews?.firstSeen ?? seenTs,
                  lastSeen: seenTs,
                },
              };
            })
          );

          const lastToast = lastViewToastRef.current.get(targetId) ?? 0;
          if (Date.now() - lastToast > 15_000) {
            lastViewToastRef.current.set(targetId, Date.now());
            const target = ucapansRef.current.find((u) => u.id === targetId);
            toast.info(`👀 ${target?.toName || "Seseorang"} baru saja membuka ucapanmu!`);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload) => {
          const row = payload.new as { ucapan_id?: string; emoji?: string };
          const targetId = row?.ucapan_id;
          const emoji = row?.emoji;
          if (!targetId || !emoji || !ownedIds.has(targetId)) return;

          setUcapans((prev) =>
            prev.map((u) => {
              if (u.id !== targetId) return u;
              const nextReactions = { ...(u.reactions ?? {}) };
              nextReactions[emoji] = (nextReactions[emoji] ?? 0) + 1;
              return { ...u, reactions: nextReactions };
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "replies" },
        (payload) => {
          const row = payload.new as {
            ucapan_id?: string;
            from_name?: string;
            message?: string;
            created_at?: string;
          };
          const targetId = row?.ucapan_id;
          if (!targetId || !row.message || !ownedIds.has(targetId)) return;

          const newReply = {
            fromName: row.from_name || "Pasanganmu",
            message: row.message,
            createdAt: row.created_at || new Date().toISOString(),
          };
          setUcapans((prev) =>
            prev.map((u) =>
              u.id === targetId
                ? { ...u, replies: [...(u.replies ?? []), newReply] }
                : u
            )
          );
          toast.success(`💌 Balasan baru dari ${newReply.fromName}!`);
        }
      )
      .subscribe((status) => {
        setRealtimeLive(status === "SUBSCRIBED");
      });

    return () => {
      setRealtimeLive(false);
      void supabase.removeChannel(channel);
    };
  }, [demo, idSignature]);

  const remove = async (id: string) => {
    const target = ucapans.find((u) => u.id === id);
    const label = target?.toName ? `ucapan untuk ${target.toName}` : "ucapan ini";
    if (!window.confirm(`Yakin ingin menghapus ${label}? Tindakan ini tidak bisa dibatalkan.`)) {
      return;
    }
    if (demo) {
      deleteUcapan(id);
      setUcapans(listUcapan());
      setLocalViews((v) => {
        const next = { ...v };
        delete next[id];
        return next;
      });
      toast.success("Ucapan dihapus");
      return;
    }
    try {
      const res = await fetch(`/api/ucapan/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !json.ok) {
        toast.error("Gagal menghapus ucapan. Coba lagi ya.");
        return;
      }
      setUcapans((list) => list.filter((u) => u.id !== id));
      toast.success("Ucapan dihapus");
    } catch {
      toast.error("Gagal terhubung ke server saat menghapus ucapan.");
    }
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
      const refreshed = await fetch("/api/ucapan");
      const rjson = await refreshed.json();
      if (refreshed.ok && rjson.ok) setUcapans(rjson.ucapans ?? []);
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi ya.");
    } finally {
      setDuplicatingId(null);
    }
  };

  const copyLink = async (u: RemoteUcapan) => {
    const url = publicUrlFor(u);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(u.id);
      setTimeout(() => setCopiedId(null), 2000);
      AnalyticsEvents.shareClicked(u.templateSlug, "clipboard");
    } catch {
      // abaikan
    }
  };

  const shareCard = async (u: RemoteUcapan) => {
    const url = publicUrlFor(u);
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
    await copyLink(u);
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
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-label-md text-on-surface-variant">Hai 👋</p>
        {realtimeLive && !demo && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-[11px] font-semibold text-green-700"
            title="Statistik view, reaksi, dan balasan diperbarui otomatis secara langsung"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        )}
      </div>
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
            {loadError && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-body-md text-red-700">{loadError}</p>
                <button
                  type="button"
                  onClick={() => void loadUcapans()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-600 text-white text-label-md font-semibold hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Muat Ulang
                </button>
              </div>
            )}

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

            {ucapans.length === 0 && !loadError ? (
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
                  // Batas edit 7 hari hanya berlaku setelah pembayaran lunas; draft unpaid selalu bisa diedit.
                  const editOpen =
                    !u.paid || now - (u.paidAt ?? u.createdAt) < EDIT_WINDOW_MS;
                  const qr = openQr === u.id;
                  const url = publicUrlFor(u);
                  const meta = getTemplate(u.templateSlug);
                  const reactionEntries = Object.entries(u.reactions ?? {});
                  const replies = u.replies ?? [];
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

                          {/* Reaksi & Balasan dari penerima */}
                          {(reactionEntries.length > 0 || replies.length > 0) && (
                            <div className="mt-3 rounded-2xl bg-surface-container-low p-3.5 space-y-2">
                              {reactionEntries.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-label-md font-semibold text-on-surface-variant mr-1">
                                    Reaksi:
                                  </span>
                                  {reactionEntries.map(([emoji, count]) => (
                                    <span
                                      key={emoji}
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-outline-variant/30 text-label-md"
                                    >
                                      <span>{emoji}</span>
                                      <span className="font-semibold text-on-surface">{count}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {replies.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-label-md font-semibold text-on-surface-variant">
                                    💌 Balasan ({replies.length}):
                                  </p>
                                  {replies.map((rep, idx) => (
                                    <div
                                      key={`${rep.createdAt}-${idx}`}
                                      className="rounded-xl bg-white border border-outline-variant/25 px-3 py-2 text-body-md"
                                    >
                                      <span className="font-semibold text-primary">
                                        {rep.fromName}:
                                      </span>{" "}
                                      <span className="text-on-surface">{rep.message}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Aksi */}
                          <div className="flex items-center gap-2 flex-wrap mt-4">
                            {!u.paid ? (
                              <Link
                                href={`/checkout/${u.id}`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-label-md font-semibold bg-primary text-white shadow-sm hover:-translate-y-0.5 transition-all"
                              >
                                <Wallet className="h-3.5 w-3.5" />
                                Bayar Sekarang
                              </Link>
                            ) : (
                              <button
                                onClick={() => void copyLink(u)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-label-md font-semibold bg-primary text-white shadow-sm hover:-translate-y-0.5 transition-all"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                {copiedId === u.id ? "Tersalin!" : "Salin Link"}
                              </button>
                            )}
                            {u.paid && (
                              <button
                                onClick={() => void shareCard(u)}
                                aria-label="Bagikan"
                                title="Bagikan"
                                className="p-2 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors"
                              >
                                <Share2 className="h-4 w-4" />
                              </button>
                            )}
                            {u.paid && (
                              <button
                                onClick={() => setOpenQr(qr ? null : u.id)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-label-md font-semibold bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors"
                              >
                                QR
                              </button>
                            )}
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
                              onClick={() => void remove(u.id)}
                              aria-label="Hapus ucapan"
                              className="p-2 rounded-full bg-surface-container-low text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {qr && (
                            <div className="mt-4 pt-4 border-t border-outline-variant/30">
                              <QrCodeCard
                                url={url}
                                toName={u.toName}
                                photoUrl={u.photos?.[0]}
                                qrPhotoEnabled={u.qrPhotoEnabled}
                                compact
                              />
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
