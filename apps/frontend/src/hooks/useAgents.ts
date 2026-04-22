import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  agentsApi,
  type AgentListItem,
  type AgentToken,
  type CreateTokenResponse,
} from "@/lib/agentsApi";

const LIST_KEY = ["agents"] as const;
const tokensKey = (id: string) => ["agents", id, "tokens"] as const;

export function useAgents() {
  return useQuery<AgentListItem[]>({
    queryKey: LIST_KEY,
    queryFn: agentsApi.list,
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      agentsApi.create(name, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useRevokeAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentsApi.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useAgentTokens(id: string) {
  return useQuery<AgentToken[]>({
    queryKey: tokensKey(id),
    queryFn: () => agentsApi.listTokens(id),
    enabled: !!id,
  });
}

export function useCreateAgentToken(id: string) {
  const qc = useQueryClient();
  return useMutation<CreateTokenResponse, Error, string>({
    mutationFn: (expires_in) => agentsApi.createToken(id, expires_in),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tokensKey(id) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useRevokeAgentToken(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) => agentsApi.revokeToken(id, tokenId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tokensKey(id) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
