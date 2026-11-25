import "server-only";

import { isRemote } from "@/lib/supabase/config";
import {
  getAllTierPrices,
  getTemplateTier,
  type PriceInfo,
  priceForPromoUsed,
  type TemplateTier,
  TIER_PRICING,
} from "./pricing";

async function countPaidPromoUsed(): Promise<number> {
  if (!isRemote()) {
    return 0;
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    let { count, error } = await admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "PAID")
      .eq("is_promo", true);

    if (error?.code === "42703") {
      ({ count, error } = await admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "PAID")
        .in("amount", [
          TIER_PRICING.classic.promo,
          TIER_PRICING.signature.promo,
        ]));
    }

    if (error) {
      console.warn("[pricing] gagal menghitung kuota promo:", error.message);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.warn("[pricing] error tak terduga saat menghitung kuota promo:", error);
    return 0;
  }
}

/**
 * Ambil harga aktif dari database berdasarkan tier `templateSlug`.
 * Promo berakhir setelah PROMO_QUOTA pembelian promo yang lunas.
 */
export async function getActivePrice(templateSlug?: string): Promise<PriceInfo> {
  const tier = getTemplateTier(templateSlug);
  const promoUsed = await countPaidPromoUsed();
  return priceForPromoUsed(promoUsed, tier);
}

/**
 * Ambil peta harga aktif untuk seluruh tier dalam satu kueri DB.
 */
export async function getActiveTierPrices(): Promise<
  Record<TemplateTier, PriceInfo>
> {
  const promoUsed = await countPaidPromoUsed();
  return getAllTierPrices(promoUsed);
}
