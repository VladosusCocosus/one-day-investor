import { Elysia } from "elysia";
import { findAllCatalogServices, searchCatalogServices } from "@database";
import { resolveUser } from "../auth/session";

export const catalogApi = new Elysia({ prefix: "/api/catalog" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
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
