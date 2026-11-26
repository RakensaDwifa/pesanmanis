"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Users,
  CreditCard,
  Eye,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ShieldAlert,
  ExternalLink,
  Search,
  RefreshCw,
  Download,
  Mail,
  ShoppingBag,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { toSafeCsv } from "@/lib/csv";

interface PaymentRow {
  id: number;
  ucapan_id: string | null;
  merchant_ref: string;
  method: string;
  amount: number;
  status: string;
  tripay_ref?: string | null;
  paid_at?: string | null;
  created_at: string;
}

interface UcapanAdminRow {
  id: string;
  title: string;
  to_name: string;
  from_name: string;
  template_slug: string;
  custom_slug?: string | null;
  paid: boolean;
  paid_at?: string | null;
  created_at: string;
  email?: string | null;
  totalViews: number;
}

interface CheckoutSessionRow {
  id: string;
  ucapan_id: string;
  email: string | null;
  started_at: string;
  recovery_email_sent: boolean;
  recovery_sent_at: string | null;
  recovered_at: string | null;
  created_at: string;
  to_name: string | null;
  from_name: string | null;
  ucapan_paid: boolean;
  template_slug: string | null;
}

interface SubscriberRow {
  id: number;
  email: string;
  source: string;
  created_at: string;
}

interface AdminData {
  stats: {
    totalRevenue: number;
    totalPaidCount: number;
    totalUcapans: number;
    totalPayments: number;
    totalCheckoutSessions: number;
    recoveredSessionsCount: number;
    pendingRecoveryCount: number;
    totalSubscribers: number;
  };
  payments: PaymentRow[];
  ucapans: UcapanAdminRow[];
  checkoutSessions: CheckoutSessionRow[];
  subscribers: SubscriberRow[];
}

type AdminTab = "payments" | "ucapans" | "abandoned" | "newsletter";
type PaymentStatusFilter = "ALL" | "PAID" | "UNPAID" | "FAILED" | "EXPIRED" | "SUPERSEDED";

const STATUS_FILTERS: readonly PaymentStatusFilter[] = [
  "ALL",
  "PAID",
  "UNPAID",
  "FAILED",
  "EXPIRED",
  "SUPERSEDED",
];

function downloadCsvFile(filename: string, csvContent: string) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function statusBadgeStyle(status: string): string {
  switch (status) {
    case "PAID":
      return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
    case "UNPAID":
      return "bg-amber-500/12 text-amber-800 dark:text-amber-300";
    case "FAILED":
    case "EXPIRED":
      return "bg-red-500/12 text-red-700 dark:text-red-300";
    default:
      return "bg-surface-container text-on-surface-variant";
  }
}

async function fetchAdminStatsRequest(): Promise<
  { ok: true; data: AdminData } | { ok: false; error: string }
> {
  try {
    const res = await fetch("/api/admin/stats", { cache: "no-store" });
    const json = (await res.json()) as Partial<AdminData> & {
      ok?: boolean;
      error?: string;
    };
    if (!res.ok || !json.ok || !json.stats) {
      return { ok: false, error: json.error || "Gagal memuat data admin" };
    }
    return {
      ok: true,
      data: {
        stats: json.stats,
        payments: json.payments ?? [],
        ucapans: json.ucapans ?? [],
        checkoutSessions: json.checkoutSessions ?? [],
        subscribers: json.subscribers ?? [],
      },
    };
  } catch {
    return { ok: false, error: "Gagal terhubung ke server" };
  }
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("payments");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("ALL");
  const [syncingRef, setSyncingRef] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminStatsRequest().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setData(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const res = await fetchAdminStatsRequest();
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else {
      toast.error(res.error);
    }
    setRefreshing(false);
  }, []);

  const handleSyncPayment = useCallback(
    async (merchantRef: string) => {
      setSyncingRef(merchantRef);
      try {
        const res = await fetch("/api/admin/payments/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merchantRef }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          status?: string;
          activated?: boolean;
          alreadyPaid?: boolean;
          message?: string;
          error?: string;
        };

        if (!res.ok || !json.ok) {
          toast.error(json.message ?? json.error ?? "Gagal mengecek status Midtrans");
          return;
        }

        if (json.status === "PAID") {
          toast.success(
            json.activated
              ? `Pembayaran ${merchantRef} lunas & ucapan berhasil diaktifkan!`
              : `Pembayaran ${merchantRef} sudah berstatus PAID.`
          );
          await handleRefresh();
        } else if (json.status === "FAILED" || json.status === "EXPIRED") {
          toast.info(`Status ${merchantRef} diperbarui menjadi ${json.status}.`);
          await handleRefresh();
        } else {
          toast.info(`Transaksi ${merchantRef} masih berstatus PENDING di Midtrans.`);
        }
      } catch {
        toast.error("Koneksi terputus saat menghubungi server.");
      } finally {
        setSyncingRef(null);
      }
    },
    [handleRefresh]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredPayments = useMemo(() => {
    const list = data?.payments ?? [];
    return list.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return (
        p.merchant_ref.toLowerCase().includes(normalizedQuery) ||
        (p.method ?? "").toLowerCase().includes(normalizedQuery) ||
        (p.tripay_ref ?? "").toLowerCase().includes(normalizedQuery) ||
        (p.ucapan_id ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [data?.payments, normalizedQuery, statusFilter]);

  const filteredUcapans = useMemo(() => {
    const list = data?.ucapans ?? [];
    if (!normalizedQuery) return list;
    return list.filter(
      (u) =>
        (u.title ?? "").toLowerCase().includes(normalizedQuery) ||
        (u.to_name ?? "").toLowerCase().includes(normalizedQuery) ||
        (u.from_name ?? "").toLowerCase().includes(normalizedQuery) ||
        (u.template_slug ?? "").toLowerCase().includes(normalizedQuery) ||
        (u.custom_slug ?? "").toLowerCase().includes(normalizedQuery) ||
        (u.email ?? "").toLowerCase().includes(normalizedQuery)
    );
  }, [data?.ucapans, normalizedQuery]);

  const filteredSessions = useMemo(() => {
    const list = data?.checkoutSessions ?? [];
    if (!normalizedQuery) return list;
    return list.filter(
      (s) =>
        (s.email ?? "").toLowerCase().includes(normalizedQuery) ||
        (s.to_name ?? "").toLowerCase().includes(normalizedQuery) ||
        (s.from_name ?? "").toLowerCase().includes(normalizedQuery) ||
        (s.template_slug ?? "").toLowerCase().includes(normalizedQuery) ||
        s.ucapan_id.toLowerCase().includes(normalizedQuery)
    );
  }, [data?.checkoutSessions, normalizedQuery]);

  const filteredSubscribers = useMemo(() => {
    const list = data?.subscribers ?? [];
    if (!normalizedQuery) return list;
    return list.filter(
      (sub) =>
        sub.email.toLowerCase().includes(normalizedQuery) ||
        sub.source.toLowerCase().includes(normalizedQuery)
    );
  }, [data?.subscribers, normalizedQuery]);

  const exportPaymentsCsv = () => {
    const csv = toSafeCsv(
      [
        "ID",
        "Merchant Ref",
        "Ucapan ID",
        "Metode",
        "Nominal (IDR)",
        "Status",
        "Midtrans Ref",
        "Waktu Dibayar",
        "Waktu Dibuat",
      ],
      filteredPayments.map((p) => [
        p.id,
        p.merchant_ref,
        p.ucapan_id ?? "",
        p.method ?? "",
        p.amount ?? 0,
        p.status,
        p.tripay_ref ?? "",
        p.paid_at ?? "",
        p.created_at,
      ])
    );
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`pesanmanis-payments-${stamp}.csv`, csv);
    toast.success(`${filteredPayments.length} baris transaksi diekspor ke CSV`);
  };

  const exportSubscribersCsv = () => {
    const csv = toSafeCsv(
      ["ID", "Email", "Sumber", "Tanggal Daftar"],
      filteredSubscribers.map((s) => [s.id, s.email, s.source, s.created_at])
    );
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`pesanmanis-newsletter-${stamp}.csv`, csv);
    toast.success(`${filteredSubscribers.length} subscriber diekspor ke CSV`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface pt-24 pb-16 flex items-center justify-center">
        <p className="text-body-md text-on-surface-variant flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Memuat panel admin…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface pt-24 pb-16">
        <div className="max-w-[700px] mx-auto px-5 text-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-10 shadow-card">
            <ShieldAlert className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <h1 className="font-heading text-headline-sm text-red-800 dark:text-red-300 mb-2">
              Akses Ditolak / Gagal
            </h1>
            <p className="text-body-md text-red-600 dark:text-red-300/90 mb-6">{error}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-label-lg font-semibold rounded-full"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, payments, ucapans, checkoutSessions, subscribers } = data;
  const totalViews = ucapans.reduce((acc, u) => acc + u.totalViews, 0);

  return (
    <div className="min-h-screen bg-surface pt-24 pb-16">
      <div className="max-w-[1200px] mx-auto px-5 md:px-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/dashboard"
                className="text-primary hover:underline text-body-md inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> Dashboard User
              </Link>
            </div>
            <h1 className="font-heading text-headline-lg text-primary">Admin Control Panel</h1>
            <p className="text-body-md text-on-surface-variant">
              Ringkasan pendapatan, rekonsiliasi Midtrans, abandoned cart, dan subscriber newsletter.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 self-start sm:self-auto px-5 py-2.5 rounded-full bg-white border border-outline-variant/40 text-label-lg font-semibold text-on-surface hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Memuat…" : "Muat Ulang"}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-body-md text-on-surface-variant font-medium">
                Total Pendapatan
              </span>
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <p className="font-heading text-headline-md text-on-surface">
              Rp {stats.totalRevenue.toLocaleString("id-ID")}
            </p>
            <p className="text-label-md text-emerald-700 dark:text-emerald-400 mt-1">
              Dari {stats.totalPaidCount} pembayaran sukses
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-body-md text-on-surface-variant font-medium">
                Total Transaksi
              </span>
              <div className="w-10 h-10 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <p className="font-heading text-headline-md text-on-surface">{stats.totalPayments}</p>
            <p className="text-label-md text-on-surface-variant mt-1">
              Semua status (Paid, Unpaid, Expired)
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-body-md text-on-surface-variant font-medium">
                Total Ucapan
              </span>
              <div className="w-10 h-10 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="font-heading text-headline-md text-on-surface">{stats.totalUcapans}</p>
            <p className="text-label-md text-on-surface-variant mt-1">Kartu ucapan terbuat</p>
          </div>

          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-body-md text-on-surface-variant font-medium">
                Total Kunjungan
              </span>
              <div className="w-10 h-10 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary">
                <Eye className="h-5 w-5" />
              </div>
            </div>
            <p className="font-heading text-headline-md text-on-surface">
              {totalViews.toLocaleString("id-ID")}
            </p>
            <p className="text-label-md text-on-surface-variant mt-1">
              Total view dari ucapan terbaru
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-body-md text-on-surface-variant font-medium">
                Abandoned Cart
              </span>
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-700 dark:text-amber-300">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <p className="font-heading text-headline-md text-on-surface">
              {stats.recoveredSessionsCount} pulih
            </p>
            <p className="text-label-md text-on-surface-variant mt-1">
              {stats.pendingRecoveryCount} belum selesai bayar · {stats.totalCheckoutSessions} sesi
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-body-md text-on-surface-variant font-medium">
                Newsletter
              </span>
              <div className="w-10 h-10 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary">
                <Mail className="h-5 w-5" />
              </div>
            </div>
            <p className="font-heading text-headline-md text-on-surface">
              {stats.totalSubscribers}
            </p>
            <p className="text-label-md text-on-surface-variant mt-1">
              Subscriber aktif terdaftar
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2.5 mb-5 border-b border-outline-variant/30 pb-4">
          {(
            [
              { id: "payments" as const, label: `Pembayaran (${payments.length})` },
              { id: "ucapans" as const, label: `Ucapan (${ucapans.length})` },
              { id: "abandoned" as const, label: `Abandoned Cart (${checkoutSessions.length})` },
              { id: "newsletter" as const, label: `Newsletter (${subscribers.length})` },
            ]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-full text-label-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-md"
                  : "bg-surface-container-low text-on-surface hover:bg-surface-container"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + Filter + Export Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-on-surface-variant absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ref transaksi, nama, email, atau template…"
              className="w-full rounded-full border border-outline-variant/50 bg-white pl-10 pr-4 py-2.5 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "payments" && (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  {STATUS_FILTERS.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-full text-label-md font-semibold transition-colors ${
                        statusFilter === st
                          ? "bg-primary-fixed/60 text-primary border border-primary/30"
                          : "bg-white border border-outline-variant/40 text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={exportPaymentsCsv}
                  disabled={filteredPayments.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-outline-variant/50 text-label-md font-semibold text-on-surface hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" /> Ekspor CSV
                </button>
              </>
            )}

            {activeTab === "newsletter" && (
              <button
                type="button"
                onClick={exportSubscribersCsv}
                disabled={filteredSubscribers.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-outline-variant/50 text-label-md font-semibold text-on-surface hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" /> Ekspor CSV
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "payments" && (
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30 text-label-md text-on-surface-variant">
                    <th className="p-4">Merchant Ref</th>
                    <th className="p-4">Metode</th>
                    <th className="p-4">Nominal</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Waktu Dibuat</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-body-md text-on-surface">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                        Tidak ada transaksi yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const isSyncing = syncingRef === p.merchant_ref;
                      return (
                        <tr key={p.id} className="hover:bg-surface-container-low/50">
                          <td className="p-4 font-medium">
                            <span className="block">{p.merchant_ref}</span>
                            {p.tripay_ref && (
                              <span className="block text-xs text-on-surface-variant">
                                Ref: {p.tripay_ref}
                              </span>
                            )}
                          </td>
                          <td className="p-4 uppercase">{p.method || "-"}</td>
                          <td className="p-4 font-semibold">
                            Rp {(p.amount || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-md font-semibold ${statusBadgeStyle(p.status)}`}
                            >
                              {p.status === "PAID" ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : p.status === "FAILED" || p.status === "EXPIRED" ? (
                                <XCircle className="h-3.5 w-3.5" />
                              ) : (
                                <Clock className="h-3.5 w-3.5" />
                              )}
                              {p.status}
                            </span>
                          </td>
                          <td className="p-4 text-on-surface-variant text-sm">
                            {new Date(p.created_at).toLocaleString("id-ID")}
                          </td>
                          <td className="p-4 text-right">
                            {p.status === "UNPAID" ? (
                              <button
                                type="button"
                                disabled={isSyncing}
                                onClick={() => void handleSyncPayment(p.merchant_ref)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-fixed/40 text-primary text-label-md font-semibold hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                              >
                                <RefreshCw
                                  className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
                                />
                                {isSyncing ? "Mengecek…" : "Cek Midtrans"}
                              </button>
                            ) : (
                              <span className="text-label-md text-on-surface-variant">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "ucapans" && (
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30 text-label-md text-on-surface-variant">
                    <th className="p-4">Judul / Kepada</th>
                    <th className="p-4">Template</th>
                    <th className="p-4">Status Bayar</th>
                    <th className="p-4">Views</th>
                    <th className="p-4">Link</th>
                    <th className="p-4">Dibuat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-body-md text-on-surface">
                  {filteredUcapans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                        Tidak ada ucapan yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUcapans.map((u) => {
                      const href =
                        u.paid && u.custom_slug
                          ? `/u/${u.custom_slug}`
                          : `/t/${u.template_slug || u.id.slice(0, 8)}/${u.id}`;
                      return (
                        <tr key={u.id} className="hover:bg-surface-container-low/50">
                          <td className="p-4">
                            <p className="font-semibold">{u.title || "Untuk Kamu"}</p>
                            <p className="text-sm text-on-surface-variant">
                              {u.to_name} (dari {u.from_name})
                            </p>
                            {u.email && (
                              <p className="text-xs text-on-surface-variant/80">{u.email}</p>
                            )}
                          </td>
                          <td className="p-4 capitalize">{u.template_slug}</td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-md font-semibold ${
                                u.paid
                                  ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                                  : "bg-amber-500/12 text-amber-800 dark:text-amber-300"
                              }`}
                            >
                              {u.paid ? "Aktif" : "Pending"}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-primary">{u.totalViews}×</td>
                          <td className="p-4">
                            <Link
                              href={href}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:underline"
                            >
                              {u.custom_slug ? `/u/${u.custom_slug}` : "Buka"}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                          <td className="p-4 text-on-surface-variant text-sm">
                            {new Date(u.created_at).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "abandoned" && (
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30 text-label-md text-on-surface-variant">
                    <th className="p-4">Email</th>
                    <th className="p-4">Ucapan</th>
                    <th className="p-4">Mulai Checkout</th>
                    <th className="p-4">Email Recovery</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-body-md text-on-surface">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                        Belum ada sesi checkout tercatat.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((s) => {
                      const isRecovered = Boolean(s.recovered_at) || s.ucapan_paid;
                      return (
                        <tr key={s.id} className="hover:bg-surface-container-low/50">
                          <td className="p-4 font-medium">{s.email || "—"}</td>
                          <td className="p-4">
                            <p className="font-semibold">
                              {s.to_name ? `Untuk ${s.to_name}` : s.ucapan_id.slice(0, 8)}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {s.from_name ? `dari ${s.from_name}` : ""}
                              {s.template_slug ? ` · ${s.template_slug}` : ""}
                            </p>
                          </td>
                          <td className="p-4 text-sm text-on-surface-variant">
                            {new Date(s.started_at).toLocaleString("id-ID")}
                          </td>
                          <td className="p-4 text-sm text-on-surface-variant">
                            {s.recovery_email_sent
                              ? s.recovery_sent_at
                                ? `Terkirim (${new Date(s.recovery_sent_at).toLocaleString("id-ID")})`
                                : "Terkirim"
                              : "Belum dikirim"}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-md font-semibold ${
                                isRecovered
                                  ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                                  : s.recovery_email_sent
                                    ? "bg-amber-500/12 text-amber-800 dark:text-amber-300"
                                    : "bg-surface-container text-on-surface-variant"
                              }`}
                            >
                              {isRecovered
                                ? "Pulih (Aktif)"
                                : s.recovery_email_sent
                                  ? "Menunggu Bayar"
                                  : "Baru Mulai"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "newsletter" && (
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30 text-label-md text-on-surface-variant">
                    <th className="p-4">Email</th>
                    <th className="p-4">Sumber</th>
                    <th className="p-4">Tanggal Daftar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-body-md text-on-surface">
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-on-surface-variant">
                        Belum ada subscriber newsletter.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-surface-container-low/50">
                        <td className="p-4 font-medium">{sub.email}</td>
                        <td className="p-4 capitalize">{sub.source}</td>
                        <td className="p-4 text-sm text-on-surface-variant">
                          {new Date(sub.created_at).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
