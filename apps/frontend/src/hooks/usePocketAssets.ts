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
  quantity: string;
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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["pocket-assets"] });
  };

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
    onSuccess: invalidateAll,
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const res = await marketApi.put<PocketAsset>(
        `/api/pocket-assets/${id}/quantity`,
        { quantity }
      );
      return res.data;
    },
    onSuccess: invalidateAll,
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { service_id?: string; quantity?: number };
    }) => {
      const res = await marketApi.put<PocketAsset>(`/api/pocket-assets/${id}`, patch);
      return res.data;
    },
    onSuccess: invalidateAll,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await marketApi.delete(`/api/pocket-assets/${id}`);
    },
    onSuccess: invalidateAll,
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

  const updateQuantity = async (id: string, quantity: number) => {
    return updateQuantityMutation.mutateAsync({ id, quantity });
  };

  const updateAsset = async (
    id: string,
    patch: { service_id?: string; quantity?: number }
  ) => {
    return updateAssetMutation.mutateAsync({ id, patch });
  };

  const removeAsset = async (id: string) => {
    await removeMutation.mutateAsync(id);
  };

  return { assets, loading, addAsset, updateQuantity, updateAsset, removeAsset };
}
