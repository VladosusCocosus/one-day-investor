import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketApi } from "@/lib/market-api";
import type { AssetType } from "./useAssetCatalog";

export interface PriceableAsset {
  api_id: string | null;
  symbol: string;
  asset_type: AssetType;
}

/**
 * Auto-fetching price lookup for a set of assets in a single currency.
 *
 * Results are cached for 5 minutes, keyed by a stable-sorted string of
 * `api_id|asset_type` tuples plus the currency, so two screens requesting
 * the same assets share a single network request.
 *
 * Returns a map of `api_id ?? symbol` → price and an isLoading flag.
 */
export function usePriceLookup(
  assets: PriceableAsset[],
  currency: string
): { prices: Record<string, number>; loading: boolean } {
  const assetKeys = useMemo(
    () =>
      assets
        .map((a) => `${a.api_id ?? a.symbol}|${a.asset_type}`)
        .sort()
        .join(","),
    [assets]
  );

  const { data = {}, isLoading: loading } = useQuery({
    queryKey: ["market-prices", assetKeys, currency],
    queryFn: async () => {
      const payload = assets.map((a) => ({
        api_id: a.api_id ?? a.symbol,
        symbol: a.symbol,
        asset_type: a.asset_type,
      }));
      const res = await marketApi.post<Record<string, number | null>>(
        "/api/market/prices",
        { assets: payload, currency }
      );
      const normalized: Record<string, number> = {};
      for (const [k, v] of Object.entries(res.data)) {
        if (v != null) normalized[k] = v;
      }
      return normalized;
    },
    enabled: assets.length > 0,
    staleTime: 5 * 60_000,
  });

  return { prices: data, loading };
}
