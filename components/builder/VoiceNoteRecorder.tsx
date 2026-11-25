"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Pause, Play, Square, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { isRemote, supabaseUrl } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

const MAX_DURATION_SEC = 180; // 3 menit
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_DEMO_DATA_URL_BYTES = 2 * 1024 * 1024; // 2 MB agar aman untuk localStorage Demo Mode
const ALLOWED_EXTS = new Set(["mp3", "m4a", "wav", "ogg", "webm"]);
const emptySubscribe = () => () => {};

interface VoiceNoteRecorderProps {
  value?: string;
  disabled?: boolean;
  slug: string;
  editId?: string;
  onChange: (url: string | undefined) => void;
}

function formatTimer(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return undefined;
}

function extFromMimeOrName(mime: string, fileName?: string): string {
  if (fileName) {
    const raw = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (ALLOWED_EXTS.has(raw)) return raw;
  }
  const lower = mime.toLowerCase();
  if (lower.includes("mp4") || lower.includes("m4a")) return "m4a";
  if (lower.includes("mpeg") || lower.includes("mp3")) return "mp3";
  if (lower.includes("wav")) return "wav";
  if (lower.includes("ogg")) return "ogg";
  return "webm";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca file audio"));
    reader.readAsDataURL(blob);
  });
}

export default function VoiceNoteRecorder({
  value,
  disabled = false,
  slug,
  editId,
  onChange,
}: VoiceNoteRecorderProps) {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [playDuration, setPlayDuration] = useState(0);

  const browserMicSupported = useSyncExternalStore(
    emptySubscribe,
    () =>
      typeof MediaRecorder !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    () => true
  );
  const micUnsupported = !browserMicSupported || micPermissionDenied;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const demoBlobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopStreamAndTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopStreamAndTimer();
      if (demoBlobUrlRef.current) {
        URL.revokeObjectURL(demoBlobUrlRef.current);
        demoBlobUrlRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [stopStreamAndTimer]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [value]);

  const persistAudioBlob = useCallback(
    async (blob: Blob, fileName?: string) => {
      if (blob.size > MAX_FILE_BYTES) {
        toast.error("Ukuran audio maksimal 10 MB.");
        return;
      }
      if (blob.size === 0) {
        toast.error("Rekaman audio kosong. Coba rekam lagi ya.");
        return;
      }

      setUploading(true);
      setPlaying(false);
      setPlayProgress(0);
      setPlayDuration(0);
      try {
        const mime = blob.type || "audio/webm";
        const ext = extFromMimeOrName(mime, fileName);

        if (isRemote()) {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            toast.info("Masuk dulu ya untuk menyimpan pesan suara. Draft ucapanmu tetap tersimpan!");
            router.push(
              `/login?next=${encodeURIComponent(`/buat/${slug}${editId ? `?edit=${editId}` : ""}`)}`
            );
            return;
          }

          const path = `${user.id}/voice-notes/${crypto.randomUUID()}.${ext}`;
          const contentType =
            mime.split(";")[0] ||
            (ext === "m4a" ? "audio/mp4" : `audio/${ext === "mp3" ? "mpeg" : ext}`);
          const { error } = await supabase.storage
            .from("musik")
            .upload(path, blob, { contentType });
          if (error) throw error;

          const url = `${supabaseUrl()}/storage/v1/object/public/musik/${path}`;
          onChange(url);
          toast.success("Pesan suara berhasil disimpan");
          return;
        }

        // Demo Mode lokal: gunakan Data URL bila <= 2 MB agar bertahan di localStorage
        if (demoBlobUrlRef.current) {
          URL.revokeObjectURL(demoBlobUrlRef.current);
          demoBlobUrlRef.current = null;
        }
        if (blob.size <= MAX_DEMO_DATA_URL_BYTES) {
          const dataUrl = await blobToDataUrl(blob);
          onChange(dataUrl);
        } else {
          const blobUrl = URL.createObjectURL(blob);
          demoBlobUrlRef.current = blobUrl;
          onChange(blobUrl);
        }
        toast.success("Pesan suara siap diputar (Mode Demo)");
      } catch {
        toast.error("Gagal mengunggah pesan suara. Coba lagi ya.");
      } finally {
        setUploading(false);
      }
    },
    [editId, onChange, router, slug]
  );

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    setRecording(false);
    stopStreamAndTimer();
  }, [stopStreamAndTimer]);

  const startRecording = async () => {
    if (disabled || recording || uploading) return;
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setMicPermissionDenied(true);
      toast.error("Browser ini belum mendukung rekam suara langsung. Silakan unggah file audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || "audio/webm";
        const recordedBlob = new Blob(chunksRef.current, { type: finalType });
        chunksRef.current = [];
        stopStreamAndTimer();
        void persistAudioBlob(recordedBlob);
      };

      recorder.start(250);
      setRecording(true);
      setElapsedSec(0);

      timerRef.current = window.setInterval(() => {
        setElapsedSec((prev) => {
          const next = prev + 1;
          if (next >= MAX_DURATION_SEC) {
            window.setTimeout(() => stopRecording(), 0);
            toast.info("Rekaman mencapai batas maksimal 3 menit.");
          }
          return next;
        });
      }, 1000);
    } catch {
      stopStreamAndTimer();
      setMicPermissionDenied(true);
      toast.error("Izin mikrofon ditolak atau tidak tersedia. Kamu tetap bisa unggah file audio.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!file.type.startsWith("audio/") && !ALLOWED_EXTS.has(ext)) {
      toast.error("Format audio harus MP3, M4A, WAV, OGG, atau WebM.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Ukuran file audio maksimal 10 MB.");
      return;
    }
    void persistAudioBlob(file, file.name);
  };

  const togglePlayback = () => {
    if (!value) return;
    let el = audioRef.current;
    if (!el) {
      el = new Audio(value);
      el.ontimeupdate = () => {
        if (!el) return;
        setPlayProgress(el.currentTime || 0);
        if (Number.isFinite(el.duration) && el.duration > 0) {
          setPlayDuration(el.duration);
        }
      };
      el.onloadedmetadata = () => {
        if (el && Number.isFinite(el.duration) && el.duration > 0) {
          setPlayDuration(el.duration);
        }
      };
      el.onended = () => {
        setPlaying(false);
        setPlayProgress(0);
      };
      audioRef.current = el;
    }

    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => {
          setPlaying(false);
          toast.error("Audio gagal diputar.");
        });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-label-md font-semibold text-on-surface">
          Rekam atau Unggah Pesan Suara
        </p>
        <span className="text-[11px] font-medium text-on-surface-variant">
          Maks. 3 menit · 10 MB
        </span>
      </div>

      {/* Preview player bila audio sudah tersimpan */}
      {value && !recording && (
        <div className="rounded-2xl border border-primary/25 bg-surface px-3.5 py-2.5 flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlayback}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm hover:scale-105 transition-transform cursor-pointer"
            aria-label={playing ? "Jeda pesan suara" : "Putar ulang pesan suara"}
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-label-md font-semibold text-on-surface truncate">
              Pesan suara tersimpan
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-outline-variant/30 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{
                    width:
                      playDuration > 0
                        ? `${Math.min(100, (playProgress / playDuration) * 100)}%`
                        : "0%",
                  }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-on-surface-variant shrink-0">
                {formatTimer(playProgress)}
                {playDuration > 0 ? ` / ${formatTimer(playDuration)}` : ""}
              </span>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setPlayProgress(0);
                setPlayDuration(0);
                onChange(undefined);
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
              aria-label="Hapus pesan suara"
              title="Hapus pesan suara"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Kontrol Rekam & Upload */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          {!micUnsupported && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => (recording ? stopRecording() : void startRecording())}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-label-md font-semibold transition-all cursor-pointer disabled:opacity-60",
                recording
                  ? "bg-red-600 text-white shadow-md animate-pulse"
                  : "bg-primary text-white shadow-sm hover:-translate-y-0.5"
              )}
            >
              {recording ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Berhenti ({formatTimer(elapsedSec)} / 03:00)</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  <span>{value ? "Rekam Ulang" : "Rekam Suara"}</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            disabled={recording || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/70 bg-surface px-3.5 py-2 text-label-md font-semibold text-on-surface hover:border-primary/50 hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            <span>{uploading ? "Mengunggah…" : "Unggah Audio"}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.m4a,.wav,.ogg,.webm,audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {micUnsupported && !value && (
        <p className="text-[11px] text-on-surface-variant leading-relaxed">
          Mikrofon tidak tersedia/diizinkan. Gunakan tombol <strong>Unggah Audio</strong> (.mp3, .m4a, .wav, .ogg, .webm).
        </p>
      )}
    </div>
  );
}
