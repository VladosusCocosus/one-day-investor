import { Elysia } from "elysia";
import {
  findServicesByUserId,
  createService,
  updateService,
  deleteService,
} from "@database";
import { resolveUser } from "../auth/session";

export const servicesApi = new Elysia({ prefix: "/api/services" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .get("/", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return findServicesByUserId(user.id);
  })
  .post("/", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { name, parent_id } = body as { name: string; parent_id: string | null };
    if (!name || typeof name !== "string") {
      set.status = 400;
      return { error: "name is required" };
    }
    return createService({
      user_id: user.id,
      name,
      parent_id: parent_id ?? null,
    });
  })
  .put("/:id", async ({ user, set, params, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const updates = body as { name?: string; parent_id?: string | null; sort_order?: number };
    const result = await updateService(params.id, user.id, updates);
    if (!result) {
      set.status = 404;
      return { error: "Service not found" };
    }
    return result;
  })
  .delete("/:id", async ({ user, set, params }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const deleted = await deleteService(params.id, user.id);
    if (!deleted) {
      set.status = 404;
      return { error: "Service not found" };
    }
    return { success: true };
  });
