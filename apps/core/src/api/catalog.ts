import { Elysia, t } from "elysia";
import { findAllCatalogServices, searchCatalogServices } from "@database";
import { resolveAuth } from "../auth/session";

export const catalogApi = new Elysia({ prefix: "/api/catalog" })
  .derive(async ({ cookie, request }) => {
    const headers = Object.fromEntries(request.headers.entries()) as Record<
      string,
      string | undefined
    >;
    const { user, agentId } = await resolveAuth(
      cookie as Record<string, { value?: string }>,
      headers
    );
    return { user, agentId };
  })
  .get(
    "/",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return findAllCatalogServices();
    },
    {
      detail: {
        tags: ["Catalog"],
        summary: "List all catalog services",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/search",
    async ({ user, set, query }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const q = query.q ?? "";
      if (!q.trim()) return [];
      return searchCatalogServices(q.trim());
    },
    {
      query: t.Object(
        { q: t.Optional(t.String()) },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Catalog"],
        summary: "Search catalog services",
        security: [{ bearerAuth: [] }],
      },
    },
  );
