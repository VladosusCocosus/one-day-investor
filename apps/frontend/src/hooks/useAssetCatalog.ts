import { marketApi } from "@/lib/market-api";

export type AssetType = "crypto" | "invest";

export interface AssetCatalog {
  id: string;
  symbol: string;
  name: string;
  asset_type: AssetType;
  api_id: string;
  sort_order: number;
}

export function useAssetCatalog() {
  const searchAssetCatalog = async (
    query: string,
    assetType?: AssetType
  ): Promise<AssetCatalog[]> => {
    if (!query.trim()) return [];
    const params: Record<string, string> = { q: query };
    if (assetType) params.type = assetType;
    const res = await marketApi.get<AssetCatalog[]>("/api/asset-catalog/search", { params });
    return res.data;
  };

  return { searchAssetCatalog };
}
