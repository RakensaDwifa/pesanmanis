import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  Gamepad2,
  Heart,
  Images,
  Infinity as InfinityIcon,
  LayoutGrid,
  MessageSquareHeart,
  Music,
  PencilLine,
  QrCode,
  Rocket,
  Sparkles,
  Timer,
  User,
  Wallet,
} from "lucide-react";
import Faq from "@/components/landing/Faq";
import CourierGame from "@/components/landing/CourierGame";
import HeroPreviewMockup from "@/components/landing/HeroPreviewMockup";
import KoleksiSection from "@/components/landing/KoleksiSection";
import { fillContentDefaults, getActiveTemplates } from "@/lib/templates";
import { BRAND } from "@/lib/brand";

const STEPS = [
  {
    icon: LayoutGrid,
    title: "Pilih Template",
    desc: "Momen apa yang mau dirayakan? Ada yang manis, ada yang playful.",
  },
  {
    icon: PencilLine,
    title: "Tulis & Tempel Foto",
    desc: "Editor satu halaman: tulis pesan, unggah foto, pasang lagu — sambil lihat hasilnya langsung.",
  },
  {
    icon: Eye,
    title: "Preview Jadi Satu",
    desc: "Live preview di samping editor. Apa yang kamu lihat, itu yang dia terima.",
  },
  {
    icon: Rocket,
    title: "Bayar & Bagikan",
    desc: `Sekali bayar ${BRAND.priceLabel}, link langsung aktif. Tinggal kirim atau scan QR.`,
  },
];

const STATS = [
  { icon: LayoutGrid, value: `${getActiveTemplates().length}`, label: "Template interaktif" },
  { icon: Timer, value: "5 menit", label: "Dari nol sampai jadi" },
  { icon: Wallet, value: BRAND.priceLabel, label: "Sekali bayar, selamanya" },
  { icon: InfinityIcon, value: "∞", label: "Link aktif tanpa batas" },
];

const FEATURES_BIG = [
  {
    icon: Images,
    title: "Galeri Kenangan",
    desc: "Kumpulkan foto-foto terbaik kalian dalam satu halaman. Otomatis dikompres, tampil rapi di galeri interaktif.",
  },
  {
    icon: MessageSquareHeart,
    title: "Pesan yang Ditulis untuk Dia",
    desc: "Bukan template chat. Surat sungguhan dengan nama kamu berdua di dalamnya — dibuka perlahan, dibaca pelan.",
  },
];

const FEATURES_SMALL = [
  {
    icon: User,
    title: "Personalisasi Nama",
    desc: "Nama dia dan kamu tampil di seluruh halaman.",
  },
  {
    icon: Music,
    title: "Musik Latar",
    desc: "Pasang lagu yang punya cerita untuk kalian.",
  },
  {
    icon: QrCode,
    title: "Bagikan via QR",
    desc: "Link atau QR code, tinggal scan langsung buka.",
  },
  {
    icon: Eye,
    title: "Jejak Kunjungan",
    desc: "Dapat tahu kapan dia pertama membukanya.",
  },
];

export default function HomePage() {
  const templates = getActiveTemplates();
  const heroSample = fillContentDefaults({
    templateSlug: "surat-cinta",
    message:
      "Ada hal-hal yang lebih mudah ditulis daripada diucapkan. Terima kasih sudah jadi rumah yang paling nyaman.",
  });

  return (
    <>
      {/* HERO — split 2 kolom di desktop + live preview template asli */}
      <section className="w-full relative bg-surface overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(600px 300px at 20% 10%, rgba(222,112,56,0.08), transparent), radial-gradient(500px 260px at 85% 20%, rgba(245,161,90,0.10), transparent)",
          }}
        />
        <div className="relative z-[1] px-5 md:px-16 max-w-[1200px] mx-auto pt-[104px] pb-14 lg:pt-[124px] lg:pb-20">
          <div className="lg:grid lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-12">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-container text-on-primary-container text-label-md lg:text-label-lg font-semibold rounded-full mb-5 border border-primary-fixed-dim/30 shadow-sm">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Website ucapan personal, se-manis itu</span>
              </span>
              <h1 className="font-heading text-display-md lg:text-display-lg text-primary mb-5 leading-tight max-w-2xl mx-auto lg:mx-0">
                Kirim rasa, <span className="italic">bukan sekadar kata.</span>
              </h1>
              <p className="text-body-lg font-medium text-on-surface-variant mb-8 max-w-xl mx-auto lg:mx-0">
                PesanManis mengubah perasaanmu jadi website ucapan yang interaktif —
                lengkap dengan foto, musik, dan kejutan di baliknya. Untuk pacar,
                sahabat, atau siapa pun yang spesial.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/templates"
                  className="w-full sm:w-auto px-9 py-4 bg-primary hover:bg-[#E88048] text-white text-label-lg font-semibold rounded-full shadow-[0_8px_30px_rgba(222,112,56,0.3)] hover:-translate-y-0.5 transition-all duration-300 inline-flex items-center justify-center gap-2"
                >
                  Mulai Buat Kejutan <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#kurir"
                  className="w-full sm:w-auto px-6 py-4 rounded-full border border-outline-variant/60 bg-surface-container-low/80 hover:border-primary/50 hover:text-primary text-on-surface text-label-lg font-semibold transition-all duration-200 inline-flex items-center justify-center gap-2"
                >
                  <Gamepad2 className="h-4 w-4 text-primary" />
                  <span>Coba Mini-Game</span>
                </Link>
              </div>
              <p className="mt-3.5 text-[12px] font-medium text-on-surface-variant/85 italic">
                * Link aktif selamanya, bisa diedit 7 hari
              </p>
            </div>

            {/* Live preview — template asli, bisa diklik */}
            <div className="mt-12 lg:mt-0 flex justify-center lg:justify-end">
              <HeroPreviewMockup content={heroSample} />
            </div>
          </div>

          {/* Stats faktual */}
          <div className="mt-12 lg:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-center">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-2xl border border-outline-variant/25 shadow-card px-4 py-5"
              >
                <s.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="font-heading text-title-lg text-on-surface">{s.value}</p>
                <p className="text-label-md text-on-surface-variant mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MINI-GAME — kurir kado, pembuktian interaktif sebelum penjelasan */}
      <CourierGame />

      {/* CARA KERJA — timeline horizontal */}
      <section className="w-full relative bg-primary overflow-hidden" id="cara-kerja">
        <div className="relative z-[1] px-5 md:px-16 max-w-[1200px] mx-auto py-20 md:py-[110px]">
          <div className="mb-14 text-center">
            <h2 className="font-heading text-headline-lg text-white mb-4">
              Dari Perasaan Jadi Kejutan, Cuma 4 Langkah
            </h2>
            <p className="text-body-lg font-medium text-white/90">
              Tanpa coding, tanpa desain.{" "}
              <span className="font-semibold text-white">5 menit</span> juga jadi.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-10 md:gap-6 relative">
            <div
              aria-hidden
              className="hidden md:block absolute top-8 left-[12%] right-[12%] h-0.5 border-t-2 border-dashed border-white/30"
            />
            {STEPS.map((step, i) => (
              <div key={i} className="relative flex md:flex-col items-start md:items-center gap-5 md:gap-4 md:text-center">
                <div className="relative z-[1] w-16 h-16 shrink-0 bg-on-primary rounded-2xl flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
                  <step.icon className="text-primary h-7 w-7" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-on-primary text-primary border border-primary/25 shadow-xs text-label-md font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-title-md font-semibold text-white mb-1.5">{step.title}</h3>
                  <p className="text-body-md text-white/85">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FITUR — bento grid */}
      <section className="w-full relative bg-surface" id="fitur">
        <div className="relative z-[1] px-5 md:px-16 max-w-[1200px] mx-auto py-20 md:py-[110px]">
          <div className="mb-12 text-center">
            <h2 className="font-heading text-headline-lg text-primary mb-4">
              Semua yang Bikin Dia Tersenyum
            </h2>
            <p className="text-body-lg font-medium text-on-surface-variant max-w-xl mx-auto">
              Bukan sekadar teks di layar. Setiap detail dirancang biar momen kalian
              makin berkesan.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES_BIG.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden bg-primary-fixed/30 border border-primary-fixed-dim/40 rounded-3xl p-7 md:p-8 shadow-card hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300"
              >
                <feature.icon
                  aria-hidden
                  className="pointer-events-none absolute -right-5 -bottom-6 h-36 w-36 text-primary/10 group-hover:scale-110 transition-transform duration-500"
                />
                <div className="relative">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white mb-4 shadow-[0_6px_18px_rgba(222,112,56,0.35)]">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-title-lg text-on-surface mb-2">{feature.title}</h3>
                  <p className="text-body-md text-on-surface-variant max-w-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-5">
            {FEATURES_SMALL.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-3xl border border-outline-variant/25 shadow-card hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300"
              >
                <div className="w-11 h-11 bg-primary-fixed/40 rounded-xl flex items-center justify-center text-primary mb-3.5">
                  <feature.icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-title-md font-semibold text-on-surface mb-1.5">{feature.title}</h3>
                <p className="text-body-md text-on-surface-variant">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KOLEKSI TEMPLATE — ring 3D diputar per kartu & lompat kategori */}
      <KoleksiSection templates={templates} />

      {/* FAQ */}
      <Faq />

      {/* CTA */}
      <section className="w-full relative bg-surface overflow-hidden">
        <div className="relative z-[1] px-5 max-w-[1200px] mx-auto py-20 md:py-[100px]">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary to-[#c85a28] rounded-[2.5rem] px-6 py-14 md:py-20 text-center shadow-[0_24px_60px_rgba(222,112,56,0.35)]">
            <Heart
              aria-hidden
              className="absolute -top-6 -left-6 h-32 w-32 text-white/10 rotate-[-15deg]"
              fill="currentColor"
            />
            <Heart
              aria-hidden
              className="absolute -bottom-8 -right-8 h-40 w-40 text-white/10 rotate-12"
              fill="currentColor"
            />
            <div className="relative">
              <h2 className="font-heading text-[32px] md:text-headline-lg text-white mb-4">
                Siap Bikin Dia Tersenyum Hari Ini?
              </h2>
              <p className="text-body-lg font-medium text-white/90 mb-9 max-w-lg mx-auto">
                Nggak perlu mahal buat bikin dia ngerasa spesial.{" "}
                {BRAND.priceLabel}, sekali bayar.
              </p>
              <Link
                href="/templates"
                className="inline-flex items-center gap-2 px-12 py-5 bg-on-primary hover:bg-[#FFF9F5] text-primary text-body-lg font-semibold rounded-full shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                Buat Kejutan Sekarang <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-6 text-label-md font-semibold text-white/85 flex items-center justify-center gap-2">
                <BadgeCheck className="h-[18px] w-[18px]" /> Pembayaran aman &amp; proses instan
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
