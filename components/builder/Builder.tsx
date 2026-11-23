"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CloudUpload,
  CreditCard,
  ImagePlus,
  Loader2,
  Mail,
  MessageSquareHeart,
  Music,
  PartyPopper,
  Plus,
  Redo2,
  Sparkles,
  Undo2,
  UserRound,
  X,
} from "lucide-react";
import { getTemplate, fillContentDefaults } from "@/lib/templates";
import type { UcapanContent } from "@/lib/types";
import { getDraft, getUcapan, saveDraft, savePaidUcapan } from "@/lib/store";
import { makeUcapanId } from "@/lib/templates";
import { createClient } from "@/lib/supabase/client";
import { isRemote, supabaseUrl } from "@/lib/supabase/config";
import { compressImage } from "@/lib/image";
import TemplateRenderer from "@/components/templates/registry";
import MoodSelector from "@/components/MoodSelector";
import { MUSIC_LIBRARY } from "@/lib/music-library";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  saveDraftRemote,
  getDraftRemote,
  clearDraftRemote,
  markLocalSaved,
  getLocalSavedAt,
} from "@/lib/drafts";
import type { SyncStatus } from "@/lib/drafts";
import { useContentHistory } from "@/lib/history";
import { useKeyboardShortcuts } from "@/lib/shortcuts";
import ShortcutsHelpModal from "@/components/ui/shortcuts-help";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { BRAND } from "@/lib/brand";
import { usePricing } from "@/lib/use-pricing";
import { planForPaid } from "@/lib/plans";
import {
  ADDON_PRICING,
  calculateCheckoutTotal,
  formatPrice,
  type AddonKey,
} from "@/lib/pricing";
import { validateSlugFormat } from "@/lib/slug";
import ParticleTouch from "@/components/effects/ParticleTouch";
import GateOverlay from "@/components/effects/GateOverlay";
import LoveReceiptModal from "@/components/effects/LoveReceiptModal";

const SECTIONS = [
  { id: "identitas", label: "Identitas", icon: UserRound, hint: "Siapa untuk siapa" },
  { id: "pesan", label: "Pesan", icon: MessageSquareHeart, hint: "Tulis perasaanmu" },
  { id: "media", label: "Galeri & Musik", icon: ImagePlus, hint: "Foto & lagu kenangan" },
  { id: "tambahan", label: "Tambahan", icon: Sparkles, hint: "Bikin lebih berkesan" },
  { id: "selesai", label: "Selesaikan", icon: PartyPopper, hint: "Kirim kejutan" },
] as const;

const ADDON_NOTES: Record<AddonKey, string> = {
  custom_slug: "Pilih alamat link (mis. /u/ari-nadia)",
  custom_qr: "Foto kalian di tengah QR Code",
  touch_particles: "Efek kelopak/hati saat layar disentuh",
  intimate_gate: "Harus jawab PIN sebelum surat terbuka",
  love_receipt: "Struk cinta bisa diunduh ke galeri HP",
};

const PARTICLE_OPTIONS = [
  { key: "hearts", label: "Hati", emoji: "❤️" },
  { key: "roses", label: "Mawar", emoji: "🌹" },
  { key: "sparkles", label: "Kilau", emoji: "✨" },
] as const;

/** Kunci sessionStorage untuk membawa pilihan add-on ke halaman checkout. */
export function addonsStorageKey(ucapanId: string) {
  return `pm:addons:${ucapanId}`;
}

type SectionId = (typeof SECTIONS)[number]["id"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BuilderPage({ slug, editId }: { slug: string; editId?: string }) {
  const pricing = usePricing();
  const template = getTemplate(slug);
  const router = useRouter();
  const [content, setContent] = useState<Partial<UcapanContent>>(() => {
    if (editId) {
      const existing = getUcapan(editId);
      if (existing) {
        return fillContentDefaults({
          templateSlug: existing.templateSlug,
          toName: existing.toName,
          fromName: existing.fromName,
          title: existing.title,
          message: existing.message,
          photos: existing.photos,
          musicUrl: existing.musicUrl,
        });
      }
    }
    return fillContentDefaults(getDraft(slug) ?? { templateSlug: slug });
  });
  const initialPaid = editId ? Boolean(getUcapan(editId)?.paid) : false;
  const [isPaid, setIsPaid] = useState(initialPaid);
  const plan = planForPaid(isPaid);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [openSection, setOpenSection] = useState<SectionId | null>("identitas");
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");

  // ── Add-on (monetisasi) ──
  const [selectedAddons, setSelectedAddons] = useState<Set<AddonKey>>(new Set());
  const [slugInput, setSlugInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [particleStyle, setParticleStyle] = useState<"hearts" | "roses" | "sparkles">("hearts");
  const [previewGateOpen, setPreviewGateOpen] = useState(false);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);

  const toggleAddon = (key: AddonKey) => {
    if (!selectedAddons.has(key) && key === "intimate_gate") setPreviewGateOpen(true);
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (key === "custom_slug") setSlugInput("");
        if (key === "intimate_gate") setPinInput("");
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const slugCheck = validateSlugFormat(slugInput);
  const checkoutCalc = calculateCheckoutTotal(pricing.amount, Array.from(selectedAddons));

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("up_preview_mode");
      if (stored === "mobile" || stored === "desktop") setPreviewMode(stored);
    } catch {
      // ignore
    }
  }, []);

  const switchPreviewMode = useCallback((mode: "mobile" | "desktop") => {
    setPreviewMode(mode);
    try {
      window.localStorage.setItem("up_preview_mode", mode);
    } catch {
      // ignore
    }
  }, []);

  const remoteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!template) return;
    saveDraft(slug, content);
    markLocalSaved(slug);

    if (!isRemote()) return;
    setSyncStatus("saving");
    if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    remoteSaveTimer.current = setTimeout(async () => {
      const result = await saveDraftRemote(content);
      setSyncStatus(
        result === "ok" ? "saved" : result === "skipped" ? "idle" : "error"
      );
    }, 3000);
    return () => {
      if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    };
  }, [content, slug, template]);

  // Restore draft remote saat pertama kali buka builder (bukan mode edit)
  useEffect(() => {
    if (!isRemote() || editId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [remote, localAt] = await Promise.all([
          getDraftRemote(slug),
          Promise.resolve(getLocalSavedAt(slug)),
        ]);
        if (cancelled || !remote) return;
        // Hanya pakai remote jika lebih baru dari lokal
        if (remote.updatedAt > localAt) {
          setContent((c) => fillContentDefaults({ ...remote.content, ...c, templateSlug: slug }));
          markRestored();
          toast.info("Draft tersinkron dari perangkat lain dipulihkan");
        }
      } catch {
        // silent — fallback ke draft lokal
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!editId) return;
    // Pulihkan pilihan add-on dari sessionStorage jika ada
    try {
      const raw = sessionStorage.getItem(addonsStorageKey(editId));
      if (raw) {
        const parsed = JSON.parse(raw) as {
          addons?: AddonKey[];
          customSlug?: string;
          pin?: string;
          particleStyle?: "hearts" | "roses" | "sparkles";
        };
        if (Array.isArray(parsed.addons)) setSelectedAddons(new Set(parsed.addons));
        if (parsed.customSlug) setSlugInput(parsed.customSlug);
        if (parsed.pin) setPinInput(parsed.pin);
        if (parsed.particleStyle) setParticleStyle(parsed.particleStyle);
      }
    } catch {
      // ignore
    }

    if (!isRemote()) return;
    let cancelled = false;
    fetch(`/api/ucapan/${editId}`)
      .then(async (r) => {
        const json = await r.json();
        if (!cancelled && json.ok && json.ucapan) {
          const u = json.ucapan;
          setContent(fillContentDefaults(u));
          setIsPaid(Boolean(u.paid));
          // Pulihkan konfigurasi add-on dari database bila belum ada di sessionStorage
          const restored = new Set<AddonKey>();
          if (u.customSlug) {
            restored.add("custom_slug");
            setSlugInput(String(u.customSlug));
          }
          if (u.qrPhotoEnabled) restored.add("custom_qr");
          if (u.touchParticles) {
            restored.add("touch_particles");
            if (["hearts", "roses", "sparkles"].includes(u.touchParticles)) {
              setParticleStyle(u.touchParticles);
            }
          }
          if (u.gateType) {
            restored.add("intimate_gate");
            if (u.gateData?.pin) setPinInput(String(u.gateData.pin));
          }
          if (u.receiptEnabled) restored.add("love_receipt");
          if (restored.size > 0) setSelectedAddons(restored);
          markRestored();
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const previewContent = useMemo(() => fillContentDefaults(content), [content]);

  const applyContent = useCallback(
    (next: Partial<UcapanContent>) => setContent(next),
    []
  );
  const { canUndo, canRedo, undo, redo, markRestored } =
    useContentHistory<Partial<UcapanContent>>(content, applyContent);

  const isValidEmail = useCallback((email: string) => EMAIL_REGEX.test(email.trim()), []);

  const identitasComplete = Boolean(
    content.toName?.trim() && content.email?.trim() && isValidEmail(content.email ?? "")
  );
  const pesanComplete = Boolean(content.message?.trim());
  const mediaComplete = true; // galeri & musik opsional
  const canPay = identitasComplete && pesanComplete;

  const set = <K extends keyof UcapanContent>(key: K, value: UcapanContent[K]) =>
    setContent((c) => ({ ...c, [key]: value }));

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const supabase = createClient();
      for (const file of Array.from(files)) {
        const blob = await compressImage(file);
        const ext = blob.type === "image/webp" ? "webp" : "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("foto")
          .upload(path, blob, { contentType: blob.type });
        if (error) throw error;
        const url = `${supabaseUrl()}/storage/v1/object/public/foto/${path}`;
        set("photos", [...(content.photos ?? []), url]);
      }
      toast.success("Foto berhasil diunggah");
    } catch {
      toast.error("Gagal mengunggah foto. Coba lagi ya.");
    } finally {
      setUploading(false);
    }
  };

  const addonsInvalidReason = (): string | null => {
    if (selectedAddons.has("custom_slug")) {
      if (!slugInput.trim()) return "Isi dulu alamat link cantikmu.";
      if (!slugCheck.valid) return slugCheck.reason ?? "Alamat link tidak valid.";
    }
    if (selectedAddons.has("intimate_gate") && !/^\d{4,6}$/.test(pinInput)) {
      return "PIN harus 4–6 angka.";
    }
    return null;
  };

  const persistAddons = (ucapanId: string) => {
    try {
      sessionStorage.setItem(
        addonsStorageKey(ucapanId),
        JSON.stringify({
          addons: Array.from(selectedAddons),
          customSlug: selectedAddons.has("custom_slug") ? slugCheck.normalized : undefined,
          pin: selectedAddons.has("intimate_gate") ? pinInput : undefined,
          particleStyle: selectedAddons.has("touch_particles") ? particleStyle : undefined,
        })
      );
    } catch {
      // sessionStorage tidak tersedia — checkout akan tampil tanpa add-on
    }
  };

  const goToPayment = async () => {
    if (!canPay) {
      setOpenSection(!identitasComplete ? "identitas" : "pesan");
      toast.error(
        !identitasComplete
          ? "Lengkapi dulu nama & email di bagian Identitas"
          : "Tulis dulu pesanmu di bagian Pesan"
      );
      return;
    }
    const addonError = addonsInvalidReason();
    if (addonError) {
      setOpenSection("tambahan");
      toast.error(addonError);
      return;
    }
    AnalyticsEvents.paymentStarted(slug, BRAND.price);
    setSaving(true);
    try {
      if (isRemote()) {
        const full = fillContentDefaults(content);
        const res = await fetch(
          editId ? `/api/ucapan/${editId}` : "/api/ucapan",
          {
            method: editId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(full),
          }
        );
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(`/buat/${slug}${editId ? `?edit=${editId}` : ""}`)}`);
          return;
        }
        const json = await res.json();
        if (!json.ok) {
          toast.error(
            json.error === "EDIT_WINDOW_EXPIRED"
              ? "Masa edit 7 hari sudah habis."
              : "Gagal menyimpan ucapan. Coba lagi ya."
          );
          return;
        }
        const finalId: string = json.id ?? editId ?? "";
        if (isPaid && editId) {
          toast.success("Perubahan ucapan berhasil disimpan!");
          router.push("/dashboard");
          return;
        }
        if (finalId) persistAddons(finalId);
        saveDraft(slug, content);
        void clearDraftRemote(slug);
        router.push(`/checkout/${finalId}`);
      } else {
        const id = editId ?? makeUcapanId();
        const alreadyPaid = editId ? Boolean(getUcapan(id)?.paid) : false;
        savePaidUcapan({
          ...fillContentDefaults(content),
          id,
          paid: alreadyPaid,
          paidAt: editId ? getUcapan(id)?.paidAt : undefined,
          createdAt: editId ? getUcapan(id)?.createdAt ?? Date.now() : Date.now(),
        });
        if (alreadyPaid && editId) {
          toast.success("Perubahan ucapan berhasil disimpan!");
          router.push("/dashboard");
          return;
        }
        persistAddons(id);
        router.push(`/checkout/${id}`);
      }
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi ya.");
    } finally {
      setSaving(false);
    }
  };

  // Ref ke aksi builder — diisi setelah fungsi-fungsi didefinisikan (di bawah).
  const actionsRef = useRef<{
    undo: () => void;
    redo: () => void;
    save: () => void;
    gotoSection: (i: number) => void;
  }>({
    undo: () => {},
    redo: () => {},
    save: () => {},
    gotoSection: () => {},
  });

  useKeyboardShortcuts({
    "ctrl+z": () => actionsRef.current.undo(),
    "ctrl+shift+z": () => actionsRef.current.redo(),
    "ctrl+y": () => actionsRef.current.redo(),
    "ctrl+s": () => actionsRef.current.save(),
    "ctrl+enter": () => actionsRef.current.save(),
    "alt+1": () => actionsRef.current.gotoSection(0),
    "alt+2": () => actionsRef.current.gotoSection(1),
    "alt+3": () => actionsRef.current.gotoSection(2),
    "alt+4": () => actionsRef.current.gotoSection(3),
    "?": () => setShowShortcuts(true),
    "shift+?": () => setShowShortcuts(true),
  });

  if (!template) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-5 text-center">
        <p className="text-headline-md text-on-surface mb-3">Template tidak ditemukan</p>
        <a href="/templates" className="text-primary font-semibold">
          Kembali ke daftar template
        </a>
      </div>
    );
  }

  actionsRef.current.undo = undo;
  actionsRef.current.redo = redo;
  actionsRef.current.save = () => {
    if (!saving) void goToPayment();
  };
  actionsRef.current.gotoSection = (i: number) => {
    const section = SECTIONS[i];
    if (section) setOpenSection(section.id);
  };

  const openSectionIndex = SECTIONS.findIndex((s) => s.id === openSection);

  const switchSection = (id: SectionId) => {
    if (id !== openSection && openSectionIndex >= 0) {
      AnalyticsEvents.builderStepCompleted(openSectionIndex, slug);
    }
    setOpenSection((prev) => (prev === id ? null : id));
  };

  const sectionComplete: Record<SectionId, boolean> = {
    identitas: identitasComplete,
    pesan: pesanComplete,
    media: mediaComplete,
    tambahan: addonsInvalidReason() === null,
    selesai: canPay,
  };

  const inputClass =
    "w-full rounded-2xl border border-outline-variant bg-white px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";

  const sectionHeader = (section: (typeof SECTIONS)[number]) => {
    const Icon = section.icon;
    const active = openSection === section.id;
    const complete = sectionComplete[section.id];
    return (
      <button
        onClick={() => switchSection(section.id)}
        aria-expanded={active}
        className={`w-full flex items-center gap-3.5 px-5 md:px-7 py-4.5 text-left transition-colors ${
          active ? "bg-primary-fixed/20" : "hover:bg-surface-container-low/60"
        }`}
      >
        <span
          className={`flex items-center justify-center h-10 w-10 rounded-2xl shrink-0 transition-colors ${
            active
              ? "bg-primary text-white shadow-[0_4px_14px_rgba(222,112,56,0.35)]"
              : complete
                ? "bg-primary-fixed text-on-primary-fixed-variant"
                : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-title-md font-semibold text-on-surface">
            {section.label}
          </span>
          <span className="block text-label-md text-on-surface-variant truncate">
            {section.hint}
          </span>
        </span>
        <ChevronDown
          className={`h-4.5 w-4.5 shrink-0 text-on-surface-variant transition-transform duration-300 ${
            active ? "rotate-180" : ""
          }`}
        />
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-surface pt-24 pb-28 lg:pb-10">
      <div className="max-w-[1400px] mx-auto px-5 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <a
              href="/templates"
              aria-label="Kembali ke daftar template"
              className="p-2.5 rounded-full bg-white border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors shrink-0"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </a>
            <div className="min-w-0">
              <h1 className="font-heading text-title-lg text-on-surface truncate">
                Buat Ucapan — {template.name}
              </h1>
              <p className="text-label-md text-on-surface-variant">
                Semua perubahan tersimpan otomatis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {isRemote() && (
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 text-label-md font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  syncStatus === "saving"
                    ? "text-on-surface-variant bg-surface-container-low"
                    : syncStatus === "saved"
                      ? "text-green-700 bg-green-50"
                      : syncStatus === "error"
                        ? "text-red-600 bg-red-50"
                        : ""
                }`}
                role="status"
                aria-live="polite"
              >
                {syncStatus === "saving" && (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan…
                  </>
                )}
                {syncStatus === "saved" && (
                  <>
                    <CloudUpload className="h-3.5 w-3.5" /> Tersimpan
                  </>
                )}
                {syncStatus === "error" && <>⚠️ Sinkron gagal</>}
              </span>
            )}
            <div className="flex items-center rounded-full bg-white border border-outline-variant/30 p-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
                className="p-2 rounded-full text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-40"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo (Ctrl+Shift+Z)"
                className="p-2 rounded-full text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-40"
              >
                <Redo2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowShortcuts(true)}
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
                className="px-3 py-2 rounded-full text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
              >
                ⌨️
              </button>
            </div>
            <span className="text-label-lg font-bold text-primary bg-primary-fixed/40 px-4 py-1.5 rounded-full">
              {formatPrice(checkoutCalc.totalAmount)}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(360px,440px)_1fr] gap-6 lg:gap-8 items-start">
          {/* PANEL KIRI — accordion editor */}
          <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-card overflow-hidden lg:sticky lg:top-24">
            <div className="divide-y divide-outline-variant/25">
              {SECTIONS.map((section) => (
                <div key={section.id}>
                  {sectionHeader(section)}
                  <AnimatePresence initial={false}>
                    {openSection === section.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 md:px-7 py-6">
                          {section.id === "identitas" && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-label-lg font-semibold text-on-surface mb-1.5">
                                  Nama Pacar Kamu *
                                </label>
                                <input
                                  className={inputClass}
                                  placeholder="cth: Nabila"
                                  value={content.toName ?? ""}
                                  onChange={(e) => set("toName", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-label-lg font-semibold text-on-surface mb-1.5">
                                  Nama Kamu
                                </label>
                                <input
                                  className={inputClass}
                                  placeholder="cth: Raka"
                                  value={content.fromName ?? ""}
                                  onChange={(e) => set("fromName", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-label-lg font-semibold text-on-surface mb-1.5">
                                  Judul Surat
                                </label>
                                <input
                                  className={inputClass}
                                  placeholder="cth: Untuk Kamu"
                                  value={content.title ?? ""}
                                  onChange={(e) => set("title", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-1.5 block text-label-lg font-semibold text-on-surface mb-1.5">
                                  <Mail className="h-3.5 w-3.5 text-primary" />
                                  Email Kamu (untuk notifikasi) *
                                </label>
                                <input
                                  type="email"
                                  className={inputClass}
                                  placeholder="cth: kamu@gmail.com"
                                  value={content.email ?? ""}
                                  onChange={(e) => set("email", e.target.value)}
                                  onBlur={(e) => {
                                    const email = e.target.value;
                                    if (email && !isValidEmail(email)) {
                                      toast.error("Format email tidak valid");
                                    }
                                  }}
                                  required
                                />
                              </div>
                              {identitasComplete && (
                                <button
                                  onClick={() => switchSection("pesan")}
                                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                >
                                  Lanjut tulis pesan <ArrowRight className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}

                          {section.id === "pesan" && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-label-lg font-semibold text-on-surface mb-1.5">
                                  Isi Pesan *
                                </label>
                                <textarea
                                  className={`${inputClass} min-h-56 resize-y`}
                                  placeholder="Ceritakan perasaanmu…"
                                  value={content.message ?? ""}
                                  onChange={(e) => set("message", e.target.value)}
                                />
                                <p className="text-label-md text-on-surface-variant mt-1.5">
                                  {content.message?.length ?? 0} karakter
                                </p>
                              </div>
                              {pesanComplete && (
                                <button
                                  onClick={() => switchSection("media")}
                                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                >
                                  Tambah foto & musik <ArrowRight className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}

                          {section.id === "media" && (
                            <div className="space-y-5">
                              <div>
                                <label className="block text-label-lg font-semibold text-on-surface mb-1.5">
                                  Foto Kenangan
                                </label>
                                <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low/50 px-4 py-8 cursor-pointer hover:border-primary/50 hover:bg-primary-fixed/10 transition-colors">
                                  <ImagePlus className="h-8 w-8 text-primary" />
                                  <span className="text-body-md font-semibold text-on-surface">
                                    {uploading ? "Mengunggah…" : "Pilih Foto dari Galeri / Kamera"}
                                  </span>
                                  <span className="text-label-md text-on-surface-variant">
                                    Otomatis dikompres & diunggah · maks 10MB/foto
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    disabled={uploading}
                                    onChange={(e) => {
                                      void uploadPhotos(e.target.files);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                {(content.photos ?? []).length > 0 && (
                                  <div className="grid grid-cols-3 gap-3 mt-4">
                                    {(content.photos ?? []).map((photo, i) => (
                                      <div
                                        key={`${photo}-${i}`}
                                        className="relative aspect-square rounded-2xl overflow-hidden border border-outline-variant/30 bg-surface-container-low"
                                      >
                                        <img
                                          src={photo}
                                          alt={`Foto ${i + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                        <button
                                          onClick={() =>
                                            set("photos", (content.photos ?? []).filter((_, j) => j !== i))
                                          }
                                          aria-label="Hapus foto"
                                          className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <details className="mt-3">
                                  <summary className="cursor-pointer text-label-md font-semibold text-primary">
                                    atau tempel URL gambar
                                  </summary>
                                  <div className="flex flex-col gap-2 mt-2">
                                    {(content.photos ?? []).map((photo, i) => (
                                      <div key={`url-${i}`} className="flex items-center gap-2">
                                        <input
                                          className={inputClass}
                                          value={photo}
                                          onChange={(e) => {
                                            const photos = [...(content.photos ?? [])];
                                            photos[i] = e.target.value;
                                            set("photos", photos);
                                          }}
                                        />
                                        <button
                                          onClick={() =>
                                            set("photos", (content.photos ?? []).filter((_, j) => j !== i))
                                          }
                                          aria-label="Hapus foto"
                                          className="p-2.5 rounded-full text-on-surface-variant hover:text-primary transition-colors shrink-0"
                                        >
                                          <X className="h-5 w-5" />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      onClick={() => set("photos", [...(content.photos ?? []), ""])}
                                      className="inline-flex items-center gap-2 self-start text-label-lg font-semibold text-primary hover:bg-primary-fixed/30 rounded-full px-4 py-2 transition-colors"
                                    >
                                      <Plus className="h-4 w-4" /> Tambah URL
                                    </button>
                                  </div>
                                </details>
                              </div>
                              <div>
                                <label className="block text-label-lg font-semibold text-on-surface mb-1.5">
                                  Musik Latar
                                </label>
                                <p className="text-label-md text-on-surface-variant mb-3">
                                  Pilih dari galeri royalty-free, atau (versi berbayar) tempel
                                  URL MP3 sendiri.
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {MUSIC_LIBRARY.map((t) => {
                                    const active = content.musicUrl === t.url;
                                    return (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => set("musicUrl", t.url)}
                                        className={cn(
                                          "text-left rounded-xl border px-3 py-2 transition-all",
                                          active
                                            ? "border-transparent text-white shadow-md"
                                            : "border-outline-variant bg-white text-on-surface-variant hover:border-primary/40"
                                        )}
                                        style={active ? { background: "var(--color-primary)" } : undefined}
                                      >
                                        <span className="block text-label-md font-semibold">
                                          {t.title}
                                        </span>
                                        <span className="block text-label-sm opacity-80">
                                          {t.artist} · {t.license}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {plan.music ? (
                                  <div className="relative mt-3">
                                    <Music className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
                                    <input
                                      className={`${inputClass} pl-11`}
                                      placeholder="https://…/lagu.mp3"
                                      value={content.musicUrl ?? ""}
                                      onChange={(e) => set("musicUrl", e.target.value)}
                                    />
                                  </div>
                                ) : (
                                  <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-3 mt-3 text-center">
                                    <p className="text-label-md text-on-surface-variant">
                                      URL MP3 sendiri hanya untuk versi berbayar. Galeri di atas
                                      gratis digunakan.
                                    </p>
                                  </div>
                                )}

                                <div className="mt-4">
                                  <label className="block text-label-lg font-semibold text-on-surface mb-1.5">
                                    Video Ucapan (URL)
                                  </label>
                                  <input
                                    className={inputClass}
                                    placeholder="https://…/video.mp4"
                                    value={content.videoUrl ?? ""}
                                    onChange={(e) => set("videoUrl", e.target.value)}
                                  />
                                  <p className="text-label-md text-on-surface-variant mt-1.5">
                                    Upload video menyusul (butuh akun berbayar + storage). Untuk
                                    sekarang cukup tempel URL video publik.
                                  </p>
                                </div>
                              </div>

                              <div className="rounded-2xl bg-surface-container-low p-4 border border-outline-variant/30">
                                <MoodSelector
                                  value={content.mood}
                                  onChange={(m) => set("mood", m)}
                                />
                              </div>

                              <div className="border-t border-outline-variant/30 pt-5">
                                <label className="block text-label-lg font-semibold text-on-surface mb-1">
                                  Timeline / Momen Penting (Opsional)
                                </label>
                                <p className="text-body-md text-on-surface-variant mb-4">
                                  Tambahkan tanggal dan momen spesial kalian (misal: Kencan Pertama, Jadian).
                                </p>
                                <div className="space-y-3">
                                  {(content.timeline ?? []).map((item, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-label-md font-bold text-primary">Momen #{i + 1}</span>
                                        <button
                                          onClick={() => {
                                            const t = [...(content.timeline ?? [])];
                                            t.splice(i, 1);
                                            set("timeline", t);
                                          }}
                                          className="text-red-500 hover:text-red-700 text-label-md font-semibold"
                                        >
                                          Hapus
                                        </button>
                                      </div>
                                      <div className="grid sm:grid-cols-2 gap-3">
                                        <input
                                          className={inputClass}
                                          placeholder="Tanggal (cth: 14 Feb 2024)"
                                          value={item.date}
                                          onChange={(e) => {
                                            const t = [...(content.timeline ?? [])];
                                            t[i] = { ...t[i], date: e.target.value };
                                            set("timeline", t);
                                          }}
                                        />
                                        <input
                                          className={inputClass}
                                          placeholder="Judul Momen (cth: Kencan Pertama)"
                                          value={item.title}
                                          onChange={(e) => {
                                            const t = [...(content.timeline ?? [])];
                                            t[i] = { ...t[i], title: e.target.value };
                                            set("timeline", t);
                                          }}
                                        />
                                      </div>
                                      <input
                                        className={inputClass}
                                        placeholder="Deskripsi singkat (opsional)"
                                        value={item.description ?? ""}
                                        onChange={(e) => {
                                          const t = [...(content.timeline ?? [])];
                                          t[i] = { ...t[i], description: e.target.value };
                                          set("timeline", t);
                                        }}
                                      />
                                    </div>
                                  ))}
                                  <button
                                    onClick={() =>
                                      set("timeline", [
                                        ...(content.timeline ?? []),
                                        { date: "", title: "", description: "" },
                                      ])
                                    }
                                    className="inline-flex items-center gap-2 text-label-lg font-semibold text-primary hover:bg-primary-fixed/30 rounded-full px-4 py-2 transition-colors"
                                  >
                                    <Plus className="h-4 w-4" /> Tambah Momen Timeline
                                  </button>
                                </div>
                              </div>
                              <button
                                onClick={() => switchSection("selesai")}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-200"
                              >
                                Siap kirim kejutan <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          {section.id === "tambahan" && (
                            <div className="space-y-5">
                              <p className="text-label-md text-on-surface-variant leading-relaxed">
                                Opsional. Semua efek di bawah langsung bisa dicoba di Live Preview.
                              </p>

                              <div className="space-y-2.5">
                                {(Object.keys(ADDON_PRICING) as AddonKey[]).map((key) => {
                                  const addon = ADDON_PRICING[key];
                                  const active = selectedAddons.has(key);
                                  return (
                                    <div key={key}>
                                      <button
                                        type="button"
                                        onClick={() => toggleAddon(key)}
                                        aria-pressed={active}
                                        aria-expanded={active}
                                        className={cn(
                                          "w-full text-left rounded-2xl border px-4 py-3 transition-all flex items-start gap-3",
                                          active
                                            ? "border-primary bg-primary-fixed/20 ring-1 ring-primary/20"
                                            : "border-outline-variant/50 bg-white hover:border-primary/40"
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                                            active
                                              ? "bg-primary border-primary text-white"
                                              : "border-outline-variant"
                                          )}
                                        >
                                          {active && <Check className="h-3.5 w-3.5" />}
                                        </span>
                                        <span className="flex-1 min-w-0">
                                          <span className="flex items-baseline justify-between gap-2">
                                            <span className="text-label-lg font-semibold text-on-surface">
                                              {addon.label}
                                            </span>
                                            <span className="text-label-md font-bold text-primary shrink-0">
                                              +{formatPrice(addon.amount)}
                                            </span>
                                          </span>
                                          <span className="block text-label-md text-on-surface-variant mt-0.5">
                                            {ADDON_NOTES[key]}
                                          </span>
                                        </span>
                                      </button>

                                      {active && (
                                        <div className="mt-2 rounded-2xl border border-outline-variant/40 bg-surface-container-low/60 p-3">
                                          {key === "custom_slug" && (
                                            <div>
                                              <label className="block text-label-md font-semibold text-on-surface mb-1.5">
                                                Alamat Link Cantik
                                              </label>
                                              <input
                                                className={inputClass}
                                                placeholder="cth: ari-nadia"
                                                value={slugInput}
                                                onChange={(e) => setSlugInput(e.target.value)}
                                              />
                                              <p
                                                className={`text-label-md mt-1.5 ${
                                                  !slugInput.trim()
                                                    ? "text-on-surface-variant"
                                                    : slugCheck.valid
                                                      ? "text-green-600"
                                                      : "text-red-500"
                                                }`}
                                              >
                                                {!slugInput.trim()
                                                  ? "Link jadi: /u/…"
                                                  : slugCheck.valid
                                                    ? `Link jadi: /u/${slugCheck.normalized}`
                                                    : slugCheck.reason}
                                              </p>
                                            </div>
                                          )}

                                          {key === "intimate_gate" && (
                                            <div>
                                              <label className="block text-label-md font-semibold text-on-surface mb-1.5">
                                                PIN Rahasia (4–6 angka)
                                              </label>
                                              <input
                                                type="password"
                                                inputMode="numeric"
                                                maxLength={6}
                                                className={inputClass}
                                                placeholder="cth: 1204"
                                                value={pinInput}
                                                onChange={(e) =>
                                                  setPinInput(
                                                    e.target.value.replace(/\D/g, "").slice(0, 6)
                                                  )
                                                }
                                              />
                                              <p className="text-label-md text-on-surface-variant mt-1.5">
                                                Penerima harus mengetik PIN ini. Coba di preview
                                                sekarang.
                                              </p>
                                            </div>
                                          )}

                                          {key === "touch_particles" && (
                                            <div>
                                              <p className="text-label-md font-semibold text-on-surface mb-1.5">
                                                Pilih Efek Sentuhan
                                              </p>
                                              <div className="grid grid-cols-3 gap-2">
                                                {PARTICLE_OPTIONS.map((p) => (
                                                  <button
                                                    key={p.key}
                                                    type="button"
                                                    onClick={() => setParticleStyle(p.key)}
                                                    aria-pressed={particleStyle === p.key}
                                                    className={cn(
                                                      "rounded-2xl border px-2 py-2.5 text-label-md font-semibold transition-all",
                                                      particleStyle === p.key
                                                        ? "border-primary bg-primary-fixed/20 text-primary ring-1 ring-primary/20"
                                                        : "border-outline-variant/50 bg-white text-on-surface-variant"
                                                    )}
                                                  >
                                                    <span className="block text-lg mb-0.5">
                                                      {p.emoji}
                                                    </span>
                                                    {p.label}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {key === "custom_qr" && (
                                            <p className="text-label-md text-on-surface-variant leading-relaxed">
                                              Foto pertama di galeri otomatis dipakai di tengah QR
                                              Code. Tambahkan foto di bagian Galeri &amp; Musik.
                                            </p>
                                          )}

                                          {key === "love_receipt" && (
                                            <p className="text-label-md text-on-surface-variant leading-relaxed">
                                              Struk memakai nama &amp; tanggal dari halaman ini.
                                              Coba tombol <strong>Struk Cinta</strong> di Live Preview.
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {selectedAddons.size > 0 && (
                                <div className="rounded-2xl bg-surface-container-low border border-outline-variant/30 p-4 space-y-2">
                                  <div className="flex justify-between text-label-md">
                                    <span className="text-on-surface-variant">Harga dasar</span>
                                    <span className="font-semibold text-on-surface">
                                      {formatPrice(checkoutCalc.baseAmount)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-label-md">
                                    <span className="text-on-surface-variant">
                                      {selectedAddons.size} add-on
                                    </span>
                                    <span className="font-semibold text-on-surface">
                                      {formatPrice(checkoutCalc.addonSubtotal)}
                                    </span>
                                  </div>
                                  {checkoutCalc.discount > 0 && (
                                    <div className="flex justify-between text-label-md text-green-700">
                                      <span>Diskon paket</span>
                                      <span className="font-bold">
                                        −{formatPrice(checkoutCalc.discount)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between pt-2 border-t border-outline-variant/40">
                                    <span className="text-label-lg font-semibold text-on-surface">
                                      Total
                                    </span>
                                    <span className="text-title-md font-bold text-primary">
                                      {formatPrice(checkoutCalc.totalAmount)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <button
                                onClick={() => switchSection("selesai")}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-200"
                              >
                                Siap kirim kejutan <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          {section.id === "selesai" && (
                            <div className="space-y-5">
                              {pricing.isPromo && (
                                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-amber-900 text-xs flex items-center justify-between">
                                  <span>🔥 Promo perkenalan (sisa {pricing.remainingQuota} kuota)</span>
                                  <span className="font-bold">{formatPrice(checkoutCalc.baseAmount)}</span>
                                </div>
                              )}
                              <div className="rounded-2xl bg-surface-container-low p-5 space-y-3">
                                {[
                                  ["Template", template.name],
                                  ["Untuk", content.toName || "—"],
                                  ["Dari", content.fromName || "—"],
                                  ["Judul", content.title || "—"],
                                  ["Pesan", `${content.message?.length ?? 0} karakter`],
                                  ["Foto", `${content.photos?.filter(Boolean).length ?? 0} foto`],
                                  [
                                    "Tambahan",
                                    selectedAddons.size > 0
                                      ? `${selectedAddons.size} add-on`
                                      : "Tidak ada",
                                  ],
                                  ...(checkoutCalc.discount > 0
                                    ? [["Diskon paket", `−${formatPrice(checkoutCalc.discount)}`]]
                                    : []),
                                  ["Total", `${formatPrice(checkoutCalc.totalAmount)} (sekali bayar)`],
                                ].map(([label, value]) => (
                                  <div key={label} className="flex justify-between gap-4">
                                    <span className="text-body-md text-on-surface-variant">{label}</span>
                                    <span className="text-body-md font-semibold text-on-surface text-right">
                                      {value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <p className="text-label-md text-on-surface-variant leading-relaxed">
                                ✅ Link aktif selamanya · ✅ Edit 7 hari setelah bayar · ✅ Bisa dibagikan via
                                link & QR · ✅ Jejak kunjungan real-time
                              </p>
                              <button
                                onClick={() => void goToPayment()}
                                disabled={saving || !canPay}
                                title={!canPay ? "Lengkapi Identitas & Pesan dulu" : undefined}
                                className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white text-label-lg font-semibold rounded-full shadow-[0_8px_30px_rgba(222,112,56,0.35)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"
                              >
                                {saving ? (
                                  <>
                                    <Loader2 className="h-5 w-5 animate-spin" /> Menyimpan…
                                  </>
                                ) : isPaid ? (
                                  <>
                                    <Check className="h-4.5 w-4.5" />
                                    Simpan Perubahan
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="h-4.5 w-4.5" />
                                    Lanjut ke Pembayaran — {formatPrice(checkoutCalc.totalAmount)}
                                  </>
                                )}
                              </button>
                              {!canPay && (
                                <p className="text-label-md text-on-surface-variant text-center">
                                  Lengkapi bagian{" "}
                                  <button onClick={() => switchSection(!identitasComplete ? "identitas" : "pesan")} className="text-primary font-semibold underline underline-offset-2">
                                    {!identitasComplete ? "Identitas" : "Pesan"}
                                  </button>{" "}
                                  dulu ya
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* PANEL KANAN — live preview permanen */}
          <div className="lg:sticky lg:top-24 self-start">
            <div className="flex items-center justify-between mb-3">
              <p className="text-label-lg font-semibold text-on-surface-variant flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Live Preview
              </p>
              <div className="flex items-center rounded-full bg-white border border-outline-variant/30 p-1" role="group" aria-label="Mode preview">
                {(
                  [
                    { mode: "mobile" as const, icon: "📱", label: "Mobile" },
                    { mode: "desktop" as const, icon: "🖥️", label: "Desktop" },
                  ]
                ).map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => switchPreviewMode(mode)}
                    aria-pressed={previewMode === mode}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-label-md font-semibold transition-all ${
                      previewMode === mode
                        ? "bg-primary-fixed/50 text-primary"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span aria-hidden>{icon}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <motion.div
              ref={previewFrameRef}
              initial={{ opacity: 0.6, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className={`relative rounded-3xl overflow-hidden border-4 border-white shadow-[0_20px_60px_rgba(222,112,56,0.2)] transition-[max-width] duration-300 ${
                previewMode === "mobile" ? "max-w-[375px] mx-auto" : "max-w-full"
              }`}
            >
              <div className="h-[560px] overflow-y-auto bg-surface">
                <TemplateRenderer content={previewContent} preview />
              </div>

              {/* Efek add-on — dirender di dalam frame, tanpa menyentuh template */}
              {selectedAddons.has("touch_particles") && (
                <ParticleTouch type={particleStyle} container={previewFrameRef} />
              )}

              {selectedAddons.has("intimate_gate") && previewGateOpen && (
                <GateOverlay
                  toName={content.toName || "Kamu"}
                  fromName={content.fromName || "Aku"}
                  gateType="pin"
                  gateData={{ pin: pinInput }}
                  variant="embedded"
                  onUnlock={() => setPreviewGateOpen(false)}
                />
              )}

              {selectedAddons.has("intimate_gate") && !previewGateOpen && (
                <button
                  onClick={() => setPreviewGateOpen(true)}
                  className="absolute top-3 left-3 z-20 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-lg border border-rose-200/60 backdrop-blur hover:text-rose-600 transition-all"
                >
                  🔒 Tampilkan Gerbang
                </button>
              )}

              {selectedAddons.has("love_receipt") && (
                <LoveReceiptModal
                  toName={content.toName || "Kamu"}
                  fromName={content.fromName || "Aku"}
                  variant="embedded"
                />
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* CTA mobile mengambang */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur border-t border-outline-variant/30 px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-label-md text-on-surface-variant">Total sekali bayar</p>
          <p className="text-title-md font-bold text-primary">
            {formatPrice(checkoutCalc.totalAmount)}
          </p>
        </div>
        <button
          onClick={() => void goToPayment()}
          disabled={saving || !canPay}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-label-lg font-semibold rounded-full shadow-[0_8px_30px_rgba(222,112,56,0.35)] disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <CreditCard className="h-4.5 w-4.5" />}
          Bayar
        </button>
      </div>

      <ShortcutsHelpModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
