import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export interface Service {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

export interface ServiceTree {
  service: Service;
  children: Service[];
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<Service[]>("/api/services");
      setServices(res.data);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const tree: ServiceTree[] = services
    .filter((s) => s.parent_id === null)
    .map((parent) => ({
      service: parent,
      children: services
        .filter((s) => s.parent_id === parent.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));

  const addService = async (name: string, parentId: string | null) => {
    const res = await api.post<Service>("/api/services", { name, parent_id: parentId });
    setServices((prev) => [...prev, res.data]);
    return res.data;
  };

  const removeService = async (id: string) => {
    await api.delete(`/api/services/${id}`);
    setServices((prev) => prev.filter((s) => s.id !== id && s.parent_id !== id));
  };

  const editService = async (id: string, name: string) => {
    const res = await api.put<Service>(`/api/services/${id}`, { name });
    setServices((prev) => prev.map((s) => (s.id === res.data.id ? res.data : s)));
    return res.data;
  };

  return { services, tree, loading, addService, removeService, editService, refetch: fetch };
}
