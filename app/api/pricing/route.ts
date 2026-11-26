import { NextResponse } from "next/server";

import { getTemplateTier } from "@/lib/pricing";
import { getActiveTierPrices } from "@/lib/pricing-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Harga aktif yang dipakai UI (promo vs normal, per tier Classic & Signature).
 * Satu-satunya sumber untuk komponen client agar angka yang ditampilkan
 * sama dengan angka yang ditagih server.
 */
export async function GET(request: Request) {
  const { success } = await checkRateLimit(`pricing-read:${getClientIp(request)}`, 60, 60000);
  if (!success) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMIT_EXCEEDED" },
      { status: 429 }
    );
  }
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? undefined;
  const tier = getTemplateTier(slug);
  const tiers = await getActiveTierPrices();
  const price = tiers[tier];

  return NextResponse.json(
    {
      ok: true,
      amount: price.amount,
      normalAmount: price.normalAmount,
      tier: price.tier,
      tierLabel: price.tierLabel,
      isPromo: price.isPromo,
      remaining: price.remaining,
      tiers,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
