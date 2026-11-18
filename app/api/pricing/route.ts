import { NextResponse } from "next/server";

import { NORMAL_AMOUNT } from "@/lib/pricing";
import { getActivePrice } from "@/lib/pricing-server";

export const dynamic = "force-dynamic";

/**
 * Harga aktif yang dipakai UI (promo vs normal).
 * Satu-satunya sumber untuk komponen client agar angka yang ditampilkan
 * sama dengan angka yang ditagih server.
 */
export async function GET() {
  const price = await getActivePrice();

  return NextResponse.json(
    {
      ok: true,
      amount: price.amount,
      isPromo: price.isPromo,
      remaining: price.remaining,
      normalAmount: NORMAL_AMOUNT,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
