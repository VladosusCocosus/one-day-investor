import { createContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading: loading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await api.get<User>("/auth/me");
      return res.data;
    },
    retry: false,
  });

  const login = () => {
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get("redirect_to");
    const authUrl = redirectTo
      ? `${import.meta.env.VITE_API_URL}/auth/google?redirect_to=${encodeURIComponent(redirectTo)}`
      : `${import.meta.env.VITE_API_URL}/auth/google`;
    window.location.href = authUrl;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
    }
  };

  return (
    <AuthContext value={{ user, loading, login, logout }}>
      {children}
    </AuthContext>
  );
}
