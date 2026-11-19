import type { NarrativeManifest } from "@/lib/narrative/types";

export const BONCENG_MALAM_MANIFEST: NarrativeManifest = {
  id: "bonceng-malam",
  name: "Bonceng Malam",
  theme: "Love / Romantis Nostalgia / Night Ride",
  chapters: [
    {
      id: "pasang_helm",
      type: "drag_target",
      title: "Sebelum Jalan",
      narration: "Malam ini udaranya dingin. Sini aku bantu pasangin helmnya dulu biar aman...",
      instruction: "Geser tali gesper helm sampai berbunyi 'klik!'",
      sourceLabel: "Geser kunci helm →",
      targetLabel: "Kunci",
      bgOverlay: "bg-slate-950/70",
    },
    {
      id: "naikkan_kaca",
      type: "tap_count",
      title: "Kaca Helm Turun",
      narration: "Eh, visor kacanya malah turun nutupin muka. Coba ketuk sekali biar kacanya naik...",
      instruction: "Ketuk layar 1 kali untuk naikkan visor helm",
      requiredTaps: 1,
      bgOverlay: "bg-slate-950/60",
    },
    {
      id: "night_ride",
      type: "hold",
      title: "Menembus Lampu Kota",
      narration: "Siap ya? Pegangan yang erat di jaketku, kita telusuri jalanan malam ini...",
      instruction: "Tahan tombol untuk melaju di bawah lampu jalan",
      buttonLabel: "Pegangan Erat 🛵",
      holdDurationMs: 4000,
      bgOverlay: "bg-slate-950/50",
    },
    {
      id: "sampai_tujuan",
      type: "cinematic",
      title: "Tiba di Tepi Bukit",
      narration: "Motornya mati, lampu kota kelihatan cantik dari sini. Sebelum pulang, ada sesuatu yang kusimpan di balik jok motor...",
      instruction: "Buka jok motor",
      buttonText: "Buka Jok Motor 🎁",
      bgOverlay: "bg-amber-950/50",
    },
  ],
};
