import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ExchangeConnection {
  id: string;
  exchange: string;
  label: string;
  serviceId: string;
  createdAt: string;
}

export function useExchange() {
  const queryClient = useQueryClient();

  const { data: connections = [], isLoading: loading } = useQuery({
    queryKey: ["exchange-connections"],
    queryFn: async () => {
      const res = await api.get<ExchangeConnection[]>("/api/exchange");
      return res.data;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (params: {
      exchange: string;
      label: string;
      apiKey: string;
      apiSecret: string;
    }) => {
      const res = await api.post("/api/exchange/connect", params);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-connections"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/exchange/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-connections"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const connect = async (params: {
    exchange: string;
    label: string;
    apiKey: string;
    apiSecret: string;
  }) => {
    return connectMutation.mutateAsync(params);
  };

  const disconnect = async (id: string) => {
    await disconnectMutation.mutateAsync(id);
  };

  return {
    connections,
    loading,
    connect,
    disconnect,
    connecting: connectMutation.isPending,
    disconnecting: disconnectMutation.isPending,
  };
}
