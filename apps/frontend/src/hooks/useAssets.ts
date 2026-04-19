import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type AssetType = "crypto" | "invest";

export interface PocketAssetWithPrice {
  id: string;
  service_id: string;
  asset_catalog_id: string | null;
  symbol: string;
  name: string;
  asset_type: AssetType;
  sort_order: number;
  quantity: string;
  api_id: string | null;
  price: number | null;
  currency: string;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  service_type: string;
  catalog_service_id: string | null;
  created_at: string;
}

interface AssetsResponse {
  services: Service[];
  assets: PocketAssetWithPrice[];
  currency: string;
}

export function useAssets() {
  const { data, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const res = await api.get<AssetsResponse>("/api/assets");
      return res.data;
    },
    staleTime: 60_000,
  });

  return {
    services: data?.services ?? [],
    assets: data?.assets ?? [],
    currency: data?.currency ?? "USD",
    loading: isLoading,
  };
}
