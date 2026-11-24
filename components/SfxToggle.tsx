"use client";

import { useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, toggleMuted } from "@/lib/sfx";

const emptySubscribe = () => () => {};

export default function SfxToggle() {
  const storedMuted = useSyncExternalStore(emptySubscribe, isMuted, () => false);
  const [override, setOverride] = useState<boolean | null>(null);
  const m = override ?? storedMuted;

  return (
    <button
      type="button"
      onClick={() => setOverride(toggleMuted())}
      aria-label={m ? "Nyalakan suara" : "Bisukan suara"}
      title={m ? "Suara nyala" : "Suara bisu"}
      className="flex items-center justify-center rounded-full bg-white/85 backdrop-blur-md border border-outline-variant/40 text-primary shadow-lg w-11 h-11 hover:scale-105 active:scale-95 transition-transform"
    >
      {m ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
  );
}
