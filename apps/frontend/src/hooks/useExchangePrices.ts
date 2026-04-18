import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface AssetsResponse {
  exchangePrices: Record<string, number>;
}

/**
 * Fetches pre-computed exchange prices from GET /api/assets.
 * The backend computes symbol → USD price from exchange data and stores it in Redis.
 * These prices override market prices for exchange-linked assets.
 */
export function useExchangePrices(): {
  exchangePrices: Record<string, number>;
  loading: boolean;
} {
  const { data, isLoading: loading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const res = await api.get<AssetsResponse>("/api/assets");
      return res.data;
    },
    staleTime: 60_000,
  });

  return {
    exchangePrices: data?.exchangePrices ?? {},
    loading,
  };
}
