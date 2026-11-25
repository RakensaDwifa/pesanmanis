import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTemplate } from "@/lib/templates";
import TemplatePreview from "@/components/view/TemplatePreview";

export const metadata: Metadata = {
  title: "Preview Template",
  robots: { index: false, follow: false },
  description:
    "Preview interaktif cerita dan tampilan template sebelum memilih dan mengirim ucapan.",
};

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template || !template.active) notFound();
  return <TemplatePreview slug={slug} />;
}
