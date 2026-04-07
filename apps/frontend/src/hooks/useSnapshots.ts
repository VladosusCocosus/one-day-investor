import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SnapshotSummary {
  id: string;
  month: string;
  total: string;
  created_at: string;
}

export interface SnapshotEntry {
  id: string;
  service_id: string;
  amount: string;
}

export interface SnapshotDetail {
  id: string;
  month: string;
  created_at: string;
  entries: SnapshotEntry[];
}

export function useSnapshots() {
  const queryClient = useQueryClient();

  const { data: summaries = [], isLoading: loading } = useQuery({
    queryKey: ["snapshots"],
    queryFn: async () => {
      const res = await api.get<SnapshotSummary[]>("/api/snapshots");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ month, entries }: { month: string; entries: { service_id: string; amount: number }[] }) => {
      const res = await api.post<SnapshotDetail>("/api/snapshots", { month, entries });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, entries }: { id: string; entries: { service_id: string; amount: number }[] }) => {
      const res = await api.put<SnapshotDetail>(`/api/snapshots/${id}`, { entries });
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["snapshot", id] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/snapshots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });

  const createSnapshot = async (month: string, entries: { service_id: string; amount: number }[]) => {
    return createMutation.mutateAsync({ month, entries });
  };

  const updateSnapshot = async (id: string, entries: { service_id: string; amount: number }[]) => {
    return updateMutation.mutateAsync({ id, entries });
  };

  const removeSnapshot = async (id: string) => {
    await removeMutation.mutateAsync(id);
  };

  return { summaries, loading, createSnapshot, updateSnapshot, removeSnapshot };
}

export function useSnapshotDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["snapshot", id],
    queryFn: async () => {
      const res = await api.get<SnapshotDetail>(`/api/snapshots/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}
