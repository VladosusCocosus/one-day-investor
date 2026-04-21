import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Service } from "@/hooks/useServices";

export type ServiceType = "common" | "invest" | "crypto";
export type IntegrationType = "manual" | "api" | "pdf-upload";

export interface CatalogService {
  id: string;
  name: string;
  parent_id: string | null;
  service_type: ServiceType;
  sort_order: number;
  integration_type: IntegrationType;
}

export interface CatalogTree {
  service: CatalogService;
  children: CatalogService[];
}

export function useCatalog() {
  const queryClient = useQueryClient();

  const { data: allCatalog = [] } = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const res = await api.get<CatalogService[]>("/api/catalog");
      return res.data;
    },
  });

  const searchCatalog = async (query: string): Promise<CatalogService[]> => {
    if (!query.trim()) return [];
    const res = await api.get<CatalogService[]>("/api/catalog/search", {
      params: { q: query },
    });
    return res.data;
  };

  const getChildren = (parentId: string): CatalogService[] => {
    return allCatalog
      .filter((s) => s.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const subscribeMutation = useMutation({
    mutationFn: async ({
      catalog_service_id,
      child_ids,
    }: {
      catalog_service_id: string;
      child_ids: string[];
    }) => {
      const res = await api.post<Service[]>("/api/services/subscribe", {
        catalog_service_id,
        child_ids,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (catalog_service_id: string) => {
      const res = await api.post("/api/services/unsubscribe", {
        catalog_service_id,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  const subscribe = async (catalogServiceId: string, childIds: string[]) => {
    return subscribeMutation.mutateAsync({
      catalog_service_id: catalogServiceId,
      child_ids: childIds,
    });
  };

  const unsubscribe = async (catalogServiceId: string) => {
    return unsubscribeMutation.mutateAsync(catalogServiceId);
  };

  return { allCatalog, searchCatalog, getChildren, subscribe, unsubscribe };
}
