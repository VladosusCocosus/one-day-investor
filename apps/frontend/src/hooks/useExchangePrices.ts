import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ExchangeAsset {
  symbol: string;
  quantity: string;
  valueUsd: string;
}

interface ExchangePocket {
  type: string;
  label: string;
  assets: ExchangeAsset[];
}

interface ExchangeEntry {
  credentialId: string;
  exchange: string;
  label: string;
  pockets: ExchangePocket[];
  cachedAt: string;
}

interface AssetsResponse {
  exchange: ExchangeEntry[];
}

/**
 * Fetches exchange-reported prices from GET /api/assets.
 * Returns a map of symbol → USD price derived from valueUsd / quantity.
 * These prices override market prices for exchange-linked assets.
 */
export function useExchangePrices(): {
  exchangePrices: Record<string, number>;
  exchangeServiceIds: Set<string>;
  loading: boolean;
} {
  const { data, isLoading: loading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const res = await api.get<AssetsResponse>("/api/assets");
      return res.data;
    },
    staleTime: 60_000, // 1 min — exchange data is cached server-side anyway
  });

  const exchangePrices = useMemo(() => {
    const prices: Record<string, number> = {};
    if (!data?.exchange) return prices;

    for (const entry of data.exchange) {
      for (const pocket of entry.pockets) {
        for (const asset of pocket.assets) {
          const qty = parseFloat(asset.quantity);
          const value = parseFloat(asset.valueUsd);
          if (qty > 0 && value > 0) {
            prices[asset.symbol] = value / qty;
          }
        }
      }
    }
    return prices;
  }, [data]);

  return { exchangePrices, exchangeServiceIds: new Set(), loading };
}
