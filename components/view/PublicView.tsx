"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { getUcapan, trackView } from "@/lib/store";
import type { StoredUcapan } from "@/lib/types";
import TemplateRenderer from "@/components/templates/registry";
import Watermark from "@/components/Watermark";
import StoryFlow from "@/components/story/StoryFlow";
import StoryCardButton from "@/components/StoryCardButton";
import ReactionBar from "@/components/ReactionBar";
import ParticleTouch from "@/components/effects/ParticleTouch";
import GateOverlay from "@/components/effects/GateOverlay";
import LoveReceiptModal from "@/components/effects/LoveReceiptModal";
import FlowerTransition, {
  type FlowerTransitionRef,
} from "@/components/effects/FlowerTransition";
import { getTemplate } from "@/lib/templates";
import InAppBrowserBanner from "@/components/view/InAppBrowserBanner";

const storyKey = (id: string) => `pm:story:${id}`;
const legacyEntryKey = (id: string) => `pm:entry:${id}`;
const gateKey = (id: string) => `pm:gate:${id}`;
const emptySubscribe = () => () => {};

function readSessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export default function PublicView({
  id,
  remote,
}: {
  id: string;
  remote?: StoredUcapan | null;
}) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const demoUcapan = useMemo(
    () => (isClient && !remote ? getUcapan(id) : null),
    [id, isClient, remote]
  );

  // When Intimate Gate unlocks via server verification, the full redacted payload arrives here.
  const [unlockedUcapan, setUnlockedUcapan] = useState<StoredUcapan | null>(null);
  const ucapan = unlockedUcapan ?? remote ?? demoUcapan;

  // Template naratif punya alurnya sendiri; StoryFlow (ketuk hati) dilewati.
  const skipStory = Boolean(getTemplate(ucapan?.templateSlug ?? "")?.hasNarrative);
  const storySeenInSession =
    isClient &&
    (readSessionFlag(storyKey(id)) || readSessionFlag(legacyEntryKey(id)));
  const [manualShowTemplate, setManualShowTemplate] = useState(false);
  const showTemplate = skipStory || storySeenInSession || manualShowTemplate;

  // For remote gated ucapan, unlock state is strictly server-driven (remote.locked).
  // For local Demo Mode (!remote), fall back to sessionStorage flag.
  const demoGateUnlocked = isClient && !remote && readSessionFlag(gateKey(id));
  const [manualGateUnlocked, setManualGateUnlocked] = useState(false);
  const isServerLocked = Boolean(remote?.locked && !unlockedUcapan);
  const gateUnlocked = remote
    ? !isServerLocked
    : demoGateUnlocked || manualGateUnlocked;

  const flowerRef = useRef<FlowerTransitionRef | null>(null);
  const viewTrackedRef = useRef(false);
  const [ready, setReady] = useState(false);

  const hasActiveGate = Boolean(
    ucapan?.paid && ucapan?.gateType && (!gateUnlocked || ucapan.locked)
  );

  useLayoutEffect(() => {
    document.documentElement.dataset.immersive = "1";
    const alreadyShowingTemplate =
      skipStory ||
      readSessionFlag(storyKey(id)) ||
      readSessionFlag(legacyEntryKey(id));

    if (alreadyShowingTemplate && flowerRef.current) {
      void flowerRef.current.play(() => setReady(true));
    } else {
      const rafId = requestAnimationFrame(() => setReady(true));
      return () => {
        cancelAnimationFrame(rafId);
        delete document.documentElement.dataset.immersive;
      };
    }

    return () => {
      delete document.documentElement.dataset.immersive;
    };
  }, [id, skipStory]);

  useEffect(() => {
    if (!ucapan || hasActiveGate || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    trackView(id);
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ucapanId: id }),
    }).catch(() => undefined);
  }, [id, ucapan, hasActiveGate]);

  if (!ucapan) {
    if (!isClient && !remote) {
      return <div className="min-h-screen bg-surface" />;
    }
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
    if (flowerRef.current) {
      void flowerRef.current.play(() => setManualShowTemplate(true));
    } else {
      setManualShowTemplate(true);
    }
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

  const requiresGate = Boolean(hasActiveGate && showTemplate);
  const safeGateData = remote
    ? ucapan.gateData?.question
      ? { question: ucapan.gateData.question }
      : undefined
    : ucapan.gateData;

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
              ucapanId={remote ? id : undefined}
              onUnlock={(unlockedPayload) => {
                if (unlockedPayload) {
                  setUnlockedUcapan(unlockedPayload);
                } else {
                  try {
                    sessionStorage.setItem(gateKey(id), "1");
                  } catch {
                    /* ignore */
                  }
                  setManualGateUnlocked(true);
                }
              }}
            />
          ) : (
            <>
              <InAppBrowserBanner />
              {ucapan.paid && ucapan.touchParticles && (
                <ParticleTouch type={ucapan.touchParticles} />
              )}
              <TemplateRenderer content={ucapan} />
              {!ucapan.paid && <Watermark />}
              {ucapan.paid && ucapan.receiptEnabled && (
                <LoveReceiptModal
                  toName={ucapan.toName}
                  fromName={ucapan.fromName}
                  dateStr={
                    ucapan.paidAt
                      ? new Date(ucapan.paidAt).toISOString()
                      : new Date(ucapan.createdAt).toISOString()
                  }
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
