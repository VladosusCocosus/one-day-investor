import { useMutation } from "@tanstack/react-query";
import { marketApi } from "@/lib/market-api";
import type { AssetType } from "./useAssetCatalog";

export function useMarketPrices() {
  const mutation = useMutation({
    mutationFn: async ({
      assets,
      currency,
    }: {
      assets: { api_id: string; asset_type: AssetType }[];
      currency: string;
    }) => {
      const res = await marketApi.post<Record<string, number | null>>(
        "/api/market/prices",
        { assets, currency }
      );
      return res.data;
    },
  });

  const fetchPrices = async (
    assets: { api_id: string; asset_type: AssetType }[],
    currency: string
  ) => {
    return mutation.mutateAsync({ assets, currency });
  };

  return { fetchPrices, loading: mutation.isPending };
}
