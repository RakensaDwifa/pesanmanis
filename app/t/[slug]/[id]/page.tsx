import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRemote } from "@/lib/supabase/config";
import { hasValidGateCookie } from "@/lib/gate-cookie";
import {
  extractUnlockAtFromTimeline,
  mapUcapanRow,
  stripLockedUcapan,
  stripPublicUcapan,
} from "@/lib/supabase/rows";
import type { UcapanRow } from "@/lib/supabase/rows";
import { currentEpochMs, isUcapanCountdownLocked } from "@/lib/unlock-schedule";
import { isValidUuid } from "@/lib/validation";
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
  let gateType: string | null = null;
  let countdownLocked = false;

  if (isRemote() && isValidUuid(id)) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("ucapan")
        .select("to_name,from_name,message,gate_type,timeline,paid")
        .eq("id", id)
        .eq("paid", true)
        .maybeSingle();
      if (data) {
        toName = data.to_name ?? toName;
        fromName = data.from_name ?? fromName;
        message = data.message ?? "";
        gateType = data.gate_type ?? null;
        countdownLocked = isUcapanCountdownLocked(
          extractUnlockAtFromTimeline(data.timeline)
        );
      }
    } catch {
      // fallback ke nilai default
    }
  }

  const teaser = message.trim().split(/\s+/).slice(0, 18).join(" ");
  const title = `Untuk ${toName} 💌 — dari ${fromName}`;
  const description = countdownLocked
    ? "⏳ Pesan kejutan terjadwal. Tunggu hitungan mundurnya habis untuk membuka kejutan spesial ini."
    : gateType === "trivia"
      ? "🔒 Pesan rahasia terkunci. Jawab kuis kenangan untuk membuka kejutan spesial ini."
      : gateType
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
  const { slug, id } = await params;
  const serverNowMs = currentEpochMs();

  let remote = null;
  if (isRemote() && isValidUuid(id)) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ucapan")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (data) {
      const row = data as UcapanRow;
      if (row.template_slug && row.template_slug !== slug) {
        redirect(`/t/${row.template_slug}/${id}`);
      }

      const mapped = mapUcapanRow(row);
      if (row.paid) {
        const countdownLocked = isUcapanCountdownLocked(
          mapped.unlockAt,
          serverNowMs
        );
        const unlocked =
          !countdownLocked &&
          (!row.gate_type || (await hasValidGateCookie(row.id)));
        remote = unlocked
          ? stripPublicUcapan(mapped)
          : stripLockedUcapan(mapped);
      } else {
        // Jika belum dibayar, hanya pemilik yang sedang login yang boleh melihat
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && row.owner_id === user.id) {
          remote = stripPublicUcapan(mapped);
        }
      }
    }
  }

  return <PublicView id={id} remote={remote} serverNowMs={serverNowMs} />;
}
