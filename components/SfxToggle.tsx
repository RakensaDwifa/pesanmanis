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
      className="flex items-center justify-center rounded-full bg-white/85 backdrop-blur-md border border-outline-variant/40 text-primary shadow-lg w-11 h-11 hover:scale-105 active:scale-95 transition-transform"
    >
      {m ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
  );
}
