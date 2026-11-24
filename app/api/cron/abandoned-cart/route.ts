import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRemote } from "@/lib/supabase/config";
import { safeStringEqual } from "@/lib/gate-token";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RECOVERY_DELAY_MS = 30 * 60 * 1000; // 30 menit
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // jangan email draft >7 hari

/**
 * Dipanggil Vercel Cron. Kirim email recovery untuk checkout yang
 * pending > 30 menit dan belum dibayar.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeStringEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!isRemote()) {
    return NextResponse.json({ ok: true, skipped: "DEMO_MODE" });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - RECOVERY_DELAY_MS).toISOString();
  const maxAge = new Date(Date.now() - MAX_AGE_MS).toISOString();

  const { data: sessions, error } = await admin
    .from("checkout_sessions")
    .select(
      "id, ucapan_id, email, started_at, ucapan:ucapan_id(email, to_name, from_name, template_slug, paid)"
    )
    .eq("recovery_email_sent", false)
    .is("recovered_at", null)
    .lt("started_at", cutoff)
    .gt("started_at", maxAge)
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  let skippedPaid = 0;
  let skippedNoEmail = 0;

  for (const raw of sessions ?? []) {
    type SessionRow = {
      id: string;
      ucapan_id: string;
      email: string | null;
      ucapan:
        | {
            email: string | null;
            to_name: string;
            from_name: string;
            template_slug: string;
            paid: boolean;
          }
        | null;
    };
    const s = raw as unknown as SessionRow;
    const u = Array.isArray(s.ucapan) ? s.ucapan[0] : s.ucapan;

    if (!u || u.paid) {
      skippedPaid += 1;
      await admin
        .from("checkout_sessions")
        .update({
          recovery_email_sent: true,
          recovered_at: u?.paid ? new Date().toISOString() : null,
        })
        .eq("id", s.id);
      continue;
    }
    const fallbackSessionEmail =
      s.email && !s.email.includes("*") ? s.email : null;
    const recipientEmail = u.email || fallbackSessionEmail;
    if (!recipientEmail) {
      skippedNoEmail += 1;
      await admin
        .from("checkout_sessions")
        .update({ recovery_email_sent: true })
        .eq("id", s.id);
      continue;
    }

    try {
      const { sendAbandonedCartEmail } = await import("@/lib/email");
      const res = await sendAbandonedCartEmail({
        to: recipientEmail,
        fromName: u.from_name,
        toName: u.to_name,
        templateSlug: u.template_slug,
        ucapanId: s.ucapan_id,
      });
      if (res.ok) {
        await admin
          .from("checkout_sessions")
          .update({
            recovery_email_sent: true,
            recovery_sent_at: new Date().toISOString(),
          })
          .eq("id", s.id);
        sent += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    processed: sessions?.length ?? 0,
    sent,
    failed,
    skippedPaid,
    skippedNoEmail,
  });
}
