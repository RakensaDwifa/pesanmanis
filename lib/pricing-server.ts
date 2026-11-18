import "server-only";

import { isRemote } from "@/lib/supabase/config";
import {
  PRICE_FALLBACK,
  type PriceInfo,
  PROMO_AMOUNT,
  priceForPromoUsed,
} from "./pricing";

/**
 * Ambil harga aktif dari database: promo berakhir setelah PROMO_QUOTA
 * pembelian promo yang lunas.
 *
 * Mode demo (tanpa Supabase) selalu memakai harga promo supaya alur
 * checkout bisa diuji tanpa konfigurasi.
 */
export async function getActivePrice(): Promise<PriceInfo> {
  if (!isRemote()) {
    return priceForPromoUsed(0);
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { count, error } = await admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "PAID")
      .eq("amount", PROMO_AMOUNT);

    if (error) {
      console.warn("[pricing] gagal menghitung kuota promo:", error.message);
      return PRICE_FALLBACK;
    }

    return priceForPromoUsed(count ?? 0);
  } catch (error) {
    console.warn("[pricing] error tak terduga saat menghitung kuota promo:", error);
    return PRICE_FALLBACK;
  }
}
