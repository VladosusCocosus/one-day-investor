import { Elysia } from "elysia";
import {
  findServicesByUserId,
  createService,
  updateService,
  deleteService,
  subscribeToService,
  unsubscribeFromService,
} from "@database";
import { resolveUser } from "../auth/session";
import type { ServiceType } from "@types";
import { cacheDel } from "@redis";

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
    const { name, parent_id, service_type } = body as {
      name: string;
      parent_id: string | null;
      service_type?: ServiceType;
    };
    if (!name || typeof name !== "string") {
      set.status = 400;
      return { error: "name is required" };
    }
    const result = await createService({
      user_id: user.id,
      name,
      parent_id: parent_id ?? null,
      service_type,
    });
    await cacheDel(`user:${user.id}:pockets`);
    return result;
  })
  .post("/subscribe", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { catalog_service_id, child_ids } = body as {
      catalog_service_id: string;
      child_ids: string[];
    };
    if (!catalog_service_id) {
      set.status = 400;
      return { error: "catalog_service_id is required" };
    }
    const result = await subscribeToService(user.id, catalog_service_id, child_ids ?? []);
    await cacheDel(`user:${user.id}:pockets`);
    return result;
  })
  .post("/unsubscribe", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { catalog_service_id } = body as { catalog_service_id: string };
    if (!catalog_service_id) {
      set.status = 400;
      return { error: "catalog_service_id is required" };
    }
    const result = await unsubscribeFromService(user.id, catalog_service_id);
    if (!result.success) {
      set.status = 409;
      return { error: result.error };
    }
    await cacheDel(`user:${user.id}:pockets`);
    return { success: true };
  })
  .put("/:id", async ({ user, set, params, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const updates = body as {
      name?: string;
      parent_id?: string | null;
      sort_order?: number;
      service_type?: ServiceType;
    };
    const result = await updateService(params.id, user.id, updates);
    if (!result) {
      set.status = 404;
      return { error: "Service not found" };
    }
    await cacheDel(`user:${user.id}:pockets`);
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
    await cacheDel(`user:${user.id}:pockets`);
    return { success: true };
  });
