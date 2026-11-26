import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface CheckoutSessionJoinRow {
  id: string;
  ucapan_id: string;
  email: string | null;
  started_at: string;
  recovery_email_sent: boolean;
  recovery_sent_at: string | null;
  recovered_at: string | null;
  created_at: string;
  ucapan?:
    | { to_name: string | null; from_name: string | null; paid: boolean; template_slug: string | null }
    | { to_name: string | null; from_name: string | null; paid: boolean; template_slug: string | null }[]
    | null;
}

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { success } = await checkRateLimit(`admin-stats:${getClientIp(request)}`, 30, 60000);
  if (!success) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMIT_EXCEEDED" },
      { status: 429 }
    );
  }

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(200, Math.max(10, Math.floor(rawLimit)))
    : 100;

  const adminClient = createAdminClient();

  const [
    { data: payments, count: totalPaymentsCount, error: payError },
    { data: paidSummaryRows },
    { data: ucapans, count: totalUcapansCount, error: ucError },
    sessionsRes,
    recoveredRes,
    pendingRes,
    subscribersRes,
  ] = await Promise.all([
    adminClient
      .from("payments")
      .select(
        "id, ucapan_id, merchant_ref, method, amount, status, tripay_ref, paid_at, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(limit),
    adminClient.from("payments").select("amount").eq("status", "PAID"),
    // Select strictly non-sensitive display columns (never expose gate_data PINs or full private messages).
    adminClient
      .from("ucapan")
      .select(
        "id, title, to_name, from_name, template_slug, custom_slug, paid, paid_at, created_at, email",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(limit),
    adminClient
      .from("checkout_sessions")
      .select(
        "id, ucapan_id, email, started_at, recovery_email_sent, recovery_sent_at, recovered_at, created_at, ucapan(to_name, from_name, paid, template_slug)",
        { count: "exact" }
      )
      .order("started_at", { ascending: false })
      .limit(limit),
    adminClient
      .from("checkout_sessions")
      .select("id", { count: "exact", head: true })
      .not("recovered_at", "is", null),
    adminClient
      .from("checkout_sessions")
      .select("id", { count: "exact", head: true })
      .is("recovered_at", null),
    adminClient
      .from("newsletter_subscribers")
      .select("id, email, source, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (payError) {
    return NextResponse.json({ ok: false, error: "DB_ERROR_PAYMENTS" }, { status: 500 });
  }
  if (ucError) {
    return NextResponse.json({ ok: false, error: "DB_ERROR_UCAPAN" }, { status: 500 });
  }

  const ucapanIds = (ucapans ?? []).map((u) => u.id);
  const { data: statsRows } =
    ucapanIds.length > 0
      ? await adminClient
          .from("ucapan_stats")
          .select("ucapan_id, total_views")
          .in("ucapan_id", ucapanIds)
      : { data: [] };

  const statsMap = new Map(
    (statsRows ?? []).map((s: { ucapan_id: string; total_views: number }) => [
      s.ucapan_id,
      s.total_views,
    ])
  );

  const enrichedUcapans = (ucapans ?? []).map((u) => ({
    ...u,
    totalViews: statsMap.get(u.id) || 0,
  }));

  const normalizedSessions = sessionsRes.error
    ? []
    : ((sessionsRes.data ?? []) as CheckoutSessionJoinRow[]).map((s) => {
        const joined = Array.isArray(s.ucapan) ? s.ucapan[0] : s.ucapan;
        return {
          id: s.id,
          ucapan_id: s.ucapan_id,
          email: s.email,
          started_at: s.started_at,
          recovery_email_sent: s.recovery_email_sent,
          recovery_sent_at: s.recovery_sent_at,
          recovered_at: s.recovered_at,
          created_at: s.created_at,
          to_name: joined?.to_name ?? null,
          from_name: joined?.from_name ?? null,
          ucapan_paid: Boolean(joined?.paid),
          template_slug: joined?.template_slug ?? null,
        };
      });

  const subscribers = subscribersRes.error ? [] : subscribersRes.data ?? [];

  const totalRevenue = (paidSummaryRows ?? []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );
  const totalPaidCount = (paidSummaryRows ?? []).length;

  return NextResponse.json({
    ok: true,
    stats: {
      totalRevenue,
      totalPaidCount,
      totalUcapans: totalUcapansCount ?? (ucapans ?? []).length,
      totalPayments: totalPaymentsCount ?? (payments ?? []).length,
      totalCheckoutSessions: sessionsRes.error
        ? 0
        : sessionsRes.count ?? normalizedSessions.length,
      recoveredSessionsCount: recoveredRes.error ? 0 : recoveredRes.count ?? 0,
      pendingRecoveryCount: pendingRes.error ? 0 : pendingRes.count ?? 0,
      totalSubscribers: subscribersRes.error
        ? 0
        : subscribersRes.count ?? subscribers.length,
    },
    payments: payments ?? [],
    ucapans: enrichedUcapans,
    checkoutSessions: normalizedSessions,
    subscribers,
  });
}
