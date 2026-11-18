"use client";

import { useEffect, useState } from "react";
import {
  NORMAL_AMOUNT_LABEL,
  PROMO_AMOUNT,
  PROMO_AMOUNT_LABEL,
  formatPrice,
} from "./pricing";

export interface ClientPriceState {
  amount: number;
  formattedPrice: string;
  isPromo: boolean;
  remainingQuota: number;
  normalPriceLabel: string;
  promoPriceLabel: string;
  loading: boolean;
}

const DEFAULT_STATE: ClientPriceState = {
  amount: PROMO_AMOUNT,
  formattedPrice: PROMO_AMOUNT_LABEL,
  isPromo: true,
  remainingQuota: 20,
  normalPriceLabel: NORMAL_AMOUNT_LABEL,
  promoPriceLabel: PROMO_AMOUNT_LABEL,
  loading: true,
};

let cachedState: ClientPriceState | null = null;

/**
 * Hook untuk mendapatkan informasi harga aktif dan sisa kuota promo dari server.
 */
export function usePricing(): ClientPriceState {
  const [state, setState] = useState<ClientPriceState>(
    () => cachedState ?? DEFAULT_STATE
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/pricing")
      .then((res) => res.json())
      .then((data: { ok?: boolean; amount?: number; isPromo?: boolean; remaining?: number }) => {
        if (cancelled || !data?.ok) return;
        const amount = Number(data.amount ?? PROMO_AMOUNT);
        const isPromo = Boolean(data.isPromo);
        const remainingQuota = Number(data.remaining ?? 0);
        const nextState: ClientPriceState = {
          amount,
          formattedPrice: formatPrice(amount),
          isPromo,
          remainingQuota,
          normalPriceLabel: NORMAL_AMOUNT_LABEL,
          promoPriceLabel: PROMO_AMOUNT_LABEL,
          loading: false,
        };
        cachedState = nextState;
        setState(nextState);
      })
      .catch(() => {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
