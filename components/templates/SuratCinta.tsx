"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TemplateShell, Signature, PhotoGrid, TimelineSection } from "./shared";
import type { TemplateRenderProps } from "@/lib/types";

export default function SuratCinta({ content, preview, interactive, onOpenChange }: TemplateRenderProps) {
  const [opened, setOpened] = useState(interactive ? false : Boolean(preview));

  const openLetter = () => {
    setOpened(true);
    onOpenChange?.(true);
  };

  return (
    <TemplateShell content={content} preview={preview} className="bg-gradient-to-b from-[#FDF6EC] via-[#F9EEDC] to-[#F3E3C8]">
      <AnimatePresence mode="wait">
        {!opened ? (
          <motion.div
            key="intro"
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center justify-center my-auto w-full select-none"
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`font-semibold text-on-surface-variant text-center ${
                preview ? "text-label-md mb-4" : "text-label-lg mb-8"
              }`}
            >
              Sebuah surat untuk {content.toName} ✉️
            </motion.p>

            <motion.button
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.5 }}
              onClick={openLetter}
              className={`relative cursor-pointer transition-transform ${
                preview ? "w-56 h-38" : "w-72 h-52"
              }`}
              aria-label="Buka surat"
            >
              <div className="absolute inset-0 rounded-xl bg-[#F7E7C9] shadow-[0_14px_35px_rgba(139,109,63,0.35)] border border-[#E4CDA3]" />
              <div className="absolute inset-x-5 top-3.5 h-1.5 rounded-full bg-[#E4CDA3]" />
              <div className="absolute inset-x-5 top-8 h-1.5 rounded-full bg-[#E4CDA3] opacity-70" />
              <div className="absolute inset-x-5 top-12.5 h-1.5 rounded-full bg-[#E4CDA3] opacity-50" />
              <motion.div
                className={`absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-[#C25B63] shadow-md flex items-center justify-center ${
                  preview ? "w-11 h-11" : "w-14 h-14"
                }`}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className={preview ? "text-xl" : "text-2xl"}>❤️</span>
              </motion.div>
            </motion.button>

            <p
              className={`text-on-surface-variant italic text-center ${
                preview ? "text-label-sm mt-4" : "text-body-md mt-6"
              }`}
            >
              Klik suratnya untuk membaca ✨
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="letter"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`bg-[#FFFDF7] rounded-2xl shadow-[0_12px_35px_rgba(139,109,63,0.22)] border border-[#EAD9B8] w-full mx-auto my-auto ${
              preview ? "p-5 pb-6 max-w-[270px]" : "p-8"
            }`}
            style={{
              backgroundImage:
                "repeating-linear-gradient(transparent, transparent 31px, rgba(178,145,87,0.25) 31px, rgba(178,145,87,0.25) 32px)",
            }}
          >
            <div
              className={`rounded-full bg-primary-fixed flex items-center justify-center mx-auto ${
                preview ? "w-9 h-9 mb-2" : "w-12 h-12 mb-4"
              }`}
            >
              <span className={preview ? "text-lg" : "text-2xl"}>✉️</span>
            </div>
            <p
              className={`font-heading italic text-primary text-center mb-0.5 ${
                preview ? "text-xl font-bold" : "text-3xl"
              }`}
            >
              {content.title}
            </p>
            <p
              className={`text-center font-semibold text-on-surface-variant ${
                preview ? "text-xs mb-3" : "text-label-lg mb-6"
              }`}
            >
              Untuk: {content.toName}
            </p>
            <div className={preview ? "pt-2" : "pt-5"}>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className={`text-on-surface whitespace-pre-line text-center ${
                  preview
                    ? "text-xs leading-[22px] line-clamp-6"
                    : "text-body-lg leading-[32px]"
                }`}
              >
                {content.message}
              </motion.p>
              <div className={preview ? "[&_p]:!text-lg [&_p]:!mt-4" : ""}>
                <Signature fromName={content.fromName} />
              </div>
            </div>
            {content.photos && content.photos.length > 0 && (
              <PhotoGrid photos={content.photos} />
            )}
            {content.timeline && content.timeline.length > 0 && (
              <TimelineSection timeline={content.timeline} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </TemplateShell>
  );
}