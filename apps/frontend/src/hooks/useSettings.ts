import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface UserSettings {
  user_id: string;
  snapshot_day: number;
  goal: string;
  currency: string;
  notify_snapshot_reminders: boolean;
  notify_service_updates: boolean;
  notify_blog_posts: boolean;
}

type UpdateSettingsParams = {
  snapshot_day?: number;
  goal?: number;
  currency?: string;
  notify_snapshot_reminders?: boolean;
  notify_service_updates?: boolean;
  notify_blog_posts?: boolean;
};

export function useSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading: loading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.get<UserSettings>("/api/settings");
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: UpdateSettingsParams) => {
      const res = await api.put<UserSettings>("/api/settings", params);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
    },
  });

  const updateSettings = async (params: UpdateSettingsParams) => {
    return updateMutation.mutateAsync(params);
  };

  return { settings, loading, updateSettings };
}
