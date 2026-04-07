import { Elysia } from "elysia";
import { searchAssetCatalog } from "@database";
import { resolveUser } from "../auth/session";
import type { AssetType } from "@types";

export const assetCatalogApi = new Elysia({ prefix: "/api/asset-catalog" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .get("/search", async ({ user, set, query }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { q, type } = query as { q?: string; type?: AssetType };
    if (!q?.trim()) return [];
    return searchAssetCatalog(q.trim(), type);
  });
