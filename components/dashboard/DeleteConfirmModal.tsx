"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { getTemplate, templateEmoji } from "@/lib/templates";
import { EASE_WARM, SPRING_TACTILE } from "@/components/landing/MotionPrimitives";

export interface DeleteConfirmTarget {
  id: string;
  title?: string;
  toName: string;
  fromName: string;
  templateSlug: string;
  paid: boolean;
}

interface DeleteConfirmModalProps {
  target: DeleteConfirmTarget | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Custom Framer Motion confirmation dialog replacing browser `window.confirm`
 * with contextual active-link warning and double-submit loading lock.
 */
export default function DeleteConfirmModal({
  target,
  deleting,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  const reduced = useReducedMotion();
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!target) return;

    const rafId = requestAnimationFrame(() => {
      cancelBtnRef.current?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [target, deleting, onCancel]);

  const templateMeta = target ? getTemplate(target.templateSlug) : undefined;

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          data-lenis-prevent
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_WARM }}
          onClick={() => {
            if (!deleting) onCancel();
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm px-5"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 14 }
            }
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.24, ease: EASE_WARM }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-white border border-outline-variant/30 shadow-card p-6 sm:p-7"
          >
            {/* Header icon & close button */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-red-500/12 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <button
                type="button"
                disabled={deleting}
                onClick={onCancel}
                aria-label="Tutup dialog"
                className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2
              id={titleId}
              className="font-heading text-title-lg text-on-surface mb-1.5"
            >
              Hapus Ucapan?
            </h2>
            <p
              id={descId}
              className="text-body-md text-on-surface-variant leading-relaxed"
            >
              Ucapan berikut akan dihapus permanen dan tindakan ini tidak bisa
              dibatalkan.
            </p>

            {/* Target card summary */}
            <div className="mt-4 rounded-2xl bg-surface-container-low border border-outline-variant/25 p-3.5 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white border border-outline-variant/25 flex items-center justify-center text-2xl shrink-0">
                {templateEmoji(target.templateSlug)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-title-md text-on-surface truncate">
                    {target.title || "Untuk Kamu"}
                  </p>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      target.paid
                        ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-500/12 text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    {target.paid ? "Aktif" : "Menunggu bayar"}
                  </span>
                </div>
                <p className="text-label-md text-on-surface-variant truncate">
                  Untuk {target.toName} · dari {target.fromName} ·{" "}
                  {templateMeta?.name ?? target.templateSlug}
                </p>
              </div>
            </div>

            {/* Extra warning when ucapan is already paid & live */}
            {target.paid && (
              <div className="mt-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-label-md text-red-800 dark:text-red-200 leading-relaxed">
                  Ucapan ini sudah <strong>Aktif</strong>. Link publik dan QR
                  Code yang sudah dibagikan tidak akan bisa dibuka lagi setelah
                  dihapus.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <motion.button
                ref={cancelBtnRef}
                type="button"
                disabled={deleting}
                onClick={onCancel}
                whileTap={reduced || deleting ? undefined : { scale: 0.97 }}
                transition={SPRING_TACTILE}
                className="px-5 py-2.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface text-label-lg font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Batal
              </motion.button>
              <motion.button
                type="button"
                disabled={deleting}
                onClick={onConfirm}
                whileHover={reduced || deleting ? undefined : { y: -1 }}
                whileTap={reduced || deleting ? undefined : { scale: 0.97 }}
                transition={SPRING_TACTILE}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-label-lg font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menghapus…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
