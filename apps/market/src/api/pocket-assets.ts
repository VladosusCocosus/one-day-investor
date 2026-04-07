import { Elysia } from "elysia";
import {
  findPocketAssetsByServiceId,
  addPocketAsset,
  removePocketAsset,
} from "@database";
import { resolveUser } from "../auth/session";
import type { AssetType } from "@types";

export const pocketAssetsApi = new Elysia({ prefix: "/api/pocket-assets" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .get("/:serviceId", async ({ user, set, params }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return findPocketAssetsByServiceId(params.serviceId);
  })
  .post("/", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const params = body as {
      service_id: string;
      asset_catalog_id?: string | null;
      symbol: string;
      name: string;
      asset_type: AssetType;
    };
    if (!params.service_id || !params.symbol || !params.name || !params.asset_type) {
      set.status = 400;
      return { error: "service_id, symbol, name, and asset_type are required" };
    }
    return addPocketAsset(params);
  })
  .delete("/:id", async ({ user, set, params }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const deleted = await removePocketAsset(params.id);
    if (!deleted) {
      set.status = 404;
      return { error: "Pocket asset not found" };
    }
    return { success: true };
  });
