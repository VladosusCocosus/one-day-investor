import { api } from "./api";

export interface AgentListItem {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  last_used_at: string | null;
  active_token_count: number;
}

export interface AgentToken {
  id: string;
  token_last4: string | null;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface CreateTokenResponse {
  id: string;
  token: string; // shown ONCE
  token_last4: string;
  expires_at: string;
}

export const agentsApi = {
  list: async (): Promise<AgentListItem[]> => {
    const res = await api.get<AgentListItem[]>("/api/agents");
    return res.data;
  },
  create: async (name: string, description?: string): Promise<AgentListItem> => {
    const res = await api.post<AgentListItem>("/api/agents", { name, description });
    return res.data;
  },
  rename: async (id: string, name: string): Promise<AgentListItem> => {
    const res = await api.patch<AgentListItem>(`/api/agents/${id}`, { name });
    return res.data;
  },
  revoke: async (id: string): Promise<void> => {
    await api.delete(`/api/agents/${id}`);
  },
  listTokens: async (id: string): Promise<AgentToken[]> => {
    const res = await api.get<AgentToken[]>(`/api/agents/${id}/tokens`);
    return res.data;
  },
  createToken: async (id: string, expires_in: string): Promise<CreateTokenResponse> => {
    const res = await api.post<CreateTokenResponse>(`/api/agents/${id}/tokens`, { expires_in });
    return res.data;
  },
  revokeToken: async (id: string, tokenId: string): Promise<void> => {
    await api.delete(`/api/agents/${id}/tokens/${tokenId}`);
  },
};
