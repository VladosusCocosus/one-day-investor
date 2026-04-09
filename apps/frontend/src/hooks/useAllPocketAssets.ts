import { useQueries } from "@tanstack/react-query";
import { marketApi } from "@/lib/market-api";
import type { PocketAsset } from "./usePocketAssets";

/**
 * Loads all pocket assets across a set of service ids.
 * Each service is fetched as an independent query so TanStack Query
 * caches them per-service (matching the keys used by `usePocketAssets`).
 *
 * Returns a flat array of every asset across the given services.
 */
export function useAllPocketAssets(serviceIds: string[]): PocketAsset[] {
  const results = useQueries({
    queries: serviceIds.map((sid) => ({
      queryKey: ["pocket-assets", sid],
      queryFn: async () => {
        const res = await marketApi.get<PocketAsset[]>(
          `/api/pocket-assets/${sid}`
        );
        return res.data;
      },
    })),
  });
  return results.flatMap((r) => r.data ?? []);
}
