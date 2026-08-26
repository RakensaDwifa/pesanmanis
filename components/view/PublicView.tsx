"use client";

import { useEffect, useState } from "react";
import { getUcapan, trackView } from "@/lib/store";
import type { StoredUcapan } from "@/lib/store";
import TemplateRenderer from "@/components/templates/registry";
import Watermark from "@/components/Watermark";
import EntryGame from "@/components/EntryGame";
import StoryCardButton from "@/components/StoryCardButton";
import ReactionBar from "@/components/ReactionBar";

const entryKey = (id: string) => `pm:entry:${id}`;

export default function PublicView({
  id,
  remote,
}: {
  id: string;
  remote?: StoredUcapan | null;
}) {
  const [ucapan] = useState<StoredUcapan | null>(() => remote ?? getUcapan(id));
  const [entered, setEntered] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && sessionStorage.getItem(entryKey(id)) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!ucapan) return;
    trackView(id);
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ucapanId: id }),
    }).catch(() => undefined);
  }, [id, ucapan]);

  if (!ucapan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-5 text-center">
        <p className="text-headline-md text-on-surface mb-3">Ucapan tidak ditemukan</p>
        <p className="text-body-md text-on-surface-variant mb-6">
          Mungkin belum dibuat, atau link-nya salah.
        </p>
        <a
          href="/templates"
          className="px-8 py-3 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md"
        >
          Buat Ucapanmu Sendiri
        </a>
      </div>
    );
  }

  if (!entered) {
    return (
      <EntryGame
        toName={ucapan.toName}
        onOpen={() => {
          try {
            sessionStorage.setItem(entryKey(id), "1");
          } catch {
            /* ignore */
          }
          setEntered(true);
        }}
      />
    );
  }

  return (
    <>
      <TemplateRenderer content={ucapan} />
      {!ucapan.paid && <Watermark />}
      <StoryCardButton ucapan={ucapan} />
      <ReactionBar ucapanId={id} />
    </>
  );
}
