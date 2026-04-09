import { Elysia } from "elysia";
import {
  findPocketAssetsByServiceId,
  addPocketAsset,
  updatePocketAssetQuantity,
  updatePocketAsset,
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
  .put("/:id/quantity", async ({ user, set, params, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { quantity } = body as { quantity: number };
    if (quantity == null || typeof quantity !== "number") {
      set.status = 400;
      return { error: "quantity is required" };
    }
    const result = await updatePocketAssetQuantity(params.id, quantity);
    if (!result) {
      set.status = 404;
      return { error: "Pocket asset not found" };
    }
    return result;
  })
  .put("/:id", async ({ user, set, params, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const patch = body as { service_id?: string; quantity?: number };
    if (patch.service_id === undefined && patch.quantity === undefined) {
      set.status = 400;
      return { error: "At least one of service_id or quantity is required" };
    }
    if (patch.quantity !== undefined && typeof patch.quantity !== "number") {
      set.status = 400;
      return { error: "quantity must be a number" };
    }
    if (patch.service_id !== undefined && typeof patch.service_id !== "string") {
      set.status = 400;
      return { error: "service_id must be a string" };
    }
    const result = await updatePocketAsset(params.id, patch);
    if (!result) {
      set.status = 404;
      return { error: "Pocket asset not found" };
    }
    return result;
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
