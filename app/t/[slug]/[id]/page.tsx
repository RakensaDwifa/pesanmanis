import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRemote } from "@/lib/supabase/config";
import { mapUcapanRow, stripPublicUcapan } from "@/lib/supabase/rows";
import type { UcapanRow } from "@/lib/supabase/rows";
import PublicView from "@/components/view/PublicView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  let toName = "Kamu";
  let fromName = "Seseorang";
  let message = "";
  let hasGate = false;

  if (isRemote()) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("ucapan")
        .select("to_name,from_name,message,gate_type,paid")
        .eq("id", id)
        .eq("paid", true)
        .maybeSingle();
      if (data) {
        toName = data.to_name ?? toName;
        fromName = data.from_name ?? fromName;
        message = data.message ?? "";
        hasGate = Boolean(data.gate_type);
      }
    } catch {
      // fallback ke nilai default
    }
  }

  const teaser = message.trim().split(/\s+/).slice(0, 18).join(" ");
  const title = `Untuk ${toName} 💌 — dari ${fromName}`;
  const description = hasGate
    ? "🔒 Pesan rahasia terkunci. Masukkan PIN untuk membuka kejutan spesial ini."
    : teaser.length > 0
      ? `Seseorang membuatkan ucapan spesial untukmu: "${teaser}${teaser.endsWith(".") ? "" : "…"}"`
      : "Seseorang membuatkan ucapan spesial untukmu.";

  return {
    title,
    description,
    alternates: {
      canonical: `/t/${slug}/${id}`,
    },
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

export default async function ViewRoute({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;

  let remote = null;
  if (isRemote()) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ucapan")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (data) {
      const row = data as UcapanRow;
      if (row.paid) {
        remote = stripPublicUcapan(mapUcapanRow(row));
      } else {
        // Jika belum dibayar, hanya pemilik yang sedang login yang boleh melihat
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && row.owner_id === user.id) {
          remote = stripPublicUcapan(mapUcapanRow(row));
        }
      }
    }
  }

  return <PublicView id={id} remote={remote} />;
}
