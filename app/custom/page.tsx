import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Cake,
  GraduationCap,
  HeartHandshake,
  Link2,
  MessageCircleHeart,
  Palette,
  Sparkles,
  Wand2,
} from "lucide-react";
import CustomBriefForm from "@/components/custom/CustomBriefForm";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Kado Custom — Website Ucapan Eksklusif Dibuatkan Penuh",
  description:
    "Punya ide cerita, ilustrasi, atau interaksi unik di luar template standar? Tim PesanManis bantu buatkan website kado custom mulai Rp 50.000 – Rp 150.000, aktif selamanya di link cantik /u/[nama].",
  alternates: {
    canonical: "/custom",
  },
  openGraph: {
    title: `Kado Custom ${BRAND.name} — Dibuatkan Penuh Sesuai Ceritamu`,
    description:
      "Layanan pembuatan website ucapan personal dari nol dengan ilustrasi & interaksi khusus. Mulai Rp 50.000 – Rp 150.000/order, aktif selamanya.",
    type: "website",
    siteName: BRAND.name,
    locale: "id_ID",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `Kado Custom ${BRAND.name}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Kado Custom ${BRAND.name} — Dibuatkan Penuh Sesuai Ceritamu`,
    description:
      "Layanan pembuatan website ucapan personal dari nol dengan ilustrasi & interaksi khusus. Mulai Rp 50.000 – Rp 150.000/order, aktif selamanya.",
    images: ["/twitter-image"],
  },
};

const USE_CASES = [
  {
    icon: HeartHandshake,
    tag: "Anniversary & LDR",
    title: "Peta Kenangan & Timeline Kalian",
    desc: "Ceritakan perjalanan dari kota yang berbeda, lengkap dengan babak cerita interaktif, playlist rahasia, dan ilustrasi momen berdua.",
  },
  {
    icon: Cake,
    tag: "Birthday Kejutan",
    title: "Mini-Game & Tiup Lilin Personal",
    desc: "Bikin dia bermain misi kecil dulu sebelum membuka hadiah utama, kuis trivia tentang kalian berdua, atau kartu ucapan beranimasi khusus.",
  },
  {
    icon: GraduationCap,
    tag: "Wisuda & Permintaan Maaf",
    title: "Konsep Emosional Sesuai Karakter",
    desc: "Apresiasi kelulusan dengan galeri perjalanan kuliah atau halaman permintaan maaf bertahap yang dirancang khusus untuk meluluhkan hatinya.",
  },
] as const;

const WORKFLOW_STEPS = [
  {
    step: "1",
    icon: MessageCircleHeart,
    title: "Isi Brief & Kirim ke WhatsApp",
    desc: "Ceritakan untuk siapa, momen apa, dan perkiraan konsep atau budgetnya. Tidak perlu ribet menyiapkan desain sendiri.",
  },
  {
    step: "2",
    icon: Palette,
    title: "Diskusi Konsep & DP",
    desc: "Tim kami membantu menyusun konsep visual, ilustrasi, dan interaksinya. Setelah cocok, lanjut pembayaran DP untuk mulai dikerjakan.",
  },
  {
    step: "3",
    icon: Link2,
    title: "Link Jadi & Aktif Selamanya",
    desc: "Setelah revisi selesai dan lunas, website tayang langsung di link cantik /u/[nama] lengkap dengan QR Code siap kirim.",
  },
] as const;

export default function CustomGiftPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface relative overflow-x-clip">
      {/* Subtle warm radial glow matching DESIGN_SYSTEM */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[480px] pointer-events-none"
        style={{
          background:
            "radial-gradient(640px 320px at 18% 8%, rgba(222,112,56,0.09), transparent), radial-gradient(540px 280px at 84% 16%, rgba(245,161,90,0.11), transparent)",
        }}
      />

      {/* Hero Section */}
      <section className="relative z-[1] max-w-[1200px] mx-auto px-5 md:px-16 pt-28 sm:pt-32 pb-14 md:pb-16">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container text-label-md font-semibold border border-primary-fixed-dim/30 shadow-xs mb-5">
            <Wand2 className="h-4 w-4 shrink-0" />
            <span>Kado Custom · Dibuatkan Penuh oleh Tim</span>
          </span>

          <h1 className="font-heading text-[34px] sm:text-display-md lg:text-display-lg leading-[1.12] text-primary mb-5">
            Punya Ide Kejutan Sendiri?{" "}
            <span className="italic">Kami Buatkan Penuh.</span>
          </h1>

          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-7">
            Selain memilih template siap pakai, kamu bisa memesan website ucapan
            eksklusif dengan ilustrasi, alur cerita, dan interaksi yang dirancang
            khusus untuk kalian berdua —{" "}
            <span className="font-semibold text-on-surface">
              mulai Rp 50.000 – Rp 150.000/order
            </span>{" "}
            dan aktif selamanya di link cantik{" "}
            <code className="px-2 py-0.5 rounded-lg bg-surface-container text-primary font-semibold text-body-md">
              /u/[nama]
            </code>
            .
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#brief-form"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-primary hover:bg-[#E88048] text-white text-label-lg font-semibold shadow-[0_8px_28px_rgba(222,112,56,0.3)] hover:-translate-y-0.5 transition-all motion-reduce:transition-none"
            >
              <span>Isi Brief Sekarang</span>
              <ArrowDown className="h-4 w-4" />
            </a>
            <Link
              href="/templates"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-outline-variant/60 bg-surface-container-low hover:border-primary/50 hover:text-primary text-on-surface text-label-lg font-semibold transition-colors"
            >
              <span>Lihat Template Siap Pakai</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Contoh Kasus Penggunaan */}
      <section className="relative z-[1] max-w-[1200px] mx-auto px-5 md:px-16 pb-14 md:pb-18">
        <div className="text-center mb-8">
          <h2 className="font-heading text-headline-md sm:text-headline-lg text-on-surface mb-2">
            Cocok untuk Momen Spesial Apa Saja?
          </h2>
          <p className="text-body-md text-on-surface-variant max-w-xl mx-auto">
            Kamu cukup bawa ceritanya — tim kami bantu ubah jadi pengalaman web
            interaktif yang berkesan.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {USE_CASES.map((item) => (
            <div
              key={item.tag}
              className="bg-surface-container-low rounded-3xl border border-outline-variant/30 shadow-card p-6 flex flex-col"
            >
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="px-3 py-1 rounded-full bg-surface text-label-md font-semibold text-primary border border-primary/20">
                  {item.tag}
                </span>
              </div>
              <h3 className="font-heading text-title-lg text-on-surface mb-2">
                {item.title}
              </h3>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Alur Kerja 3 Langkah */}
      <section className="relative z-[1] bg-surface-container-low border-y border-outline-variant/25">
        <div className="max-w-[1200px] mx-auto px-5 md:px-16 py-14 md:py-16">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/12 text-primary text-label-md font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5" /> Cara Pesan
            </span>
            <h2 className="font-heading text-headline-md sm:text-headline-lg text-on-surface">
              Simpel, Cuma 3 Langkah
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {WORKFLOW_STEPS.map((s) => (
              <div
                key={s.step}
                className="bg-surface rounded-3xl border border-outline-variant/30 p-6 relative"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary text-white font-heading font-bold flex items-center justify-center shadow-xs shrink-0">
                    {s.step}
                  </div>
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-title-lg text-on-surface mb-1.5">
                  {s.title}
                </h3>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form Brief Mini */}
      <section
        id="brief-form"
        className="relative z-[1] scroll-mt-24 max-w-2xl mx-auto px-5 py-14 md:py-20"
      >
        <CustomBriefForm />
      </section>
    </div>
  );
}
