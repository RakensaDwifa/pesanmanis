"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getUcapan, trackView } from "@/lib/store";
import type { StoredUcapan } from "@/lib/store";
import TemplateRenderer from "@/components/templates/registry";
import Watermark from "@/components/Watermark";
import StoryFlow from "@/components/story/StoryFlow";
import StoryCardButton from "@/components/StoryCardButton";
import ReactionBar from "@/components/ReactionBar";
import ParticleTouch from "@/components/effects/ParticleTouch";
import GateOverlay from "@/components/effects/GateOverlay";
import LoveReceiptModal from "@/components/effects/LoveReceiptModal";
import FlowerTransition, { type FlowerTransitionRef } from "@/components/effects/FlowerTransition";
import { getTemplate } from "@/lib/templates";

const storyKey = (id: string) => `pm:story:${id}`;
const legacyEntryKey = (id: string) => `pm:entry:${id}`;
const gateKey = (id: string) => `pm:gate:${id}`;

export default function PublicView({
  id,
  remote,
}: {
  id: string;
  remote?: StoredUcapan | null;
}) {
  const [ucapan] = useState<StoredUcapan | null>(() => remote ?? getUcapan(id));
  // Template naratif punya alurnya sendiri; StoryFlow (ketuk hati) dilewati.
  const skipStory = Boolean(getTemplate(ucapan?.templateSlug ?? "")?.hasNarrative);
  const [showTemplate, setShowTemplate] = useState<boolean>(() => {
    if (skipStory) return true;
    try {
      return (
        sessionStorage.getItem(storyKey(id)) === "1" ||
        sessionStorage.getItem(legacyEntryKey(id)) === "1"
      );
    } catch {
      return false;
    }
  });
  const [gateUnlocked, setGateUnlocked] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && sessionStorage.getItem(gateKey(id)) === "1";
    } catch {
      return false;
    }
  });
  const flowerRef = useRef<FlowerTransitionRef | null>(null);
  const initialTemplate = useRef(showTemplate);
  // Konten baru dirender setelah petal menutup layar (khusus intro refresh).
  const [ready, setReady] = useState(false);

  // Halaman template: sembunyikan chrome situs + intro bunga saat refresh.
  // Atribut di <html> diset lebih awal oleh script di app/layout.tsx; di sini
  // dijaga untuk navigasi client-side dan dibersihkan saat keluar halaman.
  useLayoutEffect(() => {
    document.documentElement.dataset.immersive = "1";
    if (initialTemplate.current) flowerRef.current?.play(() => setReady(true));
    else setReady(true);
    return () => {
      delete document.documentElement.dataset.immersive;
    };
  }, []);

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

  // Transisi bunga: overlay flower menutup layar, konten diganti saat tertutup.
  const revealTemplate = () => {
    if (flowerRef.current) flowerRef.current.play(() => setShowTemplate(true));
    else setShowTemplate(true);
  };

  if (!showTemplate) {
    return (
      <>
        <FlowerTransition ref={flowerRef} />
        {ready && (
          <StoryFlow
            id={id}
            category={getTemplate(ucapan.templateSlug)?.type}
            toName={ucapan.toName}
            onDone={revealTemplate}
          />
        )}
      </>
    );
  }

  const requiresGate = Boolean(ucapan.paid && ucapan.gateType && showTemplate && !gateUnlocked);

  // Strip sensitive gate_data (pin/answer) dari ucapan sebelum dikirim ke client
  // gateType dan question (jika trivia) tetap dikirim untuk UI
  const safeGateData = ucapan.gateData
    ? { question: ucapan.gateData.question }
    : undefined;

  return (
    <>
      <FlowerTransition ref={flowerRef} />
      {ready && (
        <>
          {requiresGate ? (
            <GateOverlay
              toName={ucapan.toName}
              fromName={ucapan.fromName}
              gateType={ucapan.gateType!}
              gateData={safeGateData}
              onUnlock={() => {
                try {
                  sessionStorage.setItem(gateKey(id), "1");
                } catch {
                  /* ignore */
                }
                setGateUnlocked(true);
              }}
              ucapanId={id}
            />
          ) : (
            <>
              {ucapan.paid && ucapan.touchParticles && (
                <ParticleTouch type={ucapan.touchParticles} />
              )}
              <TemplateRenderer content={ucapan} />
              {!ucapan.paid && <Watermark />}
              {ucapan.paid && ucapan.receiptEnabled && (
                <LoveReceiptModal
                  toName={ucapan.toName}
                  fromName={ucapan.fromName}
                  dateStr={ucapan.paidAt ? new Date(ucapan.paidAt).toISOString() : undefined}
                  templateSlug={ucapan.templateSlug}
                />
              )}
              <StoryCardButton ucapan={ucapan} />
              <ReactionBar ucapanId={id} />
            </>
          )}
        </>
      )}
    </>
  );
}
