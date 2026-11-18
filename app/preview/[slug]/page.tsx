import { Metadata } from "next";
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
  params: { slug: string };
}) {
  const t = getTemplate(params.slug);
  if (!t) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return <TemplatePreview slug={params.slug} />;
}
