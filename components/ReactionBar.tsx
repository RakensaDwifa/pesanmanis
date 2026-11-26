"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircleHeart, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isRemote } from "@/lib/supabase/config";
import { playSfx } from "@/lib/sfx";

interface Reaction {
  emoji: string;
  created_at: string;
}
interface Reply {
  from_name: string;
  message: string;
  created_at: string;
}

const EMOJIS = ["❤️", "😍", "🥰", "😭", "🤗", "👏"];

export default function ReactionBar({ ucapanId }: { ucapanId: string }) {
  const [open, setOpen] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [fromName, setFromName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const remote = isRemote();

  const fetchInteractions = useCallback(async (): Promise<{
    reactions: Reaction[];
    replies: Reply[];
  } | null> => {
    if (remote) {
      try {
        const [rRes, pRes] = await Promise.all([
          fetch(`/api/ucapan/${encodeURIComponent(ucapanId)}/reactions`),
          fetch(`/api/ucapan/${encodeURIComponent(ucapanId)}/replies`),
        ]);
        const [r, p] = await Promise.all([rRes.json(), pRes.json()]);
        return {
          reactions: Array.isArray(r.reactions) ? r.reactions : [],
          replies: Array.isArray(p.replies) ? p.replies : [],
        };
      } catch {
        return null;
      }
    }
    try {
      return {
        reactions: JSON.parse(localStorage.getItem(`pm:reactions:${ucapanId}`) ?? "[]"),
        replies: JSON.parse(localStorage.getItem(`pm:replies:${ucapanId}`) ?? "[]"),
      };
    } catch {
      return null;
    }
  }, [remote, ucapanId]);

  const refresh = useCallback(async () => {
    const data = await fetchInteractions();
    if (!data) return;
    setReactions(data.reactions);
    setReplies(data.replies);
  }, [fetchInteractions]);

  useEffect(() => {
    let cancelled = false;
    void fetchInteractions().then((data) => {
      if (cancelled || !data) return;
      setReactions(data.reactions);
      setReplies(data.replies);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchInteractions]);

  const react = async (emoji: string) => {
    playSfx("heart");
    if (remote) {
      try {
        const res = await fetch(`/api/ucapan/${encodeURIComponent(ucapanId)}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        });
        if (!res.ok) {
          toast.error(
            res.status === 429
              ? "Pelan-pelan ya, coba lagi sebentar."
              : "Gagal mengirim reaksi."
          );
          return;
        }
        void refresh();
      } catch {
        toast.error("Gagal mengirim reaksi. Periksa koneksi internetmu.");
      }
    } else {
      const next = [...reactions, { emoji, created_at: new Date().toISOString() }];
      setReactions(next);
      try {
        localStorage.setItem(`pm:reactions:${ucapanId}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
  };

  const sendReply = async () => {
    const name = fromName.trim();
    const msg = message.trim();
    if (!name || !msg || submitting) return;
    setSubmitting(true);
    try {
      if (remote) {
        const res = await fetch(`/api/ucapan/${encodeURIComponent(ucapanId)}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromName: name, message: msg }),
        });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
        if (res.ok && json.ok) {
          setFromName("");
          setMessage("");
          toast.success("Balasanmu terkirim 💌");
          void refresh();
        } else {
          toast.error(
            res.status === 429
              ? "Terlalu banyak balasan. Coba lagi dalam 1 menit."
              : "Gagal mengirim balasan. Coba lagi ya."
          );
        }
      } else {
        const next = [
          ...replies,
          { from_name: name, message: msg, created_at: new Date().toISOString() },
        ];
        setReplies(next);
        try {
          localStorage.setItem(`pm:replies:${ucapanId}`, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        setFromName("");
        setMessage("");
        toast.success("Balasanmu terkirim 💌");
      }
    } catch {
      toast.error("Gagal terhubung ke server. Coba lagi ya.");
    } finally {
      setSubmitting(false);
    }
  };

  const counts = EMOJIS.map((e) => ({
    emoji: e,
    n: reactions.filter((r) => r.emoji === e).length,
  })).filter((c) => c.n > 0);

  return (
    <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            data-light-card
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="w-72 max-w-[88vw] rounded-2xl bg-white/95 text-[#241914] backdrop-blur-md border border-outline-variant/40 shadow-xl p-4"
          >
            <p className="text-label-lg font-semibold text-on-surface mb-2">
              Kirim Balasan 💌
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => void react(e)}
                  className="text-xl leading-none px-2 py-1 rounded-full bg-surface-container-low hover:bg-primary-fixed/40 transition-colors"
                  aria-label={`Reaksi ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Namamu"
                maxLength={60}
                className="w-full rounded-xl border border-outline-variant/50 bg-white px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tulis balasan..."
                maxLength={1000}
                rows={2}
                className="w-full rounded-xl border border-outline-variant/50 bg-white px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary resize-none"
              />
              <button
                type="button"
                disabled={submitting || !fromName.trim() || !message.trim()}
                onClick={() => void sendReply()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-label-md font-semibold hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> {submitting ? "Mengirim…" : "Kirim"}
              </button>
            </div>

            {(counts.length > 0 || replies.length > 0) && (
              <div data-lenis-prevent className="mt-3 pt-3 border-t border-outline-variant/30 space-y-2 max-h-48 overflow-auto">
                {counts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {counts.map((c) => (
                      <span
                        key={c.emoji}
                        className="inline-flex items-center gap-1 text-label-md bg-primary-fixed/40 text-primary rounded-full px-2 py-0.5"
                      >
                        {c.emoji} {c.n}
                      </span>
                    ))}
                  </div>
                )}
                {replies.map((r, i) => (
                  <div key={i} className="rounded-xl bg-surface-container-low p-2.5">
                    <p className="text-label-md font-semibold text-on-surface">
                      {r.from_name}
                    </p>
                    <p className="text-body-md text-on-surface-variant whitespace-pre-wrap">
                      {r.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center justify-center rounded-full bg-white/85 backdrop-blur-md border border-outline-variant/40 text-primary shadow-lg w-12 h-12 hover:scale-105 active:scale-95 transition-transform"
        )}
        aria-label="Balasan & reaksi"
        title="Balasan & reaksi"
      >
        <MessageCircleHeart className="h-5 w-5" />
      </button>
    </div>
  );
}
