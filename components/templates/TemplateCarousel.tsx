"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { templateEmoji } from "@/lib/templates";
import { CATEGORY_META, type TemplateMeta } from "@/lib/types";

/**
 * Ring 3D ala "Tasty 3D Carousel": kartu disusun di silinder, ring diputar
 * 360/n derajat per klik sehingga kartu berikutnya menghadap kamera.
 *
 * ponytail: kartu depan membesar ~1.25x karena perspektif, jadi section ini
 * butuh tinggi ~tinggi kartu x 1.3. Kalau terasa terlalu tinggi, ganti ke
 * varian "ringkas": ring hanya thumbnail, CTA template aktif di bawah ring.
 */
const TILT = -8; // kemiringan kamera, sama seperti referensi

export default function TemplateCarousel({ templates }: { templates: TemplateMeta[] }) {
  const n = templates.length || 1;
  const step = 360 / n;
  // Index tak terbatas: ring bisa diputar terus tanpa mentok.
  const [index, setIndex] = useState(0);
  const active = ((index % n) + n) % n;
  // Radius silinder & tinggi scene mengikuti ukuran kartu aktual.
  const [geom, setGeom] = useState({ radius: 290, height: 620 });

  const cardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  // Penanda drag, dipakai untuk membatalkan klik link setelah menggeser.
  const dragged = useRef(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const measure = () => {
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      if (!w || !h) return;
      // Jarak antar kartu di silinder: (lebar/2) / tan(pi/n), plus 10% margin.
      const radius = (w / 2 / Math.tan(Math.PI / n)) * 1.1;
      // 1.25 = pembesaran kartu depan (perspektif 2000) + napas.
      setGeom({ radius: Math.round(radius), height: Math.round(h * 1.25) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(card);
    return () => ro.disconnect();
  }, [n]);

  // Loncat ke kartu ke-i lewat putaran terpendek.
  const goTo = (i: number) => {
    const half = Math.floor(n / 2);
    const delta = ((((i - active + half) % n) + n) % n) - half;
    setIndex((v) => v + delta);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = e.clientX;
    dragged.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    if (Math.abs(e.clientX - dragStart.current) > 40) dragged.current = true;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    const dx = e.clientX - dragStart.current;
    dragStart.current = null;
    if (!dragged.current) return;
    // Geser ke kiri = maju satu kartu.
    setIndex((v) => v + (dx < 0 ? 1 : -1));
  };

  const blockClickAfterDrag = (e: React.MouseEvent) => {
    if (dragged.current) e.preventDefault();
  };

  return (
    <div className="relative">
      {/* Scene: perspektif kamera + tinggi tetap (kartu 3D absolut tidak
          menyumbang tinggi layout). */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragStart.current = null;
        }}
        className="relative mx-auto touch-pan-y select-none [perspective:2000px]"
        style={{ height: geom.height }}
        role="region"
        aria-label="Carousel template 3D"
      >
        <div
          className="absolute inset-0 [transform-style:preserve-3d] transition-transform duration-[800ms] ease-[cubic-bezier(.68,-.55,.265,1.55)] motion-reduce:transition-none"
          style={{ transform: `rotateX(${TILT}deg) rotateY(${-index * step}deg)` }}
        >
          {templates.map((t, i) => {
            const isActive = i === active;
            return (
              <div
                key={t.slug}
                className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
              >
                <div
                  ref={i === 0 ? cardRef : undefined}
                  inert={!isActive}
                  className="w-[200px] sm:w-[230px] bg-white rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden flex flex-col [backface-visibility:hidden]"
                  style={{
                    transform: `rotateY(${i * step}deg) translateZ(${geom.radius}px)`,
                  }}
                >
                  <Link
                    href={`/preview/${t.slug}`}
                    onClick={blockClickAfterDrag}
                    aria-label={`Lihat Template ${t.name}`}
                    className="relative m-3 mb-0 block aspect-[9/16] rounded-xl overflow-hidden bg-surface-container-low"
                  >
                    {/* Fallback kalau screenshot belum ada: gradient + emoji */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${t.gradient} flex items-center justify-center text-6xl`}
                    >
                      {templateEmoji(t.slug)}
                    </div>
                    <Image
                      src={`/templates/${t.slug}.png`}
                      alt={t.name}
                      width={390}
                      height={780}
                      sizes="(min-width: 640px) 230px, 200px"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </Link>

                  <div className="px-3 pb-3 pt-2.5 text-center flex-1 flex flex-col gap-2">
                    <h3 className="font-heading text-title-md text-on-surface">{t.name}</h3>
                    <p className="text-xs text-on-surface-variant">
                      {CATEGORY_META[t.type].emoji} {CATEGORY_META[t.type].label}
                    </p>
                    <Link
                      href={`/preview/${t.slug}`}
                      onClick={blockClickAfterDrag}
                      className="mt-auto block w-full rounded-full bg-primary py-2 text-label-md font-semibold text-white hover:bg-primary/90 transition"
                    >
                      Lihat Template
                    </Link>
                    <Link
                      href={`/buat/${t.slug}`}
                      onClick={blockClickAfterDrag}
                      className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition"
                    >
                      Buat sekarang
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panah di bawah ring (referensi tidak menaruhnya menumpuk di atas kartu) */}
      <div className="mt-8 flex justify-center gap-4">
        <button
          type="button"
          onClick={() => setIndex((v) => v - 1)}
          aria-label="Template sebelumnya"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-[0_11px_20px_-7px_#92631f] transition-all duration-300 hover:scale-90 hover:shadow-[0_2px_20px_-8px_#92631f] active:scale-80 active:opacity-50"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => setIndex((v) => v + 1)}
          aria-label="Template berikutnya"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-[0_11px_20px_-7px_#92631f] transition-all duration-300 hover:scale-90 hover:shadow-[0_2px_20px_-8px_#92631f] active:scale-80 active:opacity-50"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <div className="flex justify-center gap-1.5 mt-5">
        {templates.map((t, i) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Ke template ${t.name}`}
            aria-current={i === active}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active ? "w-5 bg-primary" : "w-2 bg-primary/25 hover:bg-primary/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
