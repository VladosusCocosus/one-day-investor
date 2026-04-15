import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/analyticsApi";

export interface DistributionEntry {
  name: string;
  amount: number;
}

export interface TimelineEntry {
  month: string;
  total: number;
}

export interface CurrentTotal {
  month: string;
  total: number;
}

export function useDistribution(month: string | undefined) {
  return useQuery({
    queryKey: ["analytics", "distribution", month],
    queryFn: async () => {
      const res = await analyticsApi.get<DistributionEntry[]>(
        "/api/analytics/distribution",
        { params: { month } }
      );
      return res.data;
    },
    enabled: !!month,
  });
}

export function useTimeline() {
  return useQuery({
    queryKey: ["analytics", "timeline"],
    queryFn: async () => {
      const res = await analyticsApi.get<TimelineEntry[]>(
        "/api/analytics/timeline"
      );
      return res.data;
    },
  });
}

export function useCurrentTotal() {
  return useQuery({
    queryKey: ["analytics", "current"],
    queryFn: async () => {
      const res = await analyticsApi.get<CurrentTotal | null>(
        "/api/analytics/current"
      );
      return res.data;
    },
  });
}

export interface AssetTimelineEntry {
  month: string;
  assets: Record<string, number>;
}

export function useAssetTimeline() {
  return useQuery({
    queryKey: ["analytics", "asset-timeline"],
    queryFn: async () => {
      const res = await analyticsApi.get<AssetTimelineEntry[]>(
        "/api/analytics/asset-timeline"
      );
      return res.data;
    },
  });
}
