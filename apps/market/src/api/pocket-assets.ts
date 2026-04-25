import { Elysia, t } from "elysia";
import {
  findPocketAssetsByServiceId,
  addPocketAsset,
  updatePocketAssetQuantity,
  updatePocketAsset,
  removePocketAsset,
} from "@database";
import { resolveAuth } from "../auth/session";
import type { AssetType } from "@types";

export const pocketAssetsApi = new Elysia({ prefix: "/api/pocket-assets" })
  .derive(async ({ cookie, request }) => {
    const headers = Object.fromEntries(request.headers.entries()) as Record<
      string,
      string | undefined
    >;
    const { user } = await resolveAuth(
      cookie as Record<string, { value?: string }>,
      headers
    );
    return { user };
  })
  .get(
    "/:serviceId",
    async ({ user, set, params }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return findPocketAssetsByServiceId(params.serviceId);
    },
    {
      params: t.Object({ serviceId: t.String() }),
      detail: {
        tags: ["Pocket Assets"],
        summary: "List pocket assets for a service",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/",
    async ({ user, set, body }) => {
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
    },
    {
      body: t.Object(
        {
          service_id: t.String(),
          asset_catalog_id: t.Optional(t.Union([t.String(), t.Null()])),
          symbol: t.String(),
          name: t.String(),
          asset_type: t.String(),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pocket Assets"],
        summary: "Add an asset to a pocket",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/:id/quantity",
    async ({ user, set, params, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { quantity } = body;
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
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object(
        { quantity: t.Number() },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pocket Assets"],
        summary: "Update a pocket asset's quantity",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/:id",
    async ({ user, set, params, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const patch = body;
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
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object(
        {
          service_id: t.Optional(t.String()),
          quantity: t.Optional(t.Number()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pocket Assets"],
        summary: "Update a pocket asset",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:id",
    async ({ user, set, params }) => {
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
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Pocket Assets"],
        summary: "Remove a pocket asset",
        security: [{ bearerAuth: [] }],
      },
    },
  );
