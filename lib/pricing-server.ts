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
 * Menggunakan kolom eksplisit `is_promo` agar pembeli promo yang mengambil add-on
 * atau memakai saldo kredit referral tetap dihitung dalam kuota promo.
 * Fallback ke `amount = PROMO_AMOUNT` hanya bila migrasi `schema_v9.sql` belum dijalankan.
 */
export async function getActivePrice(): Promise<PriceInfo> {
  if (!isRemote()) {
    return priceForPromoUsed(0);
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
        .eq("amount", PROMO_AMOUNT));
    }

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
