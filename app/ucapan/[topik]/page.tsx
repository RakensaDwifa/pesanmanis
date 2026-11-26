import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ChevronRight,
  Eye,
  HelpCircle,
  MessageSquareQuote,
  Sparkles,
  Wand2,
} from "lucide-react";
import CopyExampleButton from "@/components/ucapan/CopyExampleButton";
import { BRAND } from "@/lib/brand";
import { formatPrice, getTemplateTier, TIER_PRICING } from "@/lib/pricing";
import { getSeoTopic, SEO_TOPICS } from "@/lib/seo-topics";
import { getTemplate, templateEmoji } from "@/lib/templates";

export function generateStaticParams() {
  return SEO_TOPICS.map((topic) => ({ topik: topic.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topik: string }>;
}): Promise<Metadata> {
  const { topik } = await params;
  const topic = getSeoTopic(topik);
  if (!topic) return {};

  const canonicalUrl = `${BRAND.baseUrl}/ucapan/${topic.slug}`;
  return {
    title: topic.title,
    description: topic.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: topic.title,
      description: topic.metaDescription,
      url: canonicalUrl,
      type: "website",
      siteName: BRAND.name,
      locale: "id_ID",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: topic.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: topic.title,
      description: topic.metaDescription,
      images: ["/twitter-image"],
    },
  };
}

export default async function SeoTopicPage({
  params,
}: {
  params: Promise<{ topik: string }>;
}) {
  const { topik } = await params;
  const topic = getSeoTopic(topik);
  if (!topic) notFound();

  const recommendedTemplates = topic.recommendedSlugs
    .map((slug) => getTemplate(slug))
    .filter((t): t is NonNullable<typeof t> => Boolean(t && t.active));

  const primarySlug = recommendedTemplates[0]?.slug ?? "amplop-cinta";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: topic.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Beranda",
        item: BRAND.baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Template",
        item: `${BRAND.baseUrl}/templates`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: topic.label,
        item: `${BRAND.baseUrl}/ucapan/${topic.slug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface relative overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([faqJsonLd, breadcrumbJsonLd]).replace(
            /</g,
            "\\u003c"
          ),
        }}
      />

      {/* Subtle warm radial background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 300px at 18% 8%, rgba(222,112,56,0.09), transparent), radial-gradient(480px 260px at 85% 15%, rgba(245,161,90,0.09), transparent)",
        }}
      />

      {/* HERO */}
      <section className="relative z-[1] max-w-[1200px] mx-auto px-5 md:px-16 pt-[108px] pb-12 md:pt-[128px] md:pb-16">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-label-md text-on-surface-variant mb-5"
        >
          <Link href="/" className="hover:text-primary transition-colors">
            Beranda
          </Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          <Link href="/templates" className="hover:text-primary transition-colors">
            Template
          </Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          <span className="text-on-surface font-semibold truncate">{topic.label}</span>
        </nav>

        <div className="max-w-3xl space-y-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3.5 py-1 text-label-md font-semibold text-on-primary-container">
            <Sparkles className="h-3.5 w-3.5" />
            Inspirasi &amp; Template {BRAND.name}
          </span>

          <h1 className="font-heading text-headline-lg md:text-display-md text-on-surface leading-[1.15]">
            {topic.heroHeading}
          </h1>

          <p className="text-body-lg text-on-surface-variant leading-relaxed">
            {topic.heroSubheading}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`/buat/${primarySlug}`}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-on-primary px-6 py-3.5 text-label-lg font-semibold shadow-[0_8px_30px_rgba(222,112,56,0.3)] hover:-translate-y-0.5 transition-transform"
            >
              <span>Buat Sekarang — Mulai {BRAND.priceLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/preview/${primarySlug}`}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/60 bg-surface-container-low px-5 py-3.5 text-label-lg font-semibold text-on-surface hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>Lihat Contoh Live</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CONTOH TEKS SIAP SALIN */}
      <section className="relative z-[1] bg-surface-container-low border-y border-outline-variant/25 py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto px-5 md:px-16 space-y-6">
          <div className="max-w-2xl space-y-2">
            <p className="inline-flex items-center gap-1.5 text-label-lg font-semibold text-primary">
              <MessageSquareQuote className="h-4 w-4" />
              Contoh Teks Siap Salin
            </p>
            <h2 className="font-heading text-headline-md text-on-surface">
              Bingung merangkai kata? Tinggal salin dan sesuaikan
            </h2>
            <p className="text-body-md text-on-surface-variant">
              Klik <strong>Salin Teks</strong>, lalu tempel langsung ke editor PesanManis dan ubah sesuai panggilan sayang kalian.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {topic.copyableExamples.map((example) => (
              <article
                key={example.label}
                className="rounded-2xl bg-white border border-outline-variant/30 shadow-card p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <span className="inline-block rounded-full bg-primary-fixed px-3 py-0.5 text-label-md font-semibold text-on-primary-fixed-variant">
                    {example.label}
                  </span>
                  <p className="text-body-md text-on-surface leading-relaxed">
                    &ldquo;{example.text}&rdquo;
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                  <CopyExampleButton text={example.text} />
                  <Link
                    href={`/buat/${primarySlug}`}
                    className="text-label-md font-semibold text-primary hover:underline"
                  >
                    Pakai di Editor →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TEMPLATE REKOMENDASI */}
      <section className="relative z-[1] max-w-[1200px] mx-auto px-5 md:px-16 py-12 md:py-16 space-y-6">
        <div className="max-w-2xl space-y-2">
          <h2 className="font-heading text-headline-md text-on-surface">
            Template Rekomendasi untuk {topic.label}
          </h2>
          <p className="text-body-md text-on-surface-variant">
            Semua template sudah mendukung galeri foto, musik latar, pesan suara, dan QR Code aktif selamanya.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {recommendedTemplates.map((tpl) => {
            const tier = getTemplateTier(tpl.slug);
            const tierPrice = TIER_PRICING[tier];
            return (
              <div
                key={tpl.slug}
                className="rounded-3xl bg-white border border-outline-variant/30 shadow-card overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-card-hover"
              >
                <div>
                  <div
                    className={`bg-gradient-to-br ${tpl.gradient} px-5 py-6 flex items-center justify-between gap-3`}
                  >
                    <span className="text-4xl drop-shadow-sm">
                      {templateEmoji(tpl.slug)}
                    </span>
                    <span className="rounded-full bg-white/85 backdrop-blur px-3 py-1 text-label-md font-semibold text-[#241914]">
                      Mulai {formatPrice(tierPrice.promo)}
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-heading text-title-lg text-on-surface">
                        {tpl.name}
                      </h3>
                      {tpl.hasNarrative && (
                        <span className="rounded-full bg-primary-container px-2.5 py-0.5 text-[11px] font-semibold text-on-primary-container">
                          Signature
                        </span>
                      )}
                    </div>
                    <p className="text-body-md text-on-surface-variant leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-1 flex items-center gap-2.5">
                  <Link
                    href={`/buat/${tpl.slug}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-on-primary px-4 py-2.5 text-label-lg font-semibold hover:opacity-95 transition-opacity"
                  >
                    <span>Pilih Template</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/preview/${tpl.slug}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-outline-variant/60 px-4 py-2.5 text-label-md font-semibold text-on-surface hover:border-primary/50 hover:text-primary transition-colors"
                    aria-label={`Preview ${tpl.name}`}
                  >
                    <Eye className="h-4 w-4" />
                    <span>Preview</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ & CTA PENUTUP */}
      <section className="relative z-[1] bg-surface-container-low border-t border-outline-variant/25 py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto px-5 md:px-16 space-y-10">
          <div className="max-w-3xl space-y-5">
            <h2 className="font-heading text-headline-md text-on-surface flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary shrink-0" />
              <span>Pertanyaan yang Sering Diajukan</span>
            </h2>
            <div className="space-y-3">
              {topic.faqs.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl bg-white border border-outline-variant/30 p-5 space-y-1.5"
                >
                  <h3 className="text-title-md font-semibold text-on-surface">
                    {item.question}
                  </h3>
                  <p className="text-body-md text-on-surface-variant leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-outline-variant/30 shadow-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-xl">
              <h2 className="font-heading text-title-lg md:text-headline-md text-on-surface">
                Mau lihat semua template atau request desain khusus?
              </h2>
              <p className="text-body-md text-on-surface-variant">
                Jelajahi katalog lengkap PesanManis atau diskusikan ide kado custom bersama tim kami.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/templates"
                className="inline-flex items-center gap-2 rounded-full bg-primary text-on-primary px-5 py-3 text-label-lg font-semibold shadow-sm hover:-translate-y-0.5 transition-transform"
              >
                <span>Semua Template</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/custom"
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant/60 bg-surface px-5 py-3 text-label-lg font-semibold text-on-surface hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Wand2 className="h-4 w-4" />
                <span>Pesan Kado Custom</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
