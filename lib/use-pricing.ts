"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type PriceInfo,
  PROMO_QUOTA,
  TIER_PRICING,
  type TemplateTier,
  formatPrice,
  getAllTierPrices,
  getTemplateTier,
  priceForPromoUsed,
} from "./pricing";

export interface TierClientPrice {
  tier: TemplateTier;
  tierLabel: string;
  amount: number;
  formattedPrice: string;
  normalAmount: number;
  normalPriceLabel: string;
  promoPriceLabel: string;
  isPromo: boolean;
  remainingQuota: number;
}

export interface ClientPriceState extends TierClientPrice {
  tiers: Record<TemplateTier, TierClientPrice>;
  loading: boolean;
}

function toTierClientPrice(info: PriceInfo): TierClientPrice {
  const tierConfig = TIER_PRICING[info.tier] ?? TIER_PRICING.classic;
  return {
    tier: info.tier,
    tierLabel: info.tierLabel || tierConfig.label,
    amount: info.amount,
    formattedPrice: formatPrice(info.amount),
    normalAmount: info.normalAmount,
    normalPriceLabel: formatPrice(tierConfig.normal),
    promoPriceLabel: formatPrice(tierConfig.promo),
    isPromo: info.isPromo,
    remainingQuota: info.remaining,
  };
}

function buildTierMap(
  promoUsed: number
): Record<TemplateTier, TierClientPrice> {
  const raw = getAllTierPrices(promoUsed);
  return {
    classic: toTierClientPrice(raw.classic),
    signature: toTierClientPrice(raw.signature),
  };
}

const DEFAULT_TIERS: Record<TemplateTier, TierClientPrice> = buildTierMap(0);

let cachedTiers: Record<TemplateTier, TierClientPrice> | null = null;

interface ApiPricingResponse {
  ok?: boolean;
  amount?: number;
  normalAmount?: number;
  tier?: TemplateTier;
  tierLabel?: string;
  isPromo?: boolean;
  remaining?: number;
  tiers?: Partial<Record<TemplateTier, Partial<PriceInfo>>>;
}

function parseTierFromApi(
  tier: TemplateTier,
  raw: Partial<PriceInfo> | undefined,
  fallbackPromo: boolean,
  fallbackRemaining: number
): TierClientPrice {
  const fallback = priceForPromoUsed(
    fallbackPromo ? Math.max(0, PROMO_QUOTA - fallbackRemaining) : PROMO_QUOTA,
    tier
  );
  const amount = Number(raw?.amount ?? fallback.amount);
  const isPromo =
    raw?.isPromo !== undefined ? Boolean(raw.isPromo) : fallbackPromo;
  const remaining = Number(raw?.remaining ?? fallbackRemaining);
  const normalAmount = Number(raw?.normalAmount ?? TIER_PRICING[tier].normal);
  const tierLabel = raw?.tierLabel ?? TIER_PRICING[tier].label;

  return toTierClientPrice({
    amount,
    normalAmount,
    tier,
    tierLabel,
    isPromo,
    remaining,
  });
}

/**
 * Hook untuk mendapatkan informasi harga aktif (per tier Classic & Signature)
 * dan sisa kuota promo dari server.
 */
export function usePricing(templateSlug?: string): ClientPriceState {
  const tier = getTemplateTier(templateSlug);
  const [tiers, setTiers] = useState<Record<TemplateTier, TierClientPrice>>(
    () => cachedTiers ?? DEFAULT_TIERS
  );
  const [loading, setLoading] = useState<boolean>(() => cachedTiers === null);

  useEffect(() => {
    let cancelled = false;
    const url = templateSlug
      ? `/api/pricing?slug=${encodeURIComponent(templateSlug)}`
      : "/api/pricing";

    fetch(url)
      .then((res) => res.json())
      .then((data: ApiPricingResponse) => {
        if (cancelled || !data?.ok) return;
        const isPromo = Boolean(data.isPromo);
        const remaining = Number(data.remaining ?? 0);
        const nextTiers: Record<TemplateTier, TierClientPrice> = {
          classic: parseTierFromApi(
            "classic",
            data.tiers?.classic,
            isPromo,
            remaining
          ),
          signature: parseTierFromApi(
            "signature",
            data.tiers?.signature,
            isPromo,
            remaining
          ),
        };
        cachedTiers = nextTiers;
        setTiers(nextTiers);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [templateSlug]);

  return useMemo<ClientPriceState>(
    () => ({
      ...tiers[tier],
      tiers,
      loading,
    }),
    [tiers, tier, loading]
  );
}
