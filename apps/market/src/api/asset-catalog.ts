import { Elysia, t } from "elysia";
import { searchAssetCatalog } from "@database";
import { resolveAuth } from "../auth/session";
import type { AssetType } from "@types";

export const assetCatalogApi = new Elysia({ prefix: "/api/asset-catalog" })
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
    "/search",
    async ({ user, set, query }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { q, type } = query;
      if (!q?.trim()) return [];
      return searchAssetCatalog(q.trim(), type as AssetType | undefined);
    },
    {
      query: t.Object(
        {
          q: t.Optional(t.String()),
          type: t.Optional(t.String()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Asset Catalog"],
        summary: "Search the asset catalog",
        security: [{ bearerAuth: [] }],
      },
    },
  );
