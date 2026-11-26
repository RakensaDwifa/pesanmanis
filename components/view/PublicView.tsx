"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
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
import CountdownGate from "@/components/view/CountdownGate";
import VoiceNotePlayer from "@/components/view/VoiceNotePlayer";
import { isUcapanCountdownLocked } from "@/lib/unlock-schedule";

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
  serverNowMs,
}: {
  id: string;
  remote?: StoredUcapan | null;
  serverNowMs?: number;
}) {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const demoUcapan = useMemo(
    () => (isClient && !remote ? getUcapan(id) : null),
    [id, isClient, remote]
  );

  // When Intimate Gate or Countdown unlocks via server verification, the full payload arrives here.
  const [unlockedUcapan, setUnlockedUcapan] = useState<StoredUcapan | null>(null);
  const ucapan = unlockedUcapan ?? remote ?? demoUcapan;

  // Countdown / Jadwal Buka: anchor clock to server time when provided so local device clock skew
  // cannot bypass the countdown or race ahead of server reveal.
  const [mountNowMs] = useState(() => Date.now());
  const [clockOffsetMs] = useState(() =>
    typeof serverNowMs === "number" && Number.isFinite(serverNowMs)
      ? serverNowMs - Date.now()
      : 0
  );
  const [countdownDismissed, setCountdownDismissed] = useState(false);
  const [unlockingCountdown, setUnlockingCountdown] = useState(false);
  const countdownUnlocked =
    countdownDismissed ||
    !ucapan?.unlockAt ||
    !isUcapanCountdownLocked(ucapan.unlockAt, mountNowMs + clockOffsetMs);

  const handleCountdownUnlocked = useCallback(async () => {
    if (!remote || !remote.locked || remote.gateType) {
      setCountdownDismissed(true);
      return;
    }

    setUnlockingCountdown(true);
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(`/api/ucapan/${encodeURIComponent(id)}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = (await res.json()) as {
            ok?: boolean;
            ucapan?: StoredUcapan | null;
          };
          if (json.ok && json.ucapan && !json.ucapan.locked) {
            setUnlockedUcapan(json.ucapan);
            setCountdownDismissed(true);
            setUnlockingCountdown(false);
            return;
          }
        }
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    } catch {
      // fallback ke refresh server
    }
    router.refresh();
    setCountdownDismissed(true);
    setUnlockingCountdown(false);
  }, [id, remote, router]);

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
    if (!ucapan || !countdownUnlocked || hasActiveGate || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    trackView(id);
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ucapanId: id }),
    }).catch(() => undefined);
  }, [id, ucapan, countdownUnlocked, hasActiveGate]);

  // Transisi bunga: overlay flower menutup layar, konten diganti saat tertutup.
  // Didefinisikan sebelum early return agar tidak melanggar rules-of-hooks.
  const revealTemplate = useCallback(() => {
    if (flowerRef.current) {
      void flowerRef.current.play(() => setManualShowTemplate(true));
    } else {
      setManualShowTemplate(true);
    }
  }, []);

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

  // CountdownGate: tampil SEBELUM StoryFlow & Intimate Gate jika jadwal buka belum tercapai.
  if (unlockingCountdown) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F0EB] px-6 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#DE7038] border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium text-[#8B5E42]">Membuka kejutanmu…</p>
      </div>
    );
  }

  if (!countdownUnlocked && ucapan?.unlockAt) {
    return (
      <CountdownGate
        toName={ucapan.toName}
        unlockAt={ucapan.unlockAt}
        clockOffsetMs={clockOffsetMs}
        onUnlocked={() => void handleCountdownUnlocked()}
      />
    );
  }

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
              <TemplateRenderer content={ucapan} ucapanId={id} />
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
              {ucapan.voiceNoteUrl && (!ucapan.paid || ucapan.voiceNoteEnabled) && (
                <VoiceNotePlayer
                  key={ucapan.voiceNoteUrl}
                  url={ucapan.voiceNoteUrl}
                  fromName={ucapan.fromName}
                  variant="floating"
                  floatingOffsetClass={
                    ucapan.paid && ucapan.receiptEnabled
                      ? "bottom-38 right-5"
                      : "bottom-24 right-5"
                  }
                />
              )}
              <ReactionBar ucapanId={id} />
            </>
          )}
        </>
      )}
    </>
  );
}
