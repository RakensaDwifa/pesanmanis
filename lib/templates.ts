import type { TemplateCategory, TemplateMeta, UcapanContent } from "./types";

export const TEMPLATES: TemplateMeta[] = [
  {
    slug: "amplop-cinta",
    name: "Amplop Cinta",
    type: "ungkapan-sayang",
    description:
      "Sebuah surat cinta klasik. Klik amplopnya, dan pesanmu terbuka dengan lembut.",
    active: true,
    order: 1,
    gradient: "from-[#FFE3D2] to-[#FFB98F]",
    badge: "popular",
    mockupSubtitle: "UNTUK SAYANG",
    mockupHeadline: "Ada surat cinta yang menunggu",
    mockupCta: "Ketuk hati 3x ✨",
    glowColor: "rgba(244, 114, 182, 0.22)",
    phoneGradient: "linear-gradient(180deg, rgba(255, 241, 246, 1) 0%, rgba(255, 212, 225, 1) 100%)",
  },
  {
    slug: "botol-kenangan",
    name: "Botol Kenangan",
    type: "ungkapan-sayang",
    description:
      "Pesan tersembunyi dalam botol. Pecahkan, dan cerita kalian terbuka satu per satu.",
    active: true,
    order: 2,
    gradient: "from-[#C9E7F5] to-[#9FD4E8]",
    mockupSubtitle: "KENANGAN KITA",
    mockupHeadline: "Pesan rahasia di dalam botol",
    mockupCta: "Buka gulungan 📜",
    glowColor: "rgba(56, 189, 248, 0.22)",
    phoneGradient: "linear-gradient(180deg, rgba(224, 242, 254, 1) 0%, rgba(253, 226, 208, 1) 100%)",
  },
  {
    slug: "buket-bunga",
    name: "Buket Bunga",
    type: "birthday",
    description:
      "Rangkai buket bunga digital untuk hari spesialnya, lengkap dengan kejutan di tengahnya.",
    active: true,
    order: 3,
    gradient: "from-[#FBE3D0] to-[#F5C6A8]",
    mockupSubtitle: "SELAMAT ULANG TAHUN",
    mockupHeadline: "Buket kecil untuk hari spesialmu",
    mockupCta: "Buka buket 🎀",
    glowColor: "rgba(217, 119, 6, 0.22)",
    phoneGradient: "linear-gradient(180deg, rgba(253, 248, 240, 1) 0%, rgba(243, 226, 206, 1) 100%)",
  },
  {
    slug: "surat-cinta",
    name: "Surat Cinta",
    type: "ungkapan-sayang",
    description:
      "Surat kertas bergaris dengan stempel hati. Klik, dan pesanmu terbaca pelan seperti dituliskan.",
    active: true,
    order: 4,
    gradient: "from-[#F7E7C9] to-[#EED9AC]",
    mockupSubtitle: "CATATAN HATI",
    mockupHeadline: "Tertulis pelan hanya untukmu",
    mockupCta: "Baca surat 💌",
    glowColor: "rgba(194, 89, 38, 0.22)",
    phoneGradient: "linear-gradient(180deg, rgba(255, 248, 235, 1) 0%, rgba(255, 225, 189, 1) 100%)",
  },
  {
    slug: "kartu-ucapan",
    name: "Kartu Ucapan",
    type: "birthday",
    description:
      "Kartu ucapan dengan pita dan kejutan di dalamnya. Semua doa terbaik untuk momen spesialnya.",
    active: true,
    order: 5,
    gradient: "from-[#FFE9CE] to-[#FFC98F]",
    mockupSubtitle: "DOA TERBAIK",
    mockupHeadline: "Tarik pita untuk buka kejutan",
    mockupCta: "Tarik pita ✨",
    glowColor: "rgba(244, 63, 94, 0.22)",
    phoneGradient: "linear-gradient(180deg, rgba(255, 248, 235, 1) 0%, rgba(255, 225, 189, 1) 100%)",
  },
  {
    slug: "valentine",
    name: "Valentine",
    type: "anniversary",
    description:
      "Hati berdenyut yang menyimpan surat berlapis. Untuk hari-hari penuh cinta kalian.",
    active: true,
    order: 6,
    gradient: "from-[#FFDCC8] to-[#FFA37C]",
    badge: "popular",
    mockupSubtitle: "HAPPY ANNIVERSARY",
    mockupHeadline: "Setiap hari terasa istimewa",
    mockupCta: "Sentuh hati ❤️",
    glowColor: "rgba(136, 19, 55, 0.22)",
    phoneGradient: "linear-gradient(180deg, rgba(76, 5, 25, 1) 0%, rgba(136, 19, 55, 1) 100%)",
    phoneDark: true,
  },
  {
    slug: "permintaan-maaf",
    name: "Permintaan Maaf",
    type: "permintaan-maaf",
    description:
      "Cara paling menggemaskan untuk minta maaf. Tombol kaburnya bikin dia nggak bisa marah lama.",
    active: true,
    order: 7,
    gradient: "from-[#E6EFE6] to-[#BFD8BF]",
    mockupSubtitle: "MAAF YA SAYANG",
    mockupHeadline: "Boleh nggak dimaafin hari ini?",
    mockupCta: "Iya, dimaafin 💕",
    glowColor: "rgba(134, 239, 172, 0.22)",
    phoneGradient: "linear-gradient(180deg, rgba(243, 247, 240, 1) 0%, rgba(225, 236, 218, 1) 100%)",
  },
  {
    slug: "kaca-berembun",
    name: "Kaca Berembun",
    type: "ungkapan-sayang",
    description:
      "Alur cerita naratif bertingkat. Hapus embun di kaca jendela saat hujan untuk mengungkap pesan cinta tersembunyi.",
    active: true,
    order: 8,
    gradient: "from-[#0F172A] to-[#1E293B]",
    hasNarrative: true,
    badge: "new",
    mockupSubtitle: "SAAT HUJAN TURUN",
    mockupHeadline: "Usap embun di kaca jendela...",
    mockupCta: "Hapus embun 💧",
    glowColor: "rgba(96, 165, 250, 0.22)",
    phoneGradient: "linear-gradient(180deg, rgba(30, 41, 59, 1) 0%, rgba(51, 65, 85, 1) 100%)",
    phoneDark: true,
  },
  {
    slug: "bonceng-malam",
    name: "Bonceng Malam",
    type: "ungkapan-sayang",
    description:
      "Perjalanan night ride romantis. Kunci helm, tahan gas menembus lampu jalan kota, dan buka jok motor berisi mawar rahasia.",
    active: true,
    order: 9,
    gradient: "from-[#18181B] to-[#27272A]",
    hasNarrative: true,
    badge: "popular",
    mockupSubtitle: "NIGHT RIDE",
    mockupHeadline: "Menembus lampu kota bersamamu",
    mockupCta: "Tahan gas 🌙",
    glowColor: "rgba(251, 146, 60, 0.22)",
    phoneGradient: "linear-gradient(180deg, rgba(15, 23, 42, 1) 0%, rgba(30, 27, 75, 1) 100%)",
    phoneDark: true,
  },
];

export const CATEGORY_ORDER: TemplateCategory[] = [
  "ungkapan-sayang",
  "birthday",
  "anniversary",
  "permintaan-maaf",
];

export function getTemplate(slug: string): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}

export function getActiveTemplates(): TemplateMeta[] {
  return TEMPLATES.filter((t) => t.active).sort((a, b) => a.order - b.order);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function makeUcapanId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const TEMPLATE_EMOJI: Record<string, string> = {
  "amplop-cinta": "💌",
  "botol-kenangan": "🫙",
  "buket-bunga": "💐",
  "surat-cinta": "✉️",
  "kartu-ucapan": "🎀",
  valentine: "❤️",
  "permintaan-maaf": "🕊️",
  "kaca-berembun": "🌧️",
  "bonceng-malam": "🛵",
};

export function templateEmoji(slug: string): string {
  return TEMPLATE_EMOJI[slug] ?? "💝";
}

export function fillContentDefaults(
  content: Partial<UcapanContent>
): UcapanContent {
  return {
    templateSlug: content.templateSlug ?? "amplop-cinta",
    toName: content.toName ?? "Sayang",
    fromName: content.fromName ?? "Kesayanganmu",
    title: content.title ?? "Untuk Kamu",
    message: content.message ?? "",
    photos: content.photos ?? [],
    musicUrl: content.musicUrl,
    videoUrl: content.videoUrl,
    mood: content.mood,
    email: content.email,
    timeline: content.timeline,
    createdAt: content.createdAt,
  };
}
