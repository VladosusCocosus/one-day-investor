import { useState, useEffect, useCallback } from "react";
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
  const [summaries, setSummaries] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<SnapshotSummary[]>("/api/snapshots");
      setSummaries(res.data);
    } catch {
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const getSnapshot = async (id: string): Promise<SnapshotDetail> => {
    const res = await api.get<SnapshotDetail>(`/api/snapshots/${id}`);
    return res.data;
  };

  const getLatest = async (): Promise<SnapshotDetail | null> => {
    try {
      const res = await api.get<SnapshotDetail>("/api/snapshots/latest");
      return res.data;
    } catch {
      return null;
    }
  };

  const createSnapshot = async (month: string, entries: { service_id: string; amount: number }[]) => {
    const res = await api.post<SnapshotDetail>("/api/snapshots", { month, entries });
    await fetch();
    return res.data;
  };

  const updateSnapshot = async (id: string, entries: { service_id: string; amount: number }[]) => {
    const res = await api.put<SnapshotDetail>(`/api/snapshots/${id}`, { entries });
    await fetch();
    return res.data;
  };

  const removeSnapshot = async (id: string) => {
    await api.delete(`/api/snapshots/${id}`);
    await fetch();
  };

  return { summaries, loading, getSnapshot, getLatest, createSnapshot, updateSnapshot, removeSnapshot, refetch: fetch };
}
