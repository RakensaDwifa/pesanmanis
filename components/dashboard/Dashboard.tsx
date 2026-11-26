"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CopyPlus,
  ExternalLink,
  Eye,
  Link2,
  Loader2,
  Mail,
  Pencil,
  QrCode,
  RefreshCw,
  Share2,
  Trash2,
  Wallet,
} from "lucide-react";
import { deleteUcapan, getViews, listUcapan, savePaidUcapan } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { isRemote } from "@/lib/supabase/config";
import { toast } from "sonner";
import { AnalyticsEvents } from "@/lib/analytics";
import { getTemplate, templateEmoji } from "@/lib/templates";
import { parseRecipientResponse } from "@/lib/supabase/rows";
import type { StoredUcapan, ViewRecord } from "@/lib/store";
import QrCodeCard from "@/components/ui/QrCodeCard";
import { EASE_WARM, SPRING_TACTILE } from "@/components/landing/MotionPrimitives";
import {
  DashboardMobileHeader,
  DashboardSidebar,
  type DashboardTab,
} from "./DashboardShellChrome";
import { DashboardContentSkeleton } from "./DashboardSkeleton";
import DeleteConfirmModal from "./DeleteConfirmModal";
import ReferralDashboard from "./ReferralDashboard";

const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const EMPTY_SUBSCRIBE = () => () => {};

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

function publicPathLabel(u: RemoteUcapan): string {
  if (u.paid && u.customSlug) {
    return `/u/${u.customSlug}`;
  }
  const slug = u.templateSlug || u.id.slice(0, 8);
  return `/t/${slug}/${u.id.slice(0, 8)}…`;
}

function editWindowInfo(u: RemoteUcapan, now: number): {
  open: boolean;
  label: string;
} {
  if (!u.paid) {
    return { open: true, label: "Draft bebas diedit" };
  }
  const remainingMs = EDIT_WINDOW_MS - (now - (u.paidAt ?? u.createdAt));
  if (remainingMs <= 0) {
    return { open: false, label: "Masa edit habis" };
  }
  const daysLeft = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  return { open: true, label: `Sisa edit ${daysLeft} hari` };
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
  const [deleteTarget, setDeleteTarget] = useState<RemoteUcapan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [realtimeLive, setRealtimeLive] = useState(false);
  const canNativeShare = useSyncExternalStore(
    EMPTY_SUBSCRIBE,
    () =>
      typeof navigator !== "undefined" &&
      typeof (navigator as Navigator & { share?: unknown }).share === "function",
    () => false
  );
  const [now] = useState(() => Date.now());
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<DashboardTab>(() =>
    searchParams.get("tab") === "referral" ? "referral" : "ucapan"
  );
  const reduced = useReducedMotion();
  const lastViewToastRef = useRef<Map<string, number>>(new Map());
  const ucapansRef = useRef<RemoteUcapan[]>(ucapans);

  const handleTabChange = useCallback(
    (tab: DashboardTab) => {
      setActiveTab(tab);
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (tab === "referral") {
        params.set("tab", "referral");
      } else {
        params.delete("tab");
      }
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      window.history.replaceState(null, "", nextUrl);
    },
    [pathname]
  );

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
            toast.info(`${target?.toName || "Seseorang"} baru saja membuka ucapanmu!`);
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
          toast.success(`Balasan baru dari ${newReply.fromName}!`);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ucapan" },
        (payload) => {
          const row = payload.new as {
            id?: string;
            recipient_response?: unknown;
          };
          const targetId = row?.id;
          if (!targetId || !ownedIds.has(targetId)) return;
          const nextResponse = parseRecipientResponse(row.recipient_response);
          if (!nextResponse) return;

          setUcapans((prev) =>
            prev.map((u) =>
              u.id === targetId
                ? { ...u, recipientResponse: nextResponse }
                : u
            )
          );
          const target = ucapansRef.current.find((u) => u.id === targetId);
          toast.success(
            `${target?.toName || "Penerima"} sudah merespons ucapanmu!`
          );
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

  const confirmDelete = async () => {
    if (!deleteTarget || deletingId) return;
    const id = deleteTarget.id;
    setDeletingId(id);

    if (demo) {
      try {
        deleteUcapan(id);
        setUcapans(listUcapan());
        setLocalViews((v) => {
          const next = { ...v };
          delete next[id];
          return next;
        });
        if (openQr === id) setOpenQr(null);
        setDeleteTarget(null);
        toast.success("Ucapan dihapus", { id: "dashboard-delete" });
      } finally {
        setDeletingId(null);
      }
      return;
    }

    try {
      const res = await fetch(`/api/ucapan/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !json.ok) {
        toast.error("Gagal menghapus ucapan. Coba lagi ya.", {
          id: "dashboard-delete",
        });
        return;
      }
      setUcapans((list) => list.filter((u) => u.id !== id));
      if (openQr === id) setOpenQr(null);
      setDeleteTarget(null);
      toast.success("Ucapan dihapus", { id: "dashboard-delete" });
    } catch {
      toast.error("Gagal terhubung ke server saat menghapus ucapan.", {
        id: "dashboard-delete",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const duplicate = async (id: string) => {
    if (demo) {
      const source = ucapans.find((u) => u.id === id);
      if (!source) return;
      const cloned: RemoteUcapan = {
        ...source,
        id: crypto.randomUUID(),
        title: source.title ? `${source.title} (Salinan)` : "Untuk Kamu (Salinan)",
        paid: false,
        paidAt: undefined,
        customSlug: undefined,
        createdAt: Date.now(),
        recipientResponse: undefined,
        reactions: undefined,
        replies: undefined,
      };
      savePaidUcapan(cloned);
      setUcapans((prev) => [cloned, ...prev]);
      toast.success("Draft duplikat berhasil dibuat", { id: "dashboard-duplicate" });
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
      toast.success("Link ucapan disalin!", { id: "dashboard-copy-link" });
      setTimeout(() => setCopiedId(null), 2000);
      AnalyticsEvents.shareClicked(u.templateSlug, "clipboard");
    } catch {
      toast.error("Gagal menyalin link. Coba salin manual ya.", {
        id: "dashboard-copy-link",
      });
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

  const totalViews = ucapans.reduce((acc, u) => acc + (viewOf(u)?.count ?? 0), 0);
  const activeCount = ucapans.filter((u) => u.paid).length;

  return (
    <div className="min-h-[72vh] bg-surface pt-24 pb-16">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10">
        {/* Header ringkas khusus mobile (< lg) agar navigasi langsung interaktif */}
        <DashboardMobileHeader
          demo={loaded && demo}
          realtimeLive={loaded && realtimeLive}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          <div className="hidden lg:block">
            <DashboardSidebar
              demo={loaded && demo}
              realtimeLive={loaded && realtimeLive}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>

          <AnimatePresence initial={false}>
            {activeTab === "referral" ? (
              <motion.div
                key="dashboard-referral"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: EASE_WARM }}
              >
                <ReferralDashboard embedded demo={loaded && demo} />
              </motion.div>
            ) : !loaded ? (
              <motion.div
                key="dashboard-skeleton"
                initial={reduced ? { opacity: 0 } : { opacity: 0.92 }}
                animate={{ opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: EASE_WARM }}
              >
                <DashboardContentSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="dashboard-content"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, ease: EASE_WARM }}
              >
                {loadError && (
                  <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/12 px-4 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-body-md text-red-700 dark:text-red-300">{loadError}</p>
                    <button
                      type="button"
                      onClick={() => void loadUcapans()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-600 text-white text-label-md font-semibold hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Muat Ulang
                    </button>
                  </div>
                )}

                {/* Ringkasan */}
                {ucapans.length > 0 && (
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
                    {[
                      { label: "Total ucapan", value: String(ucapans.length) },
                      { label: "Aktif", value: String(activeCount) },
                      { label: "Total dilihat", value: String(totalViews) },
                    ].map((s, idx) => (
                      <motion.div
                        key={s.label}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.04, ease: EASE_WARM }}
                        className="bg-white rounded-2xl border border-outline-variant/25 shadow-card px-2.5 sm:px-4 py-3.5 sm:py-4 text-center"
                      >
                        <p className="font-heading text-title-lg text-primary">{s.value}</p>
                        <p className="text-[11px] sm:text-label-md text-on-surface-variant mt-0.5 truncate">{s.label}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {ucapans.length === 0 && !loadError ? (
                  <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-7 sm:p-14 text-center">
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
                    {ucapans.map((u, idx) => {
                      const view = viewOf(u);
                      // Batas edit 7 hari hanya berlaku setelah pembayaran lunas; draft unpaid selalu bisa diedit.
                      const editStatus = editWindowInfo(u, now);
                      const editOpen = editStatus.open;
                      const qr = openQr === u.id;
                      const url = publicUrlFor(u);
                      const meta = getTemplate(u.templateSlug);
                      const reactionEntries = Object.entries(u.reactions ?? {});
                      const replies = u.replies ?? [];
                      return (
                        <motion.div
                          key={u.id}
                          initial={reduced ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.34,
                            delay: Math.min(idx, 5) * 0.05,
                            ease: EASE_WARM,
                          }}
                          className="bg-white rounded-3xl border border-outline-variant/30 shadow-card overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row">
                            {/* Thumbnail template */}
                            <div
                              className={`sm:w-32 shrink-0 bg-gradient-to-br ${meta?.gradient ?? "from-primary-fixed to-surface-container-high"} dark:brightness-90 flex items-center justify-center py-5 sm:py-0`}
                            >
                              <span className="text-5xl">{templateEmoji(u.templateSlug)}</span>
                            </div>

                            <div className="flex-1 p-5 md:p-6 min-w-0">
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="font-heading text-title-md text-on-surface truncate">
                                      {u.title || "Untuk Kamu"}
                                    </h2>
                                    <span
                                      className={`text-label-md font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                                        u.paid
                                          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                                          : "bg-amber-500/12 text-amber-800 dark:text-amber-300"
                                      }`}
                                    >
                                      {u.paid ? "Aktif" : "Menunggu bayar"}
                                    </span>
                                  </div>
                                  <p className="text-body-md text-on-surface-variant mt-1 leading-snug">
                                    Untuk {u.toName} · dari {u.fromName} · {meta?.name ?? u.templateSlug}
                                  </p>
                                </div>
                                {/* Stats inline */}
                                <span
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant/35 text-label-md font-semibold text-on-surface shrink-0"
                                  title="Total dibuka"
                                >
                                  <Eye className="h-3.5 w-3.5 text-primary" />
                                  {view ? `${view.count}×` : "0×"}
                                </span>
                              </div>

                              {/* Meta ringkas: link publik + sisa masa edit */}
                              <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[12px] text-on-surface-variant">
                                {u.paid && (
                                  <button
                                    type="button"
                                    onClick={() => void copyLink(u)}
                                    title="Klik untuk menyalin link"
                                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-container/80 border border-outline-variant/30 px-2.5 py-1 font-mono text-[11px] text-on-surface hover:border-primary/40 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                  >
                                    <Link2 className="h-3 w-3 text-primary shrink-0" />
                                    <span className="truncate max-w-[180px] sm:max-w-[240px]">
                                      {publicPathLabel(u)}
                                    </span>
                                  </button>
                                )}
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                                    editOpen
                                      ? "bg-surface-container/60 border-outline-variant/25 text-on-surface-variant"
                                      : "bg-red-500/8 border-red-500/20 text-red-700 dark:text-red-300"
                                  }`}
                                >
                                  <Clock className="h-3 w-3 shrink-0" />
                                  {editStatus.label}
                                </span>
                              </div>

                              {view?.firstSeen && (
                                <p className="inline-flex items-center gap-1.5 text-label-md text-on-surface-variant mt-2">
                                  <Eye className="h-3.5 w-3.5 shrink-0" />
                                  Pertama dibuka{" "}
                                  {new Date(view.firstSeen).toLocaleString("id-ID")}
                                </p>
                              )}

                              {/* Keputusan kontekstual penerima (template Permintaan Maaf) */}
                              {u.recipientResponse?.type === "apology" &&
                                u.recipientResponse.decision === "forgiven" && (
                                  <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 flex items-center justify-between gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 text-label-md font-semibold text-emerald-800 dark:text-emerald-300">
                                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                                      Dimaafkan ·{" "}
                                      {u.recipientResponse.hesitationCount === 0
                                        ? "Langsung dimaafkan tanpa ragu!"
                                        : `Sempat menekan 'Belum dulu' sebanyak ${u.recipientResponse.hesitationCount} kali`}
                                    </span>
                                    <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                                      {new Date(
                                        u.recipientResponse.respondedAt
                                      ).toLocaleString("id-ID")}
                                    </span>
                                  </div>
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
                                      <p className="inline-flex items-center gap-1.5 text-label-md font-semibold text-on-surface-variant">
                                        <Mail className="h-3.5 w-3.5 shrink-0" />
                                        Balasan ({replies.length}):
                                      </p>
                                      {replies.map((rep, repIdx) => (
                                        <div
                                          key={`${rep.createdAt}-${repIdx}`}
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

                              {/* Aksi: 2 grup seimbang (Aksi Utama kiri | Aksi Kelola kanan) */}
                              <div className="flex flex-wrap items-center justify-between gap-2.5 mt-4 pt-3.5 border-t border-outline-variant/20">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {!u.paid ? (
                                    <Link
                                      href={`/checkout/${u.id}`}
                                      className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-full text-label-md font-semibold bg-primary text-white shadow-sm hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                                    >
                                      <Wallet className="h-4 w-4" />
                                      Bayar Sekarang
                                    </Link>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => void copyLink(u)}
                                      className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-full text-label-md font-semibold bg-primary text-white shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                                    >
                                      {copiedId === u.id ? (
                                        <Check className="h-4 w-4" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                      {copiedId === u.id ? "Tersalin!" : "Salin Link"}
                                    </button>
                                  )}
                                  {u.paid && (
                                    <motion.button
                                      type="button"
                                      onClick={() => setOpenQr(qr ? null : u.id)}
                                      aria-expanded={qr}
                                      aria-label={qr ? "Tutup QR Code" : "Tampilkan QR Code"}
                                      whileHover={reduced ? undefined : { y: -1.5, scale: 1.02 }}
                                      whileTap={reduced ? undefined : { scale: 0.94 }}
                                      transition={SPRING_TACTILE}
                                      className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-full text-label-md font-semibold border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                                        qr
                                          ? "bg-primary/15 text-primary border-primary/40 shadow-2xs"
                                          : "bg-surface-container border-outline-variant/35 text-on-surface hover:bg-surface-container-high"
                                      }`}
                                    >
                                      <motion.span
                                        aria-hidden
                                        animate={
                                          reduced
                                            ? undefined
                                            : qr
                                              ? { rotate: 0, scale: 1.12 }
                                              : { rotate: 0, scale: 1 }
                                        }
                                        transition={SPRING_TACTILE}
                                        className="inline-flex"
                                      >
                                        <QrCode className="h-4 w-4" />
                                      </motion.span>
                                      <span>QR</span>
                                    </motion.button>
                                  )}
                                  {u.paid && canNativeShare && (
                                    <button
                                      type="button"
                                      onClick={() => void shareCard(u)}
                                      aria-label="Bagikan"
                                      title="Bagikan"
                                      className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-surface-container border border-outline-variant/35 text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                    >
                                      <Share2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 sm:ml-auto">
                                  {u.paid && (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label="Buka ucapan"
                                      title="Buka halaman ucapan"
                                      className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-surface-container border border-outline-variant/35 text-on-surface hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  )}
                                  <Link
                                    href={`/buat/${u.templateSlug}?edit=${u.id}`}
                                    aria-label="Edit ucapan"
                                    className={`inline-flex items-center justify-center h-10 w-10 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                                      editOpen
                                        ? "bg-surface-container border-outline-variant/35 text-on-surface hover:bg-surface-container-high"
                                        : "bg-surface-container/40 border-outline-variant/20 text-on-surface-variant/50 cursor-not-allowed pointer-events-none"
                                    }`}
                                    title={editOpen ? "Edit ucapan" : "Masa edit 7 hari sudah habis"}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => void duplicate(u.id)}
                                    disabled={duplicatingId === u.id}
                                    aria-label="Duplikat ucapan"
                                    title="Duplikat ucapan ini"
                                    className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-surface-container border border-outline-variant/35 text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                  >
                                    <CopyPlus className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingId === u.id}
                                    onClick={() => setDeleteTarget(u)}
                                    aria-label="Hapus ucapan"
                                    title="Hapus ucapan"
                                    className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                                  >
                                    {deletingId === u.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              <AnimatePresence initial={false}>
                                {qr && (
                                  <motion.div
                                    key="qr-panel"
                                    initial={
                                      reduced
                                        ? { opacity: 0 }
                                        : { height: 0, opacity: 0 }
                                    }
                                    animate={
                                      reduced
                                        ? { opacity: 1 }
                                        : { height: "auto", opacity: 1 }
                                    }
                                    exit={
                                      reduced
                                        ? { opacity: 0 }
                                        : { height: 0, opacity: 0 }
                                    }
                                    transition={{ duration: 0.34, ease: EASE_WARM }}
                                    className="overflow-hidden"
                                  >
                                    <motion.div
                                      initial={
                                        reduced
                                          ? { opacity: 0 }
                                          : { opacity: 0, y: -14, scale: 0.98 }
                                      }
                                      animate={
                                        reduced
                                          ? { opacity: 1 }
                                          : { opacity: 1, y: 0, scale: 1 }
                                      }
                                      exit={
                                        reduced
                                          ? { opacity: 0 }
                                          : { opacity: 0, y: -10, scale: 0.98 }
                                      }
                                      transition={{ duration: 0.32, ease: EASE_WARM }}
                                      style={{ transformOrigin: "top center" }}
                                      className="mt-4 pt-4 border-t border-outline-variant/30"
                                    >
                                      <QrCodeCard
                                        url={url}
                                        toName={u.toName}
                                        photoUrl={u.photos?.[0]}
                                        qrPhotoEnabled={u.qrPhotoEnabled}
                                        compact
                                      />
                                    </motion.div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <DeleteConfirmModal
        target={deleteTarget}
        deleting={Boolean(deleteTarget && deletingId === deleteTarget.id)}
        onCancel={() => {
          if (!deletingId) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
