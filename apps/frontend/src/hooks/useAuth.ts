import { use } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue } from "./AuthContext";

export type { AuthContextValue };

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
