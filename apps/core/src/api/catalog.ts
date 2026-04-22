import { Elysia } from "elysia";
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
  .get("/", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return findAllCatalogServices();
  })
  .get("/search", async ({ user, set, query }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const q = (query as { q?: string }).q ?? "";
    if (!q.trim()) return [];
    return searchCatalogServices(q.trim());
  });
