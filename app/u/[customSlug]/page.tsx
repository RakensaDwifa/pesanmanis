import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRemote } from "@/lib/supabase/config";
import { mapUcapanRow } from "@/lib/supabase/rows";
import type { UcapanRow } from "@/lib/supabase/rows";
import PublicView from "@/components/view/PublicView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ customSlug: string }>;
}): Promise<Metadata> {
  const { customSlug } = await params;
  let toName = "Kamu";
  let fromName = "Seseorang";
  let message = "";

  if (isRemote()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("ucapan")
        .select("to_name,from_name,message")
        .eq("custom_slug", customSlug)
        .maybeSingle();
      if (data) {
        toName = data.to_name ?? toName;
        fromName = data.from_name ?? fromName;
        message = data.message ?? "";
      }
    } catch {
      /* fallback */
    }
  }

  const teaser = message.trim().split(/\s+/).slice(0, 18).join(" ");
  const title = `Untuk ${toName} 💌 — dari ${fromName}`;
  const description =
    teaser.length > 0
      ? `Seseorang membuatkan ucapan spesial untukmu: "${teaser}${teaser.endsWith(".") ? "" : "…"}"`
      : "Seseorang membuatkan ucapan spesial untukmu.";

  return {
    title,
    description,
    alternates: { canonical: `/u/${customSlug}` },
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "PesanManis",
      locale: "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CustomSlugRoute({
  params,
}: {
  params: Promise<{ customSlug: string }>;
}) {
  const { customSlug } = await params;

  if (!isRemote()) {
    // Di lokal tidak ada DB; redirect ke halaman utama
    notFound();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("ucapan")
    .select("*")
    .eq("custom_slug", customSlug)
    .maybeSingle();

  if (!data) notFound();

  const remote = mapUcapanRow(data as UcapanRow);

  return <PublicView id={remote.id} remote={remote} />;
}
