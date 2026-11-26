import Link from "next/link";
import { Camera, Heart, Music } from "lucide-react";
import Logo from "./Logo";
import NewsletterSignup from "./NewsletterSignup";
import { BRAND } from "@/lib/brand";
import { MotionStaggerGroup, MotionStaggerItem } from "./MotionPrimitives";

const LINKS = [
  { label: "Kado Custom", href: "/custom" },
  { label: "Syarat & Ketentuan", href: "/syarat-ketentuan" },
  { label: "Kebijakan Privasi", href: "/kebijakan-privasi" },
];

const TOPIC_LINKS = [
  { label: "Ucapan Ulang Tahun", href: "/ucapan/ulang-tahun-pacar" },
  { label: "Surat Permintaan Maaf", href: "/ucapan/permintaan-maaf-romantis" },
  { label: "Anniversary Digital", href: "/ucapan/anniversary-interaktif" },
  { label: "Kado LDR", href: "/ucapan/kado-digital-ldr" },
  { label: "Confess Gebetan", href: "/ucapan/confess-gebetan" },
  { label: "Ucapan Wisuda", href: "/ucapan/ucapan-wisuda-sahabat" },
  { label: "Kartu Valentine", href: "/ucapan/valentine-romantis" },
  { label: "Surat Cinta Online", href: "/ucapan/surat-cinta-online" },
];

export default function Footer() {
  return (
    <footer data-site-chrome className="w-full pt-14 pb-24 md:py-20 bg-primary">
      <MotionStaggerGroup
        stagger={0.07}
        className="relative z-[1] flex flex-col items-center text-center px-5 md:px-16 max-w-[1200px] mx-auto space-y-7"
      >
        <MotionStaggerItem y={12} className="flex flex-col items-center gap-3">
          <Logo light className="flex-col gap-2" />
          <p className="text-body-md text-white/90 max-w-md mx-auto">
            Kirim rasa tulus untuk pacar, sahabat, atau siapa pun yang paling berarti buatmu.
          </p>
        </MotionStaggerItem>

        <MotionStaggerItem y={14} className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-card p-6 md:p-7 w-full">
            <NewsletterSignup />
          </div>
        </MotionStaggerItem>

        <MotionStaggerItem y={10} className="flex flex-wrap justify-center gap-6">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-body-md text-white/85 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </MotionStaggerItem>

        <MotionStaggerItem y={10} className="flex flex-wrap justify-center gap-x-5 gap-y-2 max-w-2xl">
          {TOPIC_LINKS.map((topic) => (
            <Link
              key={topic.href}
              href={topic.href}
              className="text-label-md text-white/75 hover:text-white underline-offset-4 hover:underline transition-colors"
            >
              {topic.label}
            </Link>
          ))}
        </MotionStaggerItem>

        <MotionStaggerItem y={10} className="flex items-center justify-center gap-4">
          <a
            href={BRAND.socials.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/12 text-white/95 hover:text-white hover:bg-white/20 hover:-translate-y-0.5 active:scale-95 transition-all text-body-sm font-medium"
          >
            <Camera className="h-5 w-5" />
            <span>Instagram</span>
          </a>
          <a
            href={BRAND.socials.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/12 text-white/95 hover:text-white hover:bg-white/20 hover:-translate-y-0.5 active:scale-95 transition-all text-body-sm font-medium"
          >
            <Music className="h-5 w-5" />
            <span>TikTok</span>
          </a>
        </MotionStaggerItem>

        <div className="w-full h-px bg-white/20" />
        <p className="text-label-md font-normal text-white/85 flex items-center gap-1 justify-center">
          © 2026 {BRAND.domain} — Dibuat dengan penuh cinta{" "}
          <Heart className="h-4 w-4 fill-current" />
        </p>
      </MotionStaggerGroup>
    </footer>
  );
}
