"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, toggleMuted } from "@/lib/sfx";

export default function SfxToggle() {
  const [m, setM] = useState(false);

  useEffect(() => setM(isMuted()), []);

  return (
    <button
      type="button"
      onClick={() => setM(toggleMuted())}
      aria-label={m ? "Nyalakan suara" : "Bisukan suara"}
      title={m ? "Suara nyala" : "Suara bisu"}
      className="fixed bottom-6 left-[5.25rem] z-50 flex items-center justify-center rounded-full bg-white/85 backdrop-blur-md border border-outline-variant/40 text-primary shadow-lg w-12 h-12 hover:scale-105 active:scale-95 transition-transform"
    >
      {m ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
  );
}
