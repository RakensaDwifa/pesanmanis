"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TemplateShell, Signature, PhotoGrid, TimelineSection } from "./shared";
import type { TemplateRenderProps } from "@/lib/types";

function HeartEmoji({ className }: { className?: string }) {
  return (
    <span className={className} role="img" aria-label="hati">
      ❤️
    </span>
  );
}

export default function Valentine({ content, preview }: TemplateRenderProps) {
  const [opened, setOpened] = useState(Boolean(preview));

  return (
    <TemplateShell content={content} preview={preview} className="bg-gradient-to-b from-[#FFF3EA] via-[#FFDCC8] to-[#FFB98F]">
      <AnimatePresence mode="wait">
        {!opened ? (
          <motion.div
            key="intro"
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center"
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-label-lg font-semibold text-on-surface-variant mb-8 text-center"
            >
              Ada sesuatu untuk {content.toName} 💘
            </motion.p>

            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => setOpened(true)}
              className="relative cursor-pointer"
              aria-label="Buka pesan valentine"
            >
              <motion.div
                animate={{ scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="w-40 h-40"
                style={{
                  clipPath:
                    "path('M40,0 C18,0 0,18 0,40 C0,62 18,80 40,80 C62,80 80,62 80,40 C80,18 62,0 40,0 Z')",
                }}
              >
                <div className="w-full h-full bg-gradient-to-br from-[#F08048] to-[#C85A28] shadow-[0_18px_50px_rgba(200,90,40,0.45)]" />
              </motion.div>
              <HeartEmoji className="absolute inset-0 flex items-center justify-center text-5xl drop-shadow-md" />
              <motion.span
                className="absolute -right-8 -top-6 text-3xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                ✨
              </motion.span>
            </motion.button>

            <p className="text-body-md text-on-surface-variant mt-6 italic text-center">
              Klik hatinya, Sayang 💓
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="letter"
            initial={{ opacity: 0, y: 40, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <motion.div
              initial={{ scaleY: 1 }}
              animate={{ scaleY: 0, opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="absolute inset-0 z-10 rounded-3xl bg-gradient-to-br from-[#A34718] to-[#7E3512] flex items-center justify-center"
            >
              <span className="text-4xl">💝</span>
            </motion.div>
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-[#FFD9C4] shadow-[0_14px_45px_rgba(200,90,40,0.3)] p-8">
              <div className="w-12 h-12 rounded-full bg-[#FFE8D8] flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">💘</span>
              </div>
              <p className="font-heading italic text-[#C85A28] text-3xl text-center mb-1">
                {content.title}
              </p>
              <p className="text-center text-label-lg font-semibold text-on-surface-variant mb-6">
                Untuk: {content.toName}
              </p>
              <div className="border-t border-[#FFD9C4] pt-6">
                <p className="text-body-lg leading-relaxed text-on-surface whitespace-pre-line text-center">
                  {content.message}
                </p>
                <Signature fromName={content.fromName} />
              </div>
              <PhotoGrid photos={content.photos} />
              <TimelineSection timeline={content.timeline} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </TemplateShell>
  );
}