import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { hasValidGateCookie } from "@/lib/gate-cookie";
import {
  mapUcapanRow,
  stripLockedUcapan,
  stripPublicUcapan,
} from "@/lib/supabase/rows";
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
  let gateType: string | null = null;

  if (isRemote()) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("ucapan")
        .select("to_name,from_name,message,gate_type,paid")
        .eq("custom_slug", customSlug)
        .eq("paid", true)
        .maybeSingle();
      if (data) {
        toName = data.to_name ?? toName;
        fromName = data.from_name ?? fromName;
        message = data.message ?? "";
        gateType = data.gate_type ?? null;
      }
    } catch {
      /* fallback */
    }
  }

  const teaser = message.trim().split(/\s+/).slice(0, 18).join(" ");
  const title = `Untuk ${toName} 💌 — dari ${fromName}`;
  const description =
    gateType === "trivia"
      ? "🔒 Pesan rahasia terkunci. Jawab kuis kenangan untuk membuka kejutan spesial ini."
      : gateType
        ? "🔒 Pesan rahasia terkunci. Masukkan PIN untuk membuka kejutan spesial ini."
        : teaser.length > 0
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

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ucapan")
    .select("*")
    .eq("custom_slug", customSlug)
    .eq("paid", true)
    .maybeSingle();

  if (!data) notFound();

  const row = data as UcapanRow;
  const mapped = mapUcapanRow(row);
  const unlocked = !row.gate_type || (await hasValidGateCookie(row.id));
  const remote = unlocked
    ? stripPublicUcapan(mapped)
    : stripLockedUcapan(mapped);

  return <PublicView id={remote.id} remote={remote} />;
}
