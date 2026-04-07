import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketApi } from "@/lib/market-api";
import type { AssetType } from "./useAssetCatalog";

export interface PocketAsset {
  id: string;
  service_id: string;
  asset_catalog_id: string | null;
  symbol: string;
  name: string;
  asset_type: AssetType;
  sort_order: number;
  api_id: string | null;
}

export function usePocketAssets(serviceId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading: loading } = useQuery({
    queryKey: ["pocket-assets", serviceId],
    queryFn: async () => {
      const res = await marketApi.get<PocketAsset[]>(`/api/pocket-assets/${serviceId}`);
      return res.data;
    },
    enabled: !!serviceId,
  });

  const addMutation = useMutation({
    mutationFn: async (params: {
      service_id: string;
      asset_catalog_id?: string | null;
      symbol: string;
      name: string;
      asset_type: AssetType;
    }) => {
      const res = await marketApi.post<PocketAsset>("/api/pocket-assets", params);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pocket-assets", serviceId] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await marketApi.delete(`/api/pocket-assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pocket-assets", serviceId] });
    },
  });

  const addAsset = async (params: {
    service_id: string;
    asset_catalog_id?: string | null;
    symbol: string;
    name: string;
    asset_type: AssetType;
  }) => {
    return addMutation.mutateAsync(params);
  };

  const removeAsset = async (id: string) => {
    await removeMutation.mutateAsync(id);
  };

  return { assets, loading, addAsset, removeAsset };
}
