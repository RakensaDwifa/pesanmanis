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
