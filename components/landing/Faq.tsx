"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import {
  MotionFadeUp,
  MotionStaggerGroup,
  MotionStaggerItem,
  MotionTextReveal,
} from "./MotionPrimitives";

const FAQS = [
  {
    question: "Bagaimana cara membuat dan memesan website ucapannya?",
    answer:
      "Sangat mudah! Pilih template yang kamu suka, tulis pesan serta unggah foto dan lagu sambil melihat Live Preview secara langsung. Setelah sesuai keinginan, selesaikan pembayaran sekali bayar dan link maupun QR Code siap dibagikan.",
  },
  {
    question: "Metode pembayaran apa saja yang tersedia, dan adakah tips agar lancar?",
    answer:
      "Pembayaran diproses instan dan otomatis melalui QRIS serta e-wallet populer. Agar halaman pembayaran berjalan mulus tanpa kendala pop-up, sebaiknya buka situs melalui browser utama seperti Chrome atau Safari (hindari membuka langsung dari browser bawaan aplikasi media sosial).",
  },
  {
    question: "Setelah pembayaran berhasil, bagaimana cara membagikan ke penerima?",
    answer:
      "Setelah pembayaran terverifikasi, masuk ke akunmu melalui menu Masuk lalu buka Dashboard. Pilih tombol Bagikan pada ucapanmu untuk menyalin link khusus atau mengunduh QR Code yang siap dikirim ke pacar, sahabat, maupun orang tersayang.",
  },
  {
    question: `Benar harganya ${BRAND.priceLabel}? Website ucapannya aktif sampai kapan?`,
    answer:
      `Betul! Harga promo perkenalan setiap template hanya ${BRAND.priceLabel} (harga normal ${BRAND.normalPriceLabel} setelah kuota promo habis). Website yang sudah diaktifkan berlaku selamanya tanpa biaya langganan, dan kamu tetap bisa mengedit isinya selama 7 hari sejak pembayaran berhasil.`,
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="w-full relative bg-surface" id="faq">
      <div className="relative z-[1] px-5 md:px-16 max-w-4xl mx-auto py-14 md:py-[100px]">
        <div className="mb-12 text-center">
          <MotionFadeUp y={10}>
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-body-sm mb-3">
              <HelpCircle className="h-[18px] w-[18px]" /> Q &amp; A / FAQ
            </span>
          </MotionFadeUp>
          <MotionTextReveal
            as="h2"
            text="Pertanyaan yang Sering Diajukan"
            className="font-heading text-headline-lg text-primary text-center mb-4"
          />
          <MotionFadeUp delay={0.1} y={12}>
            <p className="text-body-lg font-medium text-on-surface-variant max-w-2xl mx-auto">
              Masih punya pertanyaan seputar pemesanan, pembayaran, atau cara pakai?
              Kami rangkum jawabannya di sini.
            </p>
          </MotionFadeUp>
        </div>

        <MotionStaggerGroup className="space-y-4" stagger={0.07}>
          {FAQS.map((faq, i) => {
            const open = openIndex === i;
            return (
              <MotionStaggerItem key={i} y={14}>
                <div
                  className={cn(
                    "bg-surface-container-low rounded-2xl border border-outline-variant/30 shadow-sm transition-all duration-300 overflow-hidden",
                    open && "shadow-md border-primary/40"
                  )}
                >
                  <button
                    type="button"
                    className="w-full px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-left gap-3 sm:gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl transition-colors hover:bg-surface-container/50 cursor-pointer"
                    aria-expanded={open}
                    onClick={() => setOpenIndex(open ? -1 : i)}
                  >
                    <div className="flex items-center gap-3 sm:gap-3.5">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-body-sm transition-colors",
                          open ? "bg-primary text-white" : "bg-primary-fixed/30 text-primary"
                        )}
                      >
                        Q
                      </div>
                      <h3 className="font-body text-sm sm:text-base md:text-lg text-on-surface font-semibold leading-snug">
                        {faq.question}
                      </h3>
                    </div>
                    <ChevronDown
                      className={cn(
                        "text-on-surface-variant transition-transform duration-300 shrink-0",
                        open && "rotate-180 text-primary"
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden border-t border-outline-variant/15"
                      >
                        <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-3 text-on-surface-variant text-body-md leading-relaxed">
                          <div className="sm:pl-11">{faq.answer}</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </MotionStaggerItem>
            );
          })}
        </MotionStaggerGroup>
      </div>
    </section>
  );
}
