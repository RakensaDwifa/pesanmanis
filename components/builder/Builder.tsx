"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarHeart,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CloudUpload,
  CreditCard,
  Eye,
  Film,
  Flame,
  HelpCircle,
  ImagePlus,
  KeyRound,
  Keyboard,
  Loader2,
  Lock,
  Mail,
  MessageSquareHeart,
  Monitor,
  PartyPopper,
  PencilLine,
  Plus,
  Redo2,
  RotateCcw,
  Smartphone,
  Sparkles,
  Undo2,
  UserRound,
  X,
} from "lucide-react";
import { getTemplate, fillContentDefaults } from "@/lib/templates";
import type { UcapanContent } from "@/lib/types";
import {
  clearDraft,
  getDraft,
  getUcapan,
  saveDraft,
  savePaidUcapan,
} from "@/lib/store";
import { makeUcapanId } from "@/lib/templates";
import { createClient } from "@/lib/supabase/client";
import { isRemote, supabaseUrl } from "@/lib/supabase/config";
import { compressImage } from "@/lib/image";
import TemplateRenderer from "@/components/templates/registry";
import MoodSelector from "@/components/MoodSelector";
import MusicPicker from "./MusicPicker";
import {
  formatSeconds,
  getDefaultGalleryTrack,
  getMusicDisplayInfo,
} from "@/lib/music-library";
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
import { AnalyticsEvents } from "@/lib/analytics";
import { usePricing } from "@/lib/use-pricing";
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
import VoiceNoteRecorder from "@/components/builder/VoiceNoteRecorder";
import VoiceNotePlayer from "@/components/view/VoiceNotePlayer";
import { smoothScrollTo } from "@/components/ui/smooth-scroll";
import {
  toLocalDatetimeInputValue,
  fromLocalDatetimeInputValue,
  detectIndonesianTimezone,
  isUcapanCountdownLocked,
} from "@/lib/unlock-schedule";

const MINUTE_SUBSCRIBE = () => () => {};
let cachedClientMinDatetime = "";
function getClientMinUnlockDatetime(): string {
  if (!cachedClientMinDatetime) {
    cachedClientMinDatetime = toLocalDatetimeInputValue(
      new Date(Date.now() + 60_000).toISOString()
    );
  }
  return cachedClientMinDatetime;
}

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
  intimate_gate: "Harus masukkan PIN atau jawab kuis nostalgia sebelum surat terbuka",
  love_receipt: "Struk cinta bisa diunduh ke galeri HP",
  voice_note: "Rekam suara langsung atau unggah audio pesan pribadi (maks 3 menit)",
};

const TRIVIA_PROMPTS = [
  "Tanggal jadian kita?",
  "Tempat kencan pertama kita?",
  "Makanan favoritku?",
] as const;

const PARTICLE_OPTIONS = [
  { key: "hearts", label: "Hati", emoji: "❤️" },
  { key: "roses", label: "Mawar", emoji: "🌹" },
  { key: "sparkles", label: "Kilau", emoji: "✨" },
] as const;

/** Kunci sessionStorage untuk membawa pilihan add-on ke halaman checkout. */
export function addonsStorageKey(ucapanId: string) {
  return `pm:addons:${ucapanId}`;
}

/** Kunci localStorage untuk menjaga draft pilihan add-on sebelum login / sebelum ucapan dibuat. */
function draftAddonsStorageKey(templateSlug: string) {
  return `pm:draft-addons:${templateSlug}`;
}

type SectionId = (typeof SECTIONS)[number]["id"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emptySubscribe = () => () => {};

function readStoredPreviewMode(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "mobile";
  try {
    const stored = window.localStorage.getItem("up_preview_mode");
    return stored === "desktop" ? "desktop" : "mobile";
  } catch {
    return "mobile";
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("gagal membaca gambar"));
    reader.onerror = () => reject(new Error("gagal membaca gambar"));
    reader.readAsDataURL(blob);
  });
}

function mapServerSaveError(code?: string, fallbackMessage?: string): string {
  if (fallbackMessage) return fallbackMessage;
  switch (code) {
    case "EDIT_WINDOW_EXPIRED":
      return "Masa edit 7 hari sudah habis.";
    case "TO_NAME_INVALID":
      return "Nama penerima wajib diisi (maks. 80 karakter).";
    case "FROM_NAME_INVALID":
      return "Nama pengirim wajib diisi (maks. 80 karakter).";
    case "TITLE_TOO_LONG":
      return "Judul surat maksimal 120 karakter.";
    case "MESSAGE_TOO_LONG":
      return "Isi pesan maksimal 5.000 karakter.";
    case "PHOTO_URL_INVALID":
    case "PHOTO_URL_TOO_LONG":
    case "PHOTOS_INVALID":
      return "URL foto tidak valid (gunakan HTTPS dan maks. 10 foto).";
    case "MUSIC_URL_INVALID":
      return "URL musik latar harus berupa tautan HTTPS/YouTube atau jalur galeri yang valid.";
    case "VIDEO_URL_INVALID":
      return "URL video harus berupa tautan HTTPS/YouTube yang valid.";
    case "VOICE_NOTE_URL_INVALID":
      return "URL pesan suara tidak valid. Coba rekam atau unggah ulang.";
    case "UNLOCK_AT_INVALID":
      return "Format jadwal waktu buka (countdown) tidak valid.";
    case "TEMPLATE_UNAVAILABLE":
      return "Template ini sedang dalam pengembangan dan belum tersedia.";
    case "TEMPLATE_LOCKED_AFTER_PAYMENT":
      return "Template tidak dapat diganti setelah ucapan aktif dibayar.";
    case "EMAIL_INVALID":
      return "Format email tidak valid.";
    case "RATE_LIMIT_EXCEEDED":
      return "Terlalu banyak permintaan. Coba lagi dalam 1 menit.";
    default:
      return "Gagal menyimpan ucapan. Coba lagi ya.";
  }
}

export default function BuilderPage({ slug, editId }: { slug: string; editId?: string }) {
  const pricing = usePricing(slug);
  const template = getTemplate(slug);
  const router = useRouter();

  // Deterministic SSR-safe initial state (hydrated asynchronously in useEffect below).
  // For new ucapan, pre-select the first gallery MP3 matching the template's occasion if available.
  const [content, setContent] = useState<Partial<UcapanContent>>(() => {
    const defaultTrack = !editId ? getDefaultGalleryTrack(template?.type) : undefined;
    return fillContentDefaults({
      templateSlug: slug,
      ...(defaultTrack ? { musicUrl: defaultTrack.url } : {}),
    });
  });
  const [isPaid, setIsPaid] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const demoAudioBlobRef = useRef<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [openSection, setOpenSection] = useState<SectionId | null>("identitas");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [previewInteractive, setPreviewInteractive] = useState(false);
  const [previewReplayKey, setPreviewReplayKey] = useState(0);
  const [videoPanelToggle, setVideoPanelToggle] = useState<boolean | null>(null);
  const [timelinePanelToggle, setTimelinePanelToggle] = useState<boolean | null>(null);
  const [countdownPanelToggle, setCountdownPanelToggle] = useState<boolean | null>(null);
  const minUnlockDatetime = useSyncExternalStore(
    MINUTE_SUBSCRIBE,
    getClientMinUnlockDatetime,
    () => ""
  );
  const toNameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const editorGridRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const mobileTabBarRef = useRef<HTMLDivElement | null>(null);
  const sectionHeaderRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({});
  const sectionScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storedPreviewMode = useSyncExternalStore(
    emptySubscribe,
    readStoredPreviewMode,
    () => "mobile" as const
  );
  const [overridePreviewMode, setOverridePreviewMode] = useState<"mobile" | "desktop" | null>(null);
  const previewMode = overridePreviewMode ?? storedPreviewMode;

  // ── Add-on (monetisasi) ──
  const [selectedAddons, setSelectedAddons] = useState<Set<AddonKey>>(new Set());
  const [slugInput, setSlugInput] = useState("");
  const [slugAvailability, setSlugAvailability] = useState<{
    status: "idle" | "checking" | "available" | "taken" | "error";
    reason?: string;
    checkedSlug?: string;
  }>({ status: "idle" });
  const [gateMode, setGateMode] = useState<"pin" | "trivia">("pin");
  const [pinInput, setPinInput] = useState("");
  const [triviaQuestion, setTriviaQuestion] = useState("");
  const [triviaAnswer, setTriviaAnswer] = useState("");
  const [particleStyle, setParticleStyle] = useState<"hearts" | "roses" | "sparkles">("hearts");
  const [previewGateOpen, setPreviewGateOpen] = useState(false);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);

  const applyContent = useCallback(
    (next: Partial<UcapanContent>) => setContent(next),
    []
  );
  const { canUndo, canRedo, undo, redo, markRestored } =
    useContentHistory<Partial<UcapanContent>>(content, applyContent);

  const toggleAddon = (key: AddonKey) => {
    if (isPaid) return;
    if (!selectedAddons.has(key) && key === "intimate_gate") setPreviewGateOpen(true);
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (key === "custom_slug") {
          setSlugInput("");
          setSlugAvailability({ status: "idle" });
        }
        if (key === "intimate_gate") {
          setGateMode("pin");
          setPinInput("");
          setTriviaQuestion("");
          setTriviaAnswer("");
        }
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const slugCheck = validateSlugFormat(slugInput);
  const checkoutCalc = calculateCheckoutTotal(pricing.amount, Array.from(selectedAddons));

  const switchPreviewMode = useCallback((mode: "mobile" | "desktop") => {
    setOverridePreviewMode(mode);
    try {
      window.localStorage.setItem("up_preview_mode", mode);
    } catch {
      // ignore
    }
  }, []);

  const remoteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftHydratedRef = useRef(false);

  // Live check ketersediaan custom slug ke /api/ucapan/check-slug (debounced 450ms)
  useEffect(() => {
    if (isPaid || !selectedAddons.has("custom_slug") || !slugInput.trim() || !slugCheck.valid) {
      return;
    }
    const normalized = slugCheck.normalized;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSlugAvailability({ status: "checking", checkedSlug: normalized });
      try {
        const qs = new URLSearchParams({ slug: normalized });
        if (editId) qs.set("ucapanId", editId);
        const res = await fetch(`/api/ucapan/check-slug?${qs.toString()}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as {
          available?: boolean;
          reason?: string;
        };
        if (controller.signal.aborted) return;
        if (res.ok && json.available) {
          setSlugAvailability({ status: "available", checkedSlug: normalized });
        } else if (res.ok && json.available === false) {
          setSlugAvailability({
            status: "taken",
            reason: json.reason ?? "Alamat ini sudah dipakai orang lain.",
            checkedSlug: normalized,
          });
        } else {
          setSlugAvailability({
            status: "error",
            reason: json.reason ?? "Gagal memeriksa ketersediaan alamat.",
            checkedSlug: normalized,
          });
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setSlugAvailability({
          status: "error",
          reason: "Tidak dapat mengecek ketersediaan alamat.",
          checkedSlug: normalized,
        });
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [editId, isPaid, selectedAddons, slugCheck.normalized, slugCheck.valid, slugInput]);

  // Pulihkan draft lokal & remote (mode buat baru, !editId) tanpa hydration mismatch
  useEffect(() => {
    if (editId) return;
    let cancelled = false;
    void (async () => {
      // 1) Pulihkan draft konten & pilihan add-on dari localStorage
      let localDraft: UcapanContent | null = null;
      try {
        localDraft = getDraft(slug);
        if (localDraft && !cancelled) {
          setContent(fillContentDefaults({ ...localDraft, templateSlug: slug }));
          markRestored();
        }
        const raw = window.localStorage.getItem(draftAddonsStorageKey(slug));
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as {
            addons?: AddonKey[];
            customSlug?: string;
            gateType?: "pin" | "trivia";
            pin?: string;
            question?: string;
            answer?: string;
            particleStyle?: "hearts" | "roses" | "sparkles";
          };
          if (Array.isArray(parsed.addons)) setSelectedAddons(new Set(parsed.addons));
          if (parsed.customSlug) setSlugInput(parsed.customSlug);
          if (parsed.gateType === "trivia" || parsed.gateType === "pin") {
            setGateMode(parsed.gateType);
          }
          if (parsed.pin) setPinInput(parsed.pin);
          if (parsed.question) setTriviaQuestion(parsed.question);
          if (parsed.answer) setTriviaAnswer(parsed.answer);
          if (parsed.particleStyle && ["hearts", "roses", "sparkles"].includes(parsed.particleStyle)) {
            setParticleStyle(parsed.particleStyle);
          }
        }
      } catch {
        // ignore
      } finally {
        draftHydratedRef.current = true;
      }

      // 2) Sinkronkan draft remote jika lebih baru dari lokal
      if (!isRemote() || cancelled) return;
      try {
        const [remote, localAt] = await Promise.all([
          getDraftRemote(slug),
          Promise.resolve(getLocalSavedAt(slug)),
        ]);
        if (cancelled || !remote) return;
        if (remote.updatedAt > localAt) {
          // Urutan spread benar: remote menimpa nilai lokal/default lama
          setContent((c) => fillContentDefaults({ ...c, ...remote.content, templateSlug: slug }));
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
  }, [slug, editId, markRestored]);

  // Simpan draft add-on ke localStorage selama pembuatan baru (!editId)
  useEffect(() => {
    if (editId || !draftHydratedRef.current) return;
    try {
      window.localStorage.setItem(
        draftAddonsStorageKey(slug),
        JSON.stringify({
          addons: Array.from(selectedAddons),
          customSlug: slugInput,
          gateType: gateMode,
          pin: pinInput,
          question: triviaQuestion,
          answer: triviaAnswer,
          particleStyle,
        })
      );
    } catch {
      // ignore
    }
  }, [slug, editId, selectedAddons, slugInput, gateMode, pinInput, triviaQuestion, triviaAnswer, particleStyle]);

  // Auto-save draft lokal & remote (debounced 3 detik)
  useEffect(() => {
    if (!template || editId || !draftHydratedRef.current) return;
    saveDraft(slug, content);
    markLocalSaved(slug);

    if (!isRemote()) return;
    if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    remoteSaveTimer.current = setTimeout(async () => {
      setSyncStatus("saving");
      const result = await saveDraftRemote(content);
      setSyncStatus(
        result === "ok" ? "saved" : result === "skipped" ? "idle" : "error"
      );
    }, 3000);
    return () => {
      if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    };
  }, [content, slug, template, editId]);

  // Muat data ucapan pada mode edit (?edit=id)
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    void (async () => {
      // 1) Pulihkan data lokal (Demo Mode) & sessionStorage add-on
      try {
        const localExisting = getUcapan(editId);
        if (localExisting && !cancelled) {
          setContent(fillContentDefaults(localExisting));
          setIsPaid(Boolean(localExisting.paid));
          markRestored();
        }
        const raw = sessionStorage.getItem(addonsStorageKey(editId));
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as {
            addons?: AddonKey[];
            customSlug?: string;
            gateType?: "pin" | "trivia";
            pin?: string;
            question?: string;
            answer?: string;
            particleStyle?: "hearts" | "roses" | "sparkles";
          };
          if (Array.isArray(parsed.addons)) setSelectedAddons(new Set(parsed.addons));
          if (parsed.customSlug) setSlugInput(parsed.customSlug);
          if (parsed.gateType === "trivia" || parsed.gateType === "pin") {
            setGateMode(parsed.gateType);
          }
          if (parsed.pin) setPinInput(parsed.pin);
          if (parsed.question) setTriviaQuestion(parsed.question);
          if (parsed.answer) setTriviaAnswer(parsed.answer);
          if (parsed.particleStyle) setParticleStyle(parsed.particleStyle);
        }
      } catch {
        // ignore
      }

      if (!isRemote() || cancelled) return;
      try {
        const r = await fetch(`/api/ucapan/${encodeURIComponent(editId)}`);
        const json = await r.json();
        if (!cancelled && json.ok && json.ucapan) {
          const u = json.ucapan;
          setContent(fillContentDefaults(u));
          setIsPaid(Boolean(u.paid));
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
            if (u.gateType === "trivia") {
              setGateMode("trivia");
              if (u.gateData?.question) setTriviaQuestion(String(u.gateData.question));
              if (u.gateData?.answer) setTriviaAnswer(String(u.gateData.answer));
            } else {
              setGateMode("pin");
              if (u.gateData?.pin) setPinInput(String(u.gateData.pin));
            }
          } else if (!u.paid && u.draftAddons?.addons?.includes("intimate_gate")) {
            restored.add("intimate_gate");
            if (u.draftAddons.gateType === "trivia") {
              setGateMode("trivia");
              if (u.draftAddons.question) setTriviaQuestion(String(u.draftAddons.question));
              if (u.draftAddons.answer) setTriviaAnswer(String(u.draftAddons.answer));
            } else if (u.draftAddons.pin) {
              setGateMode("pin");
              setPinInput(String(u.draftAddons.pin));
            }
          }
          if (u.receiptEnabled) restored.add("love_receipt");
          if (u.voiceNoteEnabled) restored.add("voice_note");
          if (restored.size > 0) setSelectedAddons(restored);
          markRestored();
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editId, markRestored]);

  const previewContent = useMemo(() => fillContentDefaults(content), [content]);

  const isValidEmail = useCallback((email: string) => EMAIL_REGEX.test(email.trim()), []);

  const identitasComplete = Boolean(
    content.toName?.trim() && content.email?.trim() && isValidEmail(content.email ?? "")
  );
  const pesanComplete = Boolean(content.message?.trim());
  const canPay = identitasComplete && pesanComplete;

  const set = <K extends keyof UcapanContent>(key: K, value: UcapanContent[K]) =>
    setContent((c) => ({ ...c, [key]: value }));

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const currentCount = (content.photos ?? []).filter(Boolean).length;
    const remainingSlots = Math.max(0, 10 - currentCount);
    if (remainingSlots === 0) {
      toast.error("Maksimal 10 foto per ucapan.");
      return;
    }
    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.info(`Hanya ${remainingSlots} foto pertama yang diunggah (batas 10 foto).`);
    }
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      if (isRemote()) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.info("Masuk dulu ya untuk mengunggah foto. Draft ucapanmu tetap tersimpan!");
          router.push(`/login?next=${encodeURIComponent(`/buat/${slug}${editId ? `?edit=${editId}` : ""}`)}`);
          return;
        }
        for (const file of selectedFiles) {
          const blob = await compressImage(file);
          const ext = blob.type === "image/webp" ? "webp" : "jpg";
          // Simpan di bawah folder milik user (<user.id>/<uuid>.<ext>) untuk keamanan Storage RLS
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage
            .from("foto")
            .upload(path, blob, { contentType: blob.type });
          if (error) throw error;
          const url = `${supabaseUrl()}/storage/v1/object/public/foto/${path}`;
          uploadedUrls.push(url);
        }
      } else {
        // Demo Mode lokal: simpan gambar terkompres sebagai Data URL di browser
        for (const file of selectedFiles) {
          const blob = await compressImage(file, 900, 0.78);
          const dataUrl = await blobToDataUrl(blob);
          uploadedUrls.push(dataUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setContent((c) => ({
          ...c,
          photos: [...(c.photos ?? []).filter(Boolean), ...uploadedUrls].slice(0, 10),
        }));
      }
      toast.success("Foto berhasil diunggah");
    } catch {
      toast.error("Gagal mengunggah foto. Coba lagi ya.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (demoAudioBlobRef.current) {
        URL.revokeObjectURL(demoAudioBlobRef.current);
        demoAudioBlobRef.current = null;
      }
    };
  }, []);

  const uploadAudio = async (
    file: File
  ): Promise<{ url: string; fileName: string } | null> => {
    setUploadingAudio(true);
    try {
      if (isRemote()) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.info("Masuk dulu ya untuk mengunggah audio. Draft ucapanmu tetap tersimpan!");
          router.push(
            `/login?next=${encodeURIComponent(`/buat/${slug}${editId ? `?edit=${editId}` : ""}`)}`
          );
          return null;
        }
        const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
        const ext = ["mp3", "m4a", "wav", "ogg", "webm"].includes(rawExt) ? rawExt : "mp3";
        const baseName = file.name
          .replace(/\.[^/.]+$/, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "lagu";
        // Simpan di bawah folder milik user (<user.id>/<uuid>-<slug>.<ext>) untuk keamanan Storage RLS
        const path = `${user.id}/${crypto.randomUUID()}-${baseName}.${ext}`;
        const contentType = file.type || (ext === "m4a" ? "audio/mp4" : `audio/${ext === "mp3" ? "mpeg" : ext}`);
        const { error } = await supabase.storage
          .from("musik")
          .upload(path, file, { contentType });
        if (error) throw error;
        const url = `${supabaseUrl()}/storage/v1/object/public/musik/${path}`;
        toast.success("File audio berhasil diunggah");
        return { url, fileName: file.name };
      }

      // Demo Mode lokal: gunakan Object URL dalam sesi browser (tidak membebani kuota localStorage)
      if (demoAudioBlobRef.current) {
        URL.revokeObjectURL(demoAudioBlobRef.current);
      }
      const blobUrl = URL.createObjectURL(file);
      demoAudioBlobRef.current = blobUrl;
      toast.success("Audio siap diputar (Mode Demo lokal)");
      return { url: blobUrl, fileName: file.name };
    } catch {
      toast.error("Gagal mengunggah file audio. Pastikan format MP3/M4A/WAV maks. 15 MB.");
      return null;
    } finally {
      setUploadingAudio(false);
    }
  };

  const addonsInvalidReason = (): string | null => {
    if (isPaid) return null;
    if (selectedAddons.has("custom_slug")) {
      if (!slugInput.trim()) return "Isi dulu alamat link cantikmu.";
      if (!slugCheck.valid) return slugCheck.reason ?? "Alamat link tidak valid.";
      if (
        slugAvailability.checkedSlug === slugCheck.normalized &&
        slugAvailability.status === "taken"
      ) {
        return slugAvailability.reason ?? "Alamat custom sudah dipakai orang lain.";
      }
      if (
        slugAvailability.checkedSlug === slugCheck.normalized &&
        slugAvailability.status === "checking"
      ) {
        return "Tunggu sebentar, sedang memeriksa ketersediaan link cantik…";
      }
    }
    if (selectedAddons.has("intimate_gate")) {
      if (gateMode === "trivia") {
        const q = triviaQuestion.trim();
        const a = triviaAnswer.trim();
        if (q.length < 3) return "Pertanyaan kuis nostalgia minimal 3 karakter.";
        if (q.length > 160) return "Pertanyaan kuis nostalgia maksimal 160 karakter.";
        if (a.length < 1) return "Isi dulu jawaban rahasia kuis nostalgia.";
        if (a.length > 80) return "Jawaban rahasia maksimal 80 karakter.";
      } else if (!/^\d{4,6}$/.test(pinInput)) {
        return "PIN harus 4–6 angka.";
      }
    }
    if (selectedAddons.has("voice_note") && !content.voiceNoteUrl?.trim()) {
      return "Rekam atau unggah pesan suara terlebih dulu.";
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
          gateType: selectedAddons.has("intimate_gate") ? gateMode : undefined,
          pin: selectedAddons.has("intimate_gate") && gateMode === "pin" ? pinInput : undefined,
          question:
            selectedAddons.has("intimate_gate") && gateMode === "trivia"
              ? triviaQuestion.trim()
              : undefined,
          answer:
            selectedAddons.has("intimate_gate") && gateMode === "trivia"
              ? triviaAnswer.trim()
              : undefined,
          particleStyle: selectedAddons.has("touch_particles") ? particleStyle : undefined,
        })
      );
    } catch {
      // sessionStorage tidak tersedia — checkout akan fallback ke draft_addons DB
    }
  };

  useEffect(() => {
    return () => {
      if (sectionScrollTimerRef.current) {
        clearTimeout(sectionScrollTimerRef.current);
        sectionScrollTimerRef.current = null;
      }
    };
  }, []);

  const getStickyTopOffset = useCallback(() => {
    if (typeof window === "undefined") return 96;
    const mobileBar = mobileTabBarRef.current;
    // On mobile/tablet (< 1024px), the sticky Edit | Preview tab bar sits at top-20 (80px)
    if (mobileBar && mobileBar.offsetParent !== null && mobileBar.offsetHeight > 0) {
      return 80 + mobileBar.offsetHeight + 12;
    }
    // Desktop fixed navbar (~80px) + 16px breathing room
    return 96;
  }, []);

  const scrollToSectionHeader = useCallback(
    (targetId: SectionId) => {
      if (typeof window === "undefined") return;
      if (sectionScrollTimerRef.current) {
        clearTimeout(sectionScrollTimerRef.current);
        sectionScrollTimerRef.current = null;
      }

      const targetIdx = SECTIONS.findIndex((s) => s.id === targetId);
      if (targetIdx < 0) return;

      const stickyOffset = getStickyTopOffset();

      // Compute the exact post-collapse document Y of the target section header upfront
      // so the viewport glides directly to it while any taller section above collapses.
      const gridEl = editorGridRef.current;
      if (gridEl) {
        const gridDocTop = gridEl.getBoundingClientRect().top + window.scrollY;
        const progressHeight = progressBarRef.current?.offsetHeight ?? 0;
        let precedingHeadersHeight = 0;
        for (let i = 0; i < targetIdx; i++) {
          const secId = SECTIONS[i].id;
          precedingHeadersHeight += sectionHeaderRefs.current[secId]?.offsetHeight ?? 76;
        }
        const estimatedHeaderY =
          gridDocTop + 1 + progressHeight + precedingHeadersHeight + targetIdx;
        const targetScrollY = Math.max(0, Math.round(estimatedHeaderY - stickyOffset));
        smoothScrollTo(targetScrollY, { duration: 0.42 });
      }

      // Fine-tune once Framer Motion's 280ms accordion transition finishes if off by > 12px.
      sectionScrollTimerRef.current = setTimeout(() => {
        sectionScrollTimerRef.current = null;
        const headerBtn = sectionHeaderRefs.current[targetId];
        if (!headerBtn || headerBtn.offsetParent === null) return;
        const rect = headerBtn.getBoundingClientRect();
        const desiredTop = getStickyTopOffset();
        const delta = rect.top - desiredTop;
        if (Math.abs(delta) > 12) {
          const maxDocScroll = Math.max(
            0,
            document.documentElement.scrollHeight - window.innerHeight
          );
          const exactTargetY = Math.min(
            Math.max(0, Math.round(window.scrollY + delta)),
            maxDocScroll
          );
          if (Math.abs(window.scrollY - exactTargetY) > 12) {
            smoothScrollTo(exactTargetY, { duration: 0.28 });
          }
        }
      }, 320);
    },
    [getStickyTopOffset]
  );

  const openSectionAndScroll = useCallback(
    (targetId: SectionId) => {
      setOpenSection(targetId);
      scrollToSectionHeader(targetId);
    },
    [scrollToSectionHeader]
  );

  const focusFieldSoon = (
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  ) => {
    setTimeout(() => {
      ref.current?.focus();
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 320);
  };

  const goToPayment = async () => {
    if (!canPay) {
      setMobileView("edit");
      if (!identitasComplete) {
        setOpenSection("identitas");
        if (!content.toName?.trim()) {
          toast.error("Isi dulu Nama Penerima di bagian Identitas");
          focusFieldSoon(toNameInputRef);
        } else if (!content.email?.trim()) {
          toast.error("Isi dulu Email Kamu untuk notifikasi di bagian Identitas");
          focusFieldSoon(emailInputRef);
        } else {
          toast.error("Format email di bagian Identitas belum valid");
          focusFieldSoon(emailInputRef);
        }
      } else {
        setOpenSection("pesan");
        toast.error("Tulis dulu isi pesanmu di bagian Pesan");
        focusFieldSoon(messageInputRef);
      }
      return;
    }
    const addonError = addonsInvalidReason();
    if (addonError) {
      setMobileView("edit");
      openSectionAndScroll("tambahan");
      toast.error(addonError);
      return;
    }
    AnalyticsEvents.paymentStarted(slug, checkoutCalc.totalAmount);
    setSaving(true);
    try {
      if (isRemote()) {
        const full = fillContentDefaults(content);
        const addonPayload = !isPaid
          ? {
              addons: Array.from(selectedAddons),
              customSlug: selectedAddons.has("custom_slug") ? slugCheck.normalized : undefined,
              gateType: selectedAddons.has("intimate_gate") ? gateMode : undefined,
              pin: selectedAddons.has("intimate_gate") && gateMode === "pin" ? pinInput : undefined,
              question:
                selectedAddons.has("intimate_gate") && gateMode === "trivia"
                  ? triviaQuestion.trim()
                  : undefined,
              answer:
                selectedAddons.has("intimate_gate") && gateMode === "trivia"
                  ? triviaAnswer.trim()
                  : undefined,
              particleStyle: selectedAddons.has("touch_particles") ? particleStyle : undefined,
            }
          : {};
        const res = await fetch(
          editId ? `/api/ucapan/${encodeURIComponent(editId)}` : "/api/ucapan",
          {
            method: editId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...full, ...addonPayload }),
          }
        );
        if (res.status === 401) {
          toast.info("Masuk dulu ya untuk melanjutkan. Draft ucapanmu tetap tersimpan!");
          router.push(`/login?next=${encodeURIComponent(`/buat/${slug}${editId ? `?edit=${editId}` : ""}`)}`);
          return;
        }
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          id?: string;
          error?: string;
          message?: string;
        };
        if (!res.ok || !json.ok) {
          toast.error(mapServerSaveError(json.error, json.message));
          return;
        }
        const finalId: string = json.id ?? editId ?? "";
        if (isPaid && editId) {
          toast.success("Perubahan ucapan berhasil disimpan!");
          router.push("/dashboard");
          return;
        }
        if (finalId) persistAddons(finalId);
        if (!editId) {
          try {
            window.localStorage.removeItem(draftAddonsStorageKey(slug));
          } catch {
            // ignore
          }
          clearDraft(slug);
          void clearDraftRemote(slug);
        }
        router.push(`/checkout/${finalId}`);
      } else {
        const id = editId ?? makeUcapanId();
        const existingLocal = editId ? getUcapan(id) : null;
        const alreadyPaid = Boolean(existingLocal?.paid);
        const nowTs = Date.now();
        savePaidUcapan({
          ...(existingLocal ?? {}),
          ...fillContentDefaults(content),
          id,
          paid: alreadyPaid,
          paidAt: existingLocal?.paidAt,
          createdAt: existingLocal?.createdAt ?? nowTs,
        });
        if (alreadyPaid && editId) {
          toast.success("Perubahan ucapan berhasil disimpan!");
          router.push("/dashboard");
          return;
        }
        persistAddons(id);
        if (!editId) clearDraft(slug);
        router.push(`/checkout/${id}`);
      }
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi ya.");
    } finally {
      setSaving(false);
    }
  };

  // Ref ke aksi builder — disinkronkan di dalam useEffect agar patuh aturan React 19 refs.
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

  useEffect(() => {
    actionsRef.current.undo = undo;
    actionsRef.current.redo = redo;
    actionsRef.current.save = () => {
      if (!saving) void goToPayment();
    };
    actionsRef.current.gotoSection = (i: number) => {
      const section = SECTIONS[i];
      if (section) openSectionAndScroll(section.id);
    };
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
    "alt+5": () => actionsRef.current.gotoSection(4),
    "?": () => setShowShortcuts(true),
    "shift+?": () => setShowShortcuts(true),
  });

  if (!template) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-5 text-center">
        <p className="text-headline-md text-on-surface mb-3">Template tidak ditemukan</p>
        <Link href="/templates" className="text-primary font-semibold hover:underline">
          Kembali ke daftar template
        </Link>
      </div>
    );
  }

  const openSectionIndex = SECTIONS.findIndex((s) => s.id === openSection);

  const switchSection = (id: SectionId) => {
    if (id === openSection) {
      setOpenSection(null);
      return;
    }
    if (openSectionIndex >= 0) {
      AnalyticsEvents.builderStepCompleted(openSectionIndex, slug);
    }
    openSectionAndScroll(id);
  };

  const photoCount = (content.photos ?? []).filter(Boolean).length;
  const activeMusicInfo = getMusicDisplayInfo(content.musicUrl);
  const hasVideo = Boolean(content.videoUrl?.trim());
  const timelineCount = (content.timeline ?? []).filter(
    (t) => t.date.trim() || t.title.trim()
  ).length;
  const isVideoPanelOpen = videoPanelToggle ?? hasVideo;
  const isTimelinePanelOpen =
    timelinePanelToggle ?? (content.timeline?.length ?? 0) > 0;
  const isCountdownPanelOpen =
    countdownPanelToggle ?? Boolean(content.unlockAt);
  const mediaSummaryParts = [
    photoCount > 0 ? `${photoCount} foto` : null,
    activeMusicInfo ? "1 lagu" : null,
    hasVideo ? "1 video" : null,
    timelineCount > 0 ? `${timelineCount} momen` : null,
  ].filter(Boolean) as string[];
  const mediaHasContent = mediaSummaryParts.length > 0;
  const addonInvalid = addonsInvalidReason() !== null;
  const requiredDoneCount = (identitasComplete ? 1 : 0) + (pesanComplete ? 1 : 0);
  const progressWidth = requiredDoneCount === 0 ? 12 : requiredDoneCount === 1 ? 56 : 100;

  const inputClass =
    "w-full rounded-2xl border border-outline-variant/80 bg-surface px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-all";

  const sectionHeader = (section: (typeof SECTIONS)[number]) => {
    const Icon = section.icon;
    const active = openSection === section.id;
    const isRequiredDone =
      (section.id === "identitas" && identitasComplete) ||
      (section.id === "pesan" && pesanComplete);
    const isOptionalPopulated =
      (section.id === "media" && mediaHasContent) ||
      (section.id === "tambahan" && selectedAddons.size > 0 && !addonInvalid) ||
      (section.id === "selesai" && canPay);

    let badge: React.ReactNode = null;
    if (section.id === "identitas" || section.id === "pesan") {
      badge = isRequiredDone ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
          <Check className="h-3 w-3" /> Lengkap
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-amber-500/12 border border-amber-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 shrink-0">
          Wajib
        </span>
      );
    } else if (section.id === "media") {
      badge = mediaHasContent ? (
        <span className="inline-flex items-center rounded-full bg-primary-fixed/40 px-2.5 py-0.5 text-[11px] font-semibold text-primary max-w-[116px] truncate shrink-0">
          {mediaSummaryParts.slice(0, 2).join(" · ")}
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-medium text-on-surface-variant shrink-0">
          Opsional
        </span>
      );
    } else if (section.id === "tambahan") {
      badge = addonInvalid ? (
        <span className="inline-flex items-center rounded-full bg-red-500/12 border border-red-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-400 shrink-0">
          Perlu dicek
        </span>
      ) : selectedAddons.size > 0 ? (
        <span className="inline-flex items-center rounded-full bg-primary-fixed/40 px-2.5 py-0.5 text-[11px] font-semibold text-primary shrink-0">
          {selectedAddons.size} dipilih
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-medium text-on-surface-variant shrink-0">
          Opsional
        </span>
      );
    } else if (section.id === "selesai" && canPay) {
      badge = (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
          Siap
        </span>
      );
    }

    return (
      <button
        ref={(el) => {
          sectionHeaderRefs.current[section.id] = el;
        }}
        type="button"
        onClick={() => switchSection(section.id)}
        aria-expanded={active}
        className={`w-full flex items-center gap-3 px-5 md:px-7 py-4.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset ${
          active ? "bg-primary-fixed/20" : "hover:bg-surface-container-low/60"
        }`}
      >
        <span
          className={`flex items-center justify-center h-10 w-10 rounded-2xl shrink-0 transition-colors ${
            active
              ? "bg-primary text-white shadow-[0_4px_14px_rgba(222,112,56,0.35)]"
              : isRequiredDone
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : isOptionalPopulated
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
        {badge}
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 lg:mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/templates"
              aria-label="Kembali ke daftar template"
              className="p-2.5 rounded-full bg-white border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors shrink-0"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
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
                      ? "text-emerald-700 bg-emerald-500/12 dark:text-emerald-400"
                      : syncStatus === "error"
                        ? "text-red-700 bg-red-500/12 dark:text-red-400"
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
                {syncStatus === "error" && (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" /> Sinkron gagal
                  </>
                )}
              </span>
            )}
            <div className="flex items-center rounded-full bg-white border border-outline-variant/30 p-1">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
                className="p-2 rounded-full text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo (Ctrl+Shift+Z)"
                className="p-2 rounded-full text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <Redo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowShortcuts(true)}
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
                className="hidden md:inline-flex items-center justify-center p-2 rounded-full text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <Keyboard className="h-4 w-4" />
              </button>
            </div>
            <span className="text-label-lg font-bold text-primary bg-primary-fixed/40 px-4 py-1.5 rounded-full">
              {formatPrice(checkoutCalc.totalAmount)}
            </span>
          </div>
        </div>

        {/* Sticky Segmented Tab Mobile: Edit | Preview */}
        <div
          ref={mobileTabBarRef}
          className="sticky top-20 z-30 lg:hidden -mx-5 px-5 py-2.5 mb-4 bg-surface/95 backdrop-blur-md border-b border-outline-variant/25"
        >
          <div
            role="tablist"
            aria-label="Mode tampilan builder"
            className="grid grid-cols-2 gap-1.5 p-1 rounded-full bg-surface-container-low border border-outline-variant/35"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileView === "edit"}
              onClick={() => setMobileView("edit")}
              className={cn(
                "inline-flex items-center justify-center gap-2 py-2 px-4 rounded-full text-label-lg font-semibold transition-all cursor-pointer",
                mobileView === "edit"
                  ? "bg-primary text-white shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <PencilLine className="h-4 w-4" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileView === "preview"}
              onClick={() => setMobileView("preview")}
              className={cn(
                "inline-flex items-center justify-center gap-2 py-2 px-4 rounded-full text-label-lg font-semibold transition-all cursor-pointer",
                mobileView === "preview"
                  ? "bg-primary text-white shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <Eye className="h-4 w-4" />
              <span>Preview</span>
              {mobileView !== "preview" && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
              )}
            </button>
          </div>
        </div>

        <div
          ref={editorGridRef}
          className="grid lg:grid-cols-[minmax(360px,440px)_1fr] gap-6 lg:gap-8 items-start"
        >
          {/* PANEL KIRI — accordion editor */}
          <div
            className={cn(
              "bg-white rounded-3xl border border-outline-variant/30 shadow-card overflow-hidden lg:sticky lg:top-24",
              mobileView === "preview" ? "hidden lg:block" : "block"
            )}
          >
            {/* Indikator progres kelengkapan */}
            <div
              ref={progressBarRef}
              className="px-5 md:px-7 py-3.5 bg-surface-container-low/60 border-b border-outline-variant/25"
            >
              <div className="flex items-center justify-between gap-2 text-label-md mb-2">
                <span className="font-semibold text-on-surface">
                  {canPay
                    ? "Siap dikirim · 2/2 wajib lengkap"
                    : `${requiredDoneCount}/2 langkah wajib lengkap`}
                </span>
                <span className="text-on-surface-variant">
                  {mediaHasContent || selectedAddons.size > 0
                    ? `${[mediaHasContent ? "Media" : null, selectedAddons.size > 0 ? `${selectedAddons.size} add-on` : null].filter(Boolean).join(" · ")}`
                    : "Identitas & Pesan"}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    canPay ? "bg-emerald-500" : "bg-primary"
                  )}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            </div>

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
                                <label
                                  htmlFor="builder-to-name"
                                  className="block text-label-lg font-semibold text-on-surface mb-1.5"
                                >
                                  Nama Penerima *
                                </label>
                                <input
                                  ref={toNameInputRef}
                                  id="builder-to-name"
                                  className={inputClass}
                                  placeholder="cth: Nabila / Sahabatku"
                                  maxLength={80}
                                  value={content.toName ?? ""}
                                  onChange={(e) => set("toName", e.target.value)}
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor="builder-from-name"
                                  className="block text-label-lg font-semibold text-on-surface mb-1.5"
                                >
                                  Nama Pengirim
                                </label>
                                <input
                                  id="builder-from-name"
                                  className={inputClass}
                                  placeholder="cth: Raka"
                                  maxLength={80}
                                  value={content.fromName ?? ""}
                                  onChange={(e) => set("fromName", e.target.value)}
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor="builder-title"
                                  className="block text-label-lg font-semibold text-on-surface mb-1.5"
                                >
                                  Judul Surat
                                </label>
                                <input
                                  id="builder-title"
                                  className={inputClass}
                                  placeholder="cth: Untuk Kamu"
                                  maxLength={120}
                                  value={content.title ?? ""}
                                  onChange={(e) => set("title", e.target.value)}
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor="builder-email"
                                  className="flex items-center gap-1.5 text-label-lg font-semibold text-on-surface mb-1.5"
                                >
                                  <Mail className="h-3.5 w-3.5 text-primary" />
                                  Email Kamu (untuk notifikasi) *
                                </label>
                                <input
                                  ref={emailInputRef}
                                  id="builder-email"
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
                                  type="button"
                                  onClick={() => switchSection("pesan")}
                                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                                >
                                  Lanjut tulis pesan <ArrowRight className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}

                          {section.id === "pesan" && (
                            <div className="space-y-4">
                              <div>
                                <label
                                  htmlFor="builder-message"
                                  className="block text-label-lg font-semibold text-on-surface mb-1.5"
                                >
                                  Isi Pesan *
                                </label>
                                <textarea
                                  ref={messageInputRef}
                                  id="builder-message"
                                  className={`${inputClass} min-h-56 resize-y`}
                                  placeholder="Ceritakan perasaanmu…"
                                  maxLength={5000}
                                  value={content.message ?? ""}
                                  onChange={(e) => set("message", e.target.value)}
                                />
                                <p className="text-label-md text-on-surface-variant mt-1.5">
                                  {content.message?.length ?? 0} / 5.000 karakter
                                </p>
                              </div>
                              {pesanComplete && (
                                <button
                                  type="button"
                                  onClick={() => switchSection("media")}
                                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                                >
                                  Tambah foto & musik <ArrowRight className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}

                          {section.id === "media" && (
                            <div className="space-y-4">
                              {/* Kartu Foto Kenangan */}
                              <div className="rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 p-4">
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                  <span className="inline-flex items-center gap-2 text-label-lg font-semibold text-on-surface">
                                    <ImagePlus className="h-4 w-4 text-primary shrink-0" />
                                    Foto Kenangan
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                      photoCount > 0
                                        ? "bg-primary-fixed/40 text-primary"
                                        : "bg-surface text-on-surface-variant border border-outline-variant/40"
                                    )}
                                  >
                                    {photoCount}/10 foto
                                  </span>
                                </div>
                                <label className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-outline-variant bg-surface/70 px-4 py-6 cursor-pointer hover:border-primary/50 hover:bg-primary-fixed/10 transition-colors">
                                  <ImagePlus className="h-7 w-7 text-primary" />
                                  <span className="text-body-md font-semibold text-on-surface text-center">
                                    {uploading ? "Mengunggah…" : "Pilih Foto dari Galeri / Kamera"}
                                  </span>
                                  <span className="text-label-md text-on-surface-variant text-center">
                                    Otomatis dikompres &amp; diunggah · maks 5MB/foto
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
                                  <div className="grid grid-cols-3 gap-2.5 mt-3">
                                    {(content.photos ?? []).map((photo, i) => (
                                      <div
                                        key={`${photo}-${i}`}
                                        className="relative aspect-square rounded-xl overflow-hidden border border-outline-variant/30 bg-surface"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={photo}
                                          alt={`Foto ${i + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            set("photos", (content.photos ?? []).filter((_, j) => j !== i))
                                          }
                                          aria-label="Hapus foto"
                                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <details className="mt-2.5">
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
                                          type="button"
                                          onClick={() =>
                                            set("photos", (content.photos ?? []).filter((_, j) => j !== i))
                                          }
                                          aria-label="Hapus foto"
                                          className="p-2 rounded-full text-on-surface-variant hover:text-primary transition-colors shrink-0 cursor-pointer"
                                        >
                                          <X className="h-4.5 w-4.5" />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => set("photos", [...(content.photos ?? []), ""])}
                                      className="inline-flex items-center gap-1.5 self-start text-label-md font-semibold text-primary hover:bg-primary-fixed/30 rounded-full px-3.5 py-1.5 transition-colors cursor-pointer"
                                    >
                                      <Plus className="h-4 w-4" /> Tambah URL
                                    </button>
                                  </div>
                                </details>
                              </div>

                              {/* Kartu Musik Latar & Range Trimmer */}
                              <div className="rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 p-4">
                                <MusicPicker
                                  musicUrl={content.musicUrl}
                                  templateCategory={template?.type}
                                  onChange={(url) => set("musicUrl", url)}
                                  onUploadAudio={uploadAudio}
                                  uploadingAudio={uploadingAudio}
                                  inputClass={inputClass}
                                />
                              </div>

                              {/* Kartu Gaya & Mood */}
                              <div className="rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 p-4">
                                <MoodSelector
                                  value={content.mood}
                                  onChange={(m) => set("mood", m)}
                                />
                              </div>

                              {/* Panel Opsional Ringkas: Video Ucapan */}
                              <div className="rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => setVideoPanelToggle(!isVideoPanelOpen)}
                                  aria-expanded={isVideoPanelOpen}
                                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-container-low transition-colors cursor-pointer"
                                >
                                  <span className="inline-flex items-center gap-2 text-label-lg font-semibold text-on-surface min-w-0">
                                    <Film className="h-4 w-4 text-primary shrink-0" />
                                    <span className="truncate">Video Ucapan</span>
                                  </span>
                                  <span className="flex items-center gap-2 shrink-0">
                                    <span
                                      className={cn(
                                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                        hasVideo
                                          ? "bg-primary-fixed/40 text-primary"
                                          : "bg-surface text-on-surface-variant border border-outline-variant/40"
                                      )}
                                    >
                                      {hasVideo ? "Terpasang" : "Opsional"}
                                    </span>
                                    <ChevronDown
                                      className={cn(
                                        "h-4 w-4 text-on-surface-variant transition-transform duration-200",
                                        isVideoPanelOpen && "rotate-180"
                                      )}
                                    />
                                  </span>
                                </button>
                                <AnimatePresence initial={false}>
                                  {isVideoPanelOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.22, ease: "easeInOut" }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-4 pb-4 pt-1 border-t border-outline-variant/25">
                                        <label
                                          htmlFor="builder-video-url"
                                          className="block text-label-md font-semibold text-on-surface-variant mb-1.5 mt-2"
                                        >
                                          Tautan Video (YouTube / MP4 HTTPS)
                                        </label>
                                        <input
                                          id="builder-video-url"
                                          className={inputClass}
                                          placeholder="https://…/video.mp4 atau link YouTube"
                                          maxLength={500}
                                          value={content.videoUrl ?? ""}
                                          onChange={(e) => set("videoUrl", e.target.value)}
                                        />
                                        <p className="text-[11px] text-on-surface-variant mt-1.5">
                                          Mendukung tautan YouTube / Shorts atau URL video MP4 publik (HTTPS).
                                        </p>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Panel Opsional Ringkas: Timeline Momen Penting */}
                              <div className="rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => setTimelinePanelToggle(!isTimelinePanelOpen)}
                                  aria-expanded={isTimelinePanelOpen}
                                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-container-low transition-colors cursor-pointer"
                                >
                                  <span className="inline-flex items-center gap-2 text-label-lg font-semibold text-on-surface min-w-0">
                                    <CalendarHeart className="h-4 w-4 text-primary shrink-0" />
                                    <span className="truncate">Timeline / Momen Penting</span>
                                  </span>
                                  <span className="flex items-center gap-2 shrink-0">
                                    <span
                                      className={cn(
                                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                        timelineCount > 0
                                          ? "bg-primary-fixed/40 text-primary"
                                          : "bg-surface text-on-surface-variant border border-outline-variant/40"
                                      )}
                                    >
                                      {timelineCount > 0 ? `${timelineCount} momen` : "Opsional"}
                                    </span>
                                    <ChevronDown
                                      className={cn(
                                        "h-4 w-4 text-on-surface-variant transition-transform duration-200",
                                        isTimelinePanelOpen && "rotate-180"
                                      )}
                                    />
                                  </span>
                                </button>
                                <AnimatePresence initial={false}>
                                  {isTimelinePanelOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.22, ease: "easeInOut" }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-4 pb-4 pt-2 border-t border-outline-variant/25 space-y-3">
                                        <p className="text-label-md text-on-surface-variant">
                                          Tambahkan tanggal dan momen spesial kalian (misal: Kencan Pertama, Jadian).
                                        </p>
                                        {(content.timeline ?? []).map((item, i) => (
                                          <div
                                            key={i}
                                            className="p-3.5 rounded-xl bg-surface border border-outline-variant/40 space-y-2.5"
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-label-md font-bold text-primary">
                                                Momen #{i + 1}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const t = [...(content.timeline ?? [])];
                                                  t.splice(i, 1);
                                                  set("timeline", t);
                                                }}
                                                className="text-red-600 dark:text-red-400 hover:underline text-label-md font-semibold cursor-pointer"
                                              >
                                                Hapus
                                              </button>
                                            </div>
                                            <div className="grid sm:grid-cols-2 gap-2.5">
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
                                          type="button"
                                          onClick={() => {
                                            setTimelinePanelToggle(true);
                                            set("timeline", [
                                              ...(content.timeline ?? []),
                                              { date: "", title: "", description: "" },
                                            ]);
                                          }}
                                          className="inline-flex items-center gap-1.5 text-label-md font-semibold text-primary hover:bg-primary-fixed/30 rounded-full px-3.5 py-2 transition-colors cursor-pointer"
                                        >
                                          <Plus className="h-4 w-4" /> Tambah Momen Timeline
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Jadwalkan Waktu Buka (Countdown) */}
                              <div className="rounded-2xl border border-outline-variant/30 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCountdownPanelToggle(!isCountdownPanelOpen)
                                  }
                                  aria-expanded={isCountdownPanelOpen}
                                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface hover:bg-primary-fixed/20 transition-colors cursor-pointer text-left"
                                >
                                  <Clock className="h-4 w-4 text-primary shrink-0" />
                                  <span className="flex-1 text-label-md font-semibold text-on-surface truncate">
                                    Jadwalkan Waktu Buka (Countdown)
                                  </span>
                                  <span
                                    className={`text-label-sm font-medium px-2 py-0.5 rounded-full ${
                                      content.unlockAt
                                        ? "bg-primary/15 text-primary"
                                        : "bg-outline-variant/20 text-on-surface-variant"
                                    }`}
                                  >
                                    {content.unlockAt ? "Aktif" : "Opsional"}
                                  </span>
                                  <ChevronDown
                                    className={`h-4 w-4 text-on-surface-variant transition-transform duration-200 ${
                                      isCountdownPanelOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                                <AnimatePresence initial={false}>
                                  {isCountdownPanelOpen && (
                                    <motion.div
                                      key="countdown-panel"
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.22, ease: "easeInOut" }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-4 pb-4 pt-2 space-y-3 border-t border-outline-variant/20">
                                        <p className="text-body-sm text-on-surface-variant">
                                          Ucapan hanya bisa dibuka penerima setelah waktu yang kamu tentukan. Hitung mundur tampil otomatis.
                                        </p>
                                        <div className="space-y-1.5">
                                          <label className="text-label-sm font-medium text-on-surface">
                                            Waktu Buka
                                          </label>
                                          <input
                                            type="datetime-local"
                                            className={inputClass}
                                            value={
                                              content.unlockAt
                                                ? toLocalDatetimeInputValue(content.unlockAt)
                                                : ""
                                            }
                                            min={minUnlockDatetime}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              set(
                                                "unlockAt",
                                                val
                                                  ? fromLocalDatetimeInputValue(val)
                                                  : null
                                              );
                                            }}
                                          />
                                          <p className="text-label-sm text-on-surface-variant">
                                            Zona waktu perangkatmu:{" "}
                                            <span className="font-semibold text-primary">
                                              {detectIndonesianTimezone()}
                                            </span>
                                          </p>
                                        </div>
                                        {content.unlockAt && (
                                          <div className="rounded-xl bg-primary/8 border border-primary/20 px-3 py-2.5 flex items-start justify-between gap-3">
                                            <div>
                                              <p className="text-label-sm font-semibold text-primary mb-0.5">
                                                Terbuka pada:
                                              </p>
                                              <p className="text-body-sm text-on-surface">
                                                {new Date(content.unlockAt).toLocaleString(
                                                  "id-ID",
                                                  {
                                                    weekday: "long",
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                  }
                                                )}
                                              </p>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => set("unlockAt", null)}
                                              className="shrink-0 text-label-sm text-error font-medium hover:underline cursor-pointer"
                                            >
                                              Hapus
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              <button
                                type="button"
                                onClick={() => switchSection("tambahan")}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                              >
                                Lanjut ke Tambahan <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          {section.id === "tambahan" && (
                            <div className="space-y-5">
                              {isPaid ? (
                                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/12 px-4 py-3 text-label-md text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                                  <Lock className="h-4 w-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                                  <span>
                                    Pengaturan add-on terkunci setelah ucapan aktif. Kamu tetap
                                    bisa mengedit isi surat, foto, musik, video, dan timeline.
                                  </span>
                                </div>
                              ) : (
                                <p className="text-label-md text-on-surface-variant leading-relaxed">
                                  Opsional. Semua efek di bawah langsung bisa dicoba di Live Preview.
                                </p>
                              )}

                              <div className="space-y-2.5">
                                {(Object.keys(ADDON_PRICING) as AddonKey[]).map((key) => {
                                  const addon = ADDON_PRICING[key];
                                  const active = selectedAddons.has(key);
                                  const slugLiveMatches =
                                    slugAvailability.checkedSlug === slugCheck.normalized;
                                  return (
                                    <div key={key}>
                                      <button
                                        type="button"
                                        disabled={isPaid}
                                        onClick={() => toggleAddon(key)}
                                        aria-pressed={active}
                                        aria-expanded={active}
                                        className={cn(
                                          "w-full text-left rounded-2xl border px-4 py-3 transition-all flex items-start gap-3 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed",
                                          active
                                            ? "border-primary bg-primary-fixed/20 ring-1 ring-primary/20"
                                            : "border-outline-variant/60 bg-surface hover:border-primary/40"
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
                                              <label
                                                htmlFor="builder-custom-slug"
                                                className="block text-label-md font-semibold text-on-surface mb-1.5"
                                              >
                                                Alamat Link Cantik
                                              </label>
                                              <input
                                                id="builder-custom-slug"
                                                className={inputClass}
                                                disabled={isPaid}
                                                placeholder="cth: ari-nadia"
                                                maxLength={50}
                                                value={slugInput}
                                                onChange={(e) => setSlugInput(e.target.value)}
                                              />
                                              <p
                                                className={`text-label-md mt-1.5 flex items-center gap-1.5 ${
                                                  !slugInput.trim()
                                                    ? "text-on-surface-variant"
                                                    : !slugCheck.valid
                                                      ? "text-red-600 dark:text-red-400"
                                                      : !isPaid && slugLiveMatches && slugAvailability.status === "checking"
                                                        ? "text-on-surface-variant"
                                                        : !isPaid && slugLiveMatches && (slugAvailability.status === "taken" || slugAvailability.status === "error")
                                                          ? "text-red-600 dark:text-red-400"
                                                          : "text-emerald-600 dark:text-emerald-400"
                                                }`}
                                              >
                                                {!slugInput.trim() ? (
                                                  "Link jadi: /u/…"
                                                ) : !slugCheck.valid ? (
                                                  slugCheck.reason
                                                ) : isPaid ? (
                                                  `Link aktif: /u/${slugCheck.normalized}`
                                                ) : slugLiveMatches && slugAvailability.status === "checking" ? (
                                                  <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    Memeriksa ketersediaan /u/{slugCheck.normalized}…
                                                  </>
                                                ) : slugLiveMatches && (slugAvailability.status === "taken" || slugAvailability.status === "error") ? (
                                                  slugAvailability.reason
                                                ) : slugLiveMatches && slugAvailability.status === "available" ? (
                                                  <>
                                                    <Check className="h-3.5 w-3.5 shrink-0" />
                                                    Tersedia — Link jadi: /u/{slugCheck.normalized}
                                                  </>
                                                ) : (
                                                  `Link jadi: /u/${slugCheck.normalized}`
                                                )}
                                              </p>
                                            </div>
                                          )}

                                          {key === "intimate_gate" && (
                                            <div className="space-y-3">
                                              <div>
                                                <p className="text-label-md font-semibold text-on-surface mb-1.5">
                                                  Pilih Jenis Kunci
                                                </p>
                                                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Jenis kunci pesan">
                                                  {(
                                                    [
                                                      { id: "pin" as const, label: "Kode PIN", Icon: KeyRound },
                                                      { id: "trivia" as const, label: "Kuis Nostalgia", Icon: HelpCircle },
                                                    ]
                                                  ).map(({ id, label, Icon }) => (
                                                    <button
                                                      key={id}
                                                      type="button"
                                                      disabled={isPaid}
                                                      aria-pressed={gateMode === id}
                                                      onClick={() => {
                                                        setGateMode(id);
                                                        setPreviewGateOpen(true);
                                                      }}
                                                      className={cn(
                                                        "inline-flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-label-md font-semibold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed",
                                                        gateMode === id
                                                          ? "border-primary bg-primary-fixed/25 text-primary ring-1 ring-primary/20"
                                                          : "border-outline-variant/60 bg-surface text-on-surface-variant hover:border-primary/40"
                                                      )}
                                                    >
                                                      <Icon className="h-3.5 w-3.5 shrink-0" />
                                                      <span>{label}</span>
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>

                                              {gateMode === "pin" ? (
                                                <div>
                                                  <label
                                                    htmlFor="builder-gate-pin"
                                                    className="block text-label-md font-semibold text-on-surface mb-1.5"
                                                  >
                                                    PIN Rahasia (4–6 angka)
                                                  </label>
                                                  <input
                                                    id="builder-gate-pin"
                                                    type="password"
                                                    inputMode="numeric"
                                                    disabled={isPaid}
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
                                              ) : (
                                                <div className="space-y-3">
                                                  <div>
                                                    <label
                                                      htmlFor="builder-trivia-question"
                                                      className="block text-label-md font-semibold text-on-surface mb-1.5"
                                                    >
                                                      Pertanyaan Kuis Nostalgia
                                                    </label>
                                                    <input
                                                      id="builder-trivia-question"
                                                      type="text"
                                                      disabled={isPaid}
                                                      maxLength={160}
                                                      className={inputClass}
                                                      placeholder="cth: Di mana kencan pertama kita?"
                                                      value={triviaQuestion}
                                                      onChange={(e) =>
                                                        setTriviaQuestion(e.target.value)
                                                      }
                                                    />
                                                    {!isPaid && (
                                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {TRIVIA_PROMPTS.map((prompt) => (
                                                          <button
                                                            key={prompt}
                                                            type="button"
                                                            onClick={() => setTriviaQuestion(prompt)}
                                                            className="rounded-full border border-outline-variant/60 bg-surface px-2.5 py-1 text-[11px] font-medium text-on-surface-variant hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                                                          >
                                                            {prompt}
                                                          </button>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>

                                                  <div>
                                                    <label
                                                      htmlFor="builder-trivia-answer"
                                                      className="block text-label-md font-semibold text-on-surface mb-1.5"
                                                    >
                                                      Jawaban Rahasia
                                                    </label>
                                                    <input
                                                      id="builder-trivia-answer"
                                                      type="text"
                                                      disabled={isPaid}
                                                      maxLength={80}
                                                      className={inputClass}
                                                      placeholder="cth: Kedai Kopi Senja"
                                                      value={triviaAnswer}
                                                      onChange={(e) =>
                                                        setTriviaAnswer(e.target.value)
                                                      }
                                                    />
                                                    <p className="text-label-md text-on-surface-variant mt-1.5">
                                                      Tidak membedakan huruf besar/kecil atau spasi
                                                      ganda. Coba di preview sekarang.
                                                    </p>
                                                  </div>
                                                </div>
                                              )}
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
                                                    disabled={isPaid}
                                                    onClick={() => setParticleStyle(p.key)}
                                                    aria-pressed={particleStyle === p.key}
                                                    className={cn(
                                                      "rounded-2xl border px-2 py-2.5 text-label-md font-semibold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed",
                                                      particleStyle === p.key
                                                        ? "border-primary bg-primary-fixed/20 text-primary ring-1 ring-primary/20"
                                                        : "border-outline-variant/60 bg-surface text-on-surface-variant hover:border-primary/40"
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

                                          {key === "voice_note" && (
                                            <VoiceNoteRecorder
                                              value={content.voiceNoteUrl}
                                              disabled={false}
                                              slug={slug}
                                              editId={editId}
                                              onChange={(url) => set("voiceNoteUrl", url)}
                                            />
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
                                    <div className="flex justify-between text-label-md text-emerald-700 dark:text-emerald-400">
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
                                type="button"
                                onClick={() => switchSection("selesai")}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                              >
                                Lanjut ke Selesaikan <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          {section.id === "selesai" && (
                            <div className="space-y-5">
                              {pricing.isPromo && (
                                <div className="rounded-2xl bg-amber-500/12 border border-amber-500/30 p-3 text-amber-950 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 font-medium">
                                    <Flame className="h-4 w-4 text-primary shrink-0" />
                                    Promo perkenalan (sisa {pricing.remainingQuota} kuota)
                                  </span>
                                  <span className="font-bold shrink-0">
                                    {formatPrice(checkoutCalc.baseAmount)}
                                  </span>
                                </div>
                              )}
                              <div className="rounded-2xl bg-surface-container-low p-5 space-y-3">
                                {[
                                  ["Template", template.name],
                                  ["Untuk", content.toName || "—"],
                                  ["Dari", content.fromName || "—"],
                                  ["Judul", content.title || "—"],
                                  ["Pesan", `${content.message?.length ?? 0} karakter`],
                                  ["Foto", `${photoCount} foto`],
                                  [
                                    "Musik Latar",
                                    activeMusicInfo
                                      ? (() => {
                                          const baseLabel = activeMusicInfo.artist
                                            ? `${activeMusicInfo.title} — ${activeMusicInfo.artist}`
                                            : activeMusicInfo.title;
                                          if (activeMusicInfo.endSeconds !== undefined) {
                                            return `${baseLabel} (${formatSeconds(activeMusicInfo.startSeconds)}–${formatSeconds(activeMusicInfo.endSeconds)})`;
                                          }
                                          if (activeMusicInfo.startSeconds > 0) {
                                            return `${baseLabel} (mulai ${formatSeconds(activeMusicInfo.startSeconds)})`;
                                          }
                                          return baseLabel;
                                        })()
                                      : "Tanpa musik",
                                  ],
                                  ...(hasVideo ? [["Video", "Terpasang"]] : []),
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
                                    <span className="text-body-md text-on-surface-variant shrink-0">
                                      {label}
                                    </span>
                                    <span className="text-body-md font-semibold text-on-surface text-right truncate">
                                      {value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-label-md text-on-surface-variant">
                                {[
                                  "Link aktif selamanya",
                                  "Edit 7 hari setelah bayar",
                                  "Bagikan via link & QR",
                                  "Jejak kunjungan real-time",
                                ].map((perk) => (
                                  <li key={perk} className="inline-flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span>{perk}</span>
                                  </li>
                                ))}
                              </ul>
                              <button
                                type="button"
                                onClick={() => void goToPayment()}
                                disabled={saving}
                                title={!canPay ? "Klik untuk melengkapi bagian yang kurang" : undefined}
                                className={cn(
                                  "w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white text-label-lg font-semibold rounded-full shadow-[0_8px_30px_rgba(222,112,56,0.35)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:hover:translate-y-0",
                                  !canPay && "opacity-90"
                                )}
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
                                  <button
                                    type="button"
                                    onClick={() => switchSection(!identitasComplete ? "identitas" : "pesan")}
                                    className="text-primary font-semibold underline underline-offset-2 cursor-pointer"
                                  >
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

          {/* PANEL KANAN — live preview permanen (desktop) / tab Preview (mobile) */}
          <div
            className={cn(
              "lg:sticky lg:top-24 self-start",
              mobileView === "edit" ? "hidden lg:block" : "block"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-label-lg font-semibold text-on-surface-variant flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Live Preview
                {content.unlockAt && isUcapanCountdownLocked(content.unlockAt) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold">
                    <Clock className="h-3 w-3" /> Countdown aktif
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (template.hasNarrative) {
                      setPreviewReplayKey((k) => k + 1);
                      return;
                    }
                    setPreviewInteractive((prev) => !prev);
                    setPreviewReplayKey((k) => k + 1);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-label-md font-semibold transition-all cursor-pointer",
                    previewInteractive
                      ? "bg-primary-fixed/40 border-primary/40 text-primary"
                      : "bg-white border-outline-variant/40 text-on-surface-variant hover:text-primary hover:border-primary/40"
                  )}
                  title={
                    template.hasNarrative
                      ? "Putar ulang animasi dari awal"
                      : previewInteractive
                        ? "Kembali tampilkan isi surat langsung"
                        : "Coba animasi pembuka seperti yang dilihat penerima"
                  }
                >
                  {template.hasNarrative ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Ulangi</span>
                    </>
                  ) : previewInteractive ? (
                    <>
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Lihat Isi</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Putar Intro</span>
                    </>
                  )}
                </button>
                <div
                  className="flex items-center rounded-full bg-white border border-outline-variant/30 p-1"
                  role="group"
                  aria-label="Mode preview"
                >
                  {(
                    [
                      { mode: "mobile" as const, Icon: Smartphone, label: "Mobile" },
                      { mode: "desktop" as const, Icon: Monitor, label: "Desktop" },
                    ]
                  ).map(({ mode, Icon, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => switchPreviewMode(mode)}
                      aria-pressed={previewMode === mode}
                      aria-label={`Tampilan ${label}`}
                      title={`Tampilan ${label}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-md font-semibold transition-all cursor-pointer ${
                        previewMode === mode
                          ? "bg-primary-fixed/50 text-primary"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <motion.div
              ref={previewFrameRef}
              data-light-card
              initial={{ opacity: 0.6, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className={`relative rounded-3xl overflow-hidden border-4 border-surface-container-highest dark:border-outline-variant/40 shadow-[0_20px_60px_rgba(222,112,56,0.2)] transition-[max-width] duration-300 ${
                previewMode === "mobile" ? "max-w-[375px] mx-auto" : "max-w-full"
              }`}
            >
              <div
                data-scroll-chain
                className="h-[560px] overflow-y-auto overscroll-y-auto bg-surface"
              >
                <TemplateRenderer
                  key={`${slug}-${previewInteractive ? "intro" : "open"}-${previewReplayKey}`}
                  content={previewContent}
                  preview
                  interactive={previewInteractive}
                />
              </div>

              {/* Efek add-on — dirender di dalam frame, tanpa menyentuh template */}
              {selectedAddons.has("touch_particles") && (
                <ParticleTouch type={particleStyle} container={previewFrameRef} />
              )}

              {selectedAddons.has("intimate_gate") && previewGateOpen && (
                <GateOverlay
                  key={gateMode}
                  toName={content.toName || "Kamu"}
                  fromName={content.fromName || "Aku"}
                  gateType={gateMode}
                  gateData={
                    gateMode === "trivia"
                      ? { question: triviaQuestion, answer: triviaAnswer }
                      : { pin: pinInput }
                  }
                  variant="embedded"
                  onUnlock={() => setPreviewGateOpen(false)}
                />
              )}

              {selectedAddons.has("intimate_gate") && !previewGateOpen && (
                <button
                  type="button"
                  onClick={() => setPreviewGateOpen(true)}
                  className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-lg border border-rose-200/60 backdrop-blur hover:text-rose-600 transition-all cursor-pointer"
                >
                  <Lock className="h-3 w-3" />
                  <span>Tampilkan Gerbang</span>
                </button>
              )}

              {selectedAddons.has("love_receipt") && (
                <LoveReceiptModal
                  toName={content.toName || "Kamu"}
                  fromName={content.fromName || "Aku"}
                  variant="embedded"
                />
              )}

              {selectedAddons.has("voice_note") && content.voiceNoteUrl && (
                <VoiceNotePlayer
                  key={content.voiceNoteUrl}
                  url={content.voiceNoteUrl}
                  fromName={content.fromName || "Aku"}
                  variant="embedded"
                />
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* CTA mobile mengambang */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-surface/95 backdrop-blur-md border-t border-outline-variant/35 px-5 py-3.5 flex items-center justify-between gap-4 shadow-[0_-8px_24px_rgba(36,25,20,0.08)]">
        <div className="min-w-0">
          {isPaid ? (
            <>
              <p className="text-label-md text-on-surface-variant">Mode edit</p>
              <p className="text-title-md font-bold text-emerald-700 dark:text-emerald-400">
                Ucapan Aktif
              </p>
            </>
          ) : (
            <>
              <p className="text-label-md text-on-surface-variant truncate">
                {!identitasComplete
                  ? "Lengkapi Identitas dulu"
                  : !pesanComplete
                    ? "Tulis isi pesan dulu"
                    : "Total sekali bayar"}
              </p>
              <p className="text-title-md font-bold text-primary">
                {formatPrice(checkoutCalc.totalAmount)}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => void goToPayment()}
          disabled={saving}
          className={cn(
            "inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-label-lg font-semibold rounded-full shadow-[0_8px_30px_rgba(222,112,56,0.35)] transition-all cursor-pointer disabled:opacity-50 shrink-0",
            !canPay && "opacity-90"
          )}
        >
          {saving ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : isPaid ? (
            <Check className="h-4.5 w-4.5" />
          ) : (
            <CreditCard className="h-4.5 w-4.5" />
          )}
          {isPaid ? "Simpan" : "Bayar"}
        </button>
      </div>

      <ShortcutsHelpModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
