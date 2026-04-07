import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ServiceType } from "./useCatalog";

export interface Service {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  service_type: ServiceType;
  catalog_service_id: string | null;
}

export interface ServiceTree {
  service: Service;
  children: Service[];
}

function buildTree(services: Service[]): ServiceTree[] {
  return services
    .filter((s) => s.parent_id === null)
    .map((parent) => ({
      service: parent,
      children: services
        .filter((s) => s.parent_id === parent.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
}

export function useServices() {
  const queryClient = useQueryClient();

  const { data: services = [], isLoading: loading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const res = await api.get<Service[]>("/api/services");
      return res.data;
    },
  });

  const tree = buildTree(services);

  const addMutation = useMutation({
    mutationFn: async ({
      name,
      parentId,
      serviceType,
    }: {
      name: string;
      parentId: string | null;
      serviceType?: ServiceType;
    }) => {
      const res = await api.post<Service>("/api/services", {
        name,
        parent_id: parentId,
        service_type: serviceType,
      });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/services/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, ...params }: { id: string; name?: string; service_type?: ServiceType }) => {
      const res = await api.put<Service>(`/api/services/${id}`, params);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const addService = async (name: string, parentId: string | null, serviceType?: ServiceType) => {
    return addMutation.mutateAsync({ name, parentId, serviceType });
  };

  const removeService = async (id: string) => {
    await removeMutation.mutateAsync(id);
  };

  const editService = async (id: string, params: { name?: string; service_type?: ServiceType }) => {
    return editMutation.mutateAsync({ id, ...params });
  };

  return { services, tree, loading, addService, removeService, editService };
}
