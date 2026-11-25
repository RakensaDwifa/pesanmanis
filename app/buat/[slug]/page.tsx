import { notFound } from "next/navigation";
import Builder from "@/components/builder/Builder";
import { getTemplate } from "@/lib/templates";

export const metadata = {
  title: "Buat Ucapan",
  description: "Buat website ucapan personal untuk orang tersayang dalam 5 menit.",
  robots: { index: false, follow: false },
};

export default async function BuilderRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { slug } = await params;
  const { edit } = await searchParams;
  const template = getTemplate(slug);
  if (!template || !template.active) {
    notFound();
  }
  return <Builder slug={slug} editId={edit} />;
}
