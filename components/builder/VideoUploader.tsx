"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Film, Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { isRemote } from "@/lib/supabase/config";
import { isYouTubeVideoUrl } from "@/lib/validation";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

const EXT_TO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

const ALLOWED_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

interface VideoUploaderProps {
  value?: string;
  disabled?: boolean;
  slug: string;
  editId?: string;
  onUploaded: (publicUrl: string) => void;
  onRemove: () => void;
}

function resolveVideoMime(file: File): string | null {
  const mime = (file.type || "").trim().toLowerCase();
  if (ALLOWED_MIMES.has(mime)) return mime;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? null;
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VideoUploader({
  value,
  disabled = false,
  slug,
  editId,
  onUploaded,
  onRemove,
}: VideoUploaderProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const demoBlobRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      xhrRef.current?.abort();
      if (demoBlobRef.current) {
        URL.revokeObjectURL(demoBlobRef.current);
        demoBlobRef.current = null;
      }
    };
  }, []);

  const hasLocalVideo = Boolean(value?.trim() && !isYouTubeVideoUrl(value));

  const cancelUpload = () => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setUploading(false);
    setProgress(0);
    toast.info("Upload video dibatalkan.");
  };

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled) return;

    const contentType = resolveVideoMime(file);
    if (!contentType) {
      toast.error("Format video harus MP4, WebM, atau MOV.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_VIDEO_BYTES) {
      toast.error(`Ukuran video maksimal 50 MB (file kamu ${formatMb(file.size)}).`);
      return;
    }

    setFileName(file.name);

    // Demo Mode: pratinjau langsung lewat Object URL lokal
    if (!isRemote()) {
      if (demoBlobRef.current) {
        URL.revokeObjectURL(demoBlobRef.current);
      }
      const blobUrl = URL.createObjectURL(file);
      demoBlobRef.current = blobUrl;
      onUploaded(blobUrl);
      toast.success("Video siap diputar di Live Preview (Mode Demo)");
      return;
    }

    setUploading(true);
    setProgress(1);

    try {
      const presignRes = await fetch("/api/upload/video-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          fileSize: file.size,
        }),
      });

      if (presignRes.status === 401) {
        toast.info("Masuk dulu ya untuk mengunggah video. Draft ucapanmu tetap tersimpan!");
        router.push(
          `/login?next=${encodeURIComponent(`/buat/${slug}${editId ? `?edit=${editId}` : ""}`)}`
        );
        setUploading(false);
        setProgress(0);
        return;
      }

      const presignJson = (await presignRes.json()) as {
        ok?: boolean;
        uploadUrl?: string;
        publicUrl?: string;
        message?: string;
      };

      if (!presignRes.ok || !presignJson.ok || !presignJson.uploadUrl || !presignJson.publicUrl) {
        throw new Error(presignJson.message ?? "Gagal meminta URL upload video.");
      }

      const { uploadUrl, publicUrl } = presignJson;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable && ev.total > 0) {
            const pct = Math.min(99, Math.max(1, Math.round((ev.loaded / ev.total) * 100)));
            setProgress(pct);
          }
        };

        xhr.onload = () => {
          xhrRef.current = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100);
            resolve();
          } else {
            reject(new Error(`Upload gagal (HTTP ${xhr.status}). Periksa CORS/koneksi.`));
          }
        };

        xhr.onerror = () => {
          xhrRef.current = null;
          reject(new Error("Koneksi terputus saat mengunggah video."));
        };

        xhr.onabort = () => {
          xhrRef.current = null;
          reject(new Error("ABORTED"));
        };

        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(file);
      });

      onUploaded(publicUrl);
      toast.success("Video berhasil diunggah dan tampil di Live Preview!");
    } catch (err) {
      if (err instanceof Error && err.message === "ABORTED") {
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Gagal mengunggah video. Coba lagi ya."
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-3 mt-2.5">
      {hasLocalVideo && !uploading && (
        <div className="rounded-2xl border border-primary/25 bg-surface px-3.5 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-fixed/40 text-primary">
              <Film className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-label-md font-semibold text-on-surface truncate">
                {fileName || "Video pribadi terpasang"}
              </p>
              <p className="text-[11px] text-on-surface-variant truncate">
                Cek langsung di Live Preview (musik latar otomatis meredup saat diputar).
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Hapus video"
              title="Hapus video"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {uploading && (
        <div className="rounded-2xl border border-primary/30 bg-surface px-3.5 py-3 space-y-2">
          <div className="flex items-center justify-between gap-2 text-label-md">
            <span className="inline-flex items-center gap-1.5 font-semibold text-on-surface truncate">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
              <span className="truncate">Mengunggah {fileName || "video"}…</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-primary tabular-nums">{progress}%</span>
              <button
                type="button"
                onClick={cancelUpload}
                aria-label="Batalkan upload"
                className="text-on-surface-variant hover:text-red-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-outline-variant/25 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {!disabled && (
        <div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-outline-variant bg-surface/70 px-4 py-5 cursor-pointer hover:border-primary/50 hover:bg-primary-fixed/10 transition-colors disabled:opacity-50"
          >
            <Upload className="h-6 w-6 text-primary" />
            <span className="text-body-md font-semibold text-on-surface text-center">
              {hasLocalVideo ? "Ganti Video Pribadi" : "Pilih Video dari HP / Laptop"}
            </span>
            <span className="text-[11px] text-on-surface-variant text-center">
              Format MP4, WebM, atau MOV · Maks. 50 MB
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            onChange={(e) => void handleSelectFile(e)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
