import { Elysia, t } from "elysia";
import {
  findServicesByUserId,
  createService,
  updateService,
  deleteService,
  subscribeToService,
  unsubscribeFromService,
} from "@database";
import { resolveAuth } from "../auth/session";
import type { ServiceType } from "@types";
import { cacheDel } from "@redis";

export const servicesApi = new Elysia({ prefix: "/api/services" })
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
      return findServicesByUserId(user.id);
    },
    {
      detail: {
        tags: ["Pockets"],
        summary: "List pockets for the current user",
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
      const { name, parent_id, service_type } = body;
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
    },
    {
      body: t.Object(
        {
          name: t.String(),
          parent_id: t.Optional(t.Union([t.String(), t.Null()])),
          service_type: t.Optional(t.String()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pockets"],
        summary: "Create a pocket",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/subscribe",
    async ({ user, set, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { catalog_service_id, child_ids } = body;
      if (!catalog_service_id) {
        set.status = 400;
        return { error: "catalog_service_id is required" };
      }
      const result = await subscribeToService(user.id, catalog_service_id, child_ids ?? []);
      await cacheDel(`user:${user.id}:pockets`);
      return result;
    },
    {
      body: t.Object(
        {
          catalog_service_id: t.String(),
          child_ids: t.Optional(t.Array(t.String())),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pockets"],
        summary: "Subscribe to a catalog service",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/unsubscribe",
    async ({ user, set, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { catalog_service_id } = body;
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
    },
    {
      body: t.Object(
        { catalog_service_id: t.String() },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pockets"],
        summary: "Unsubscribe from a catalog service",
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
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object(
        {
          name: t.Optional(t.String()),
          parent_id: t.Optional(t.Union([t.String(), t.Null()])),
          sort_order: t.Optional(t.Numeric()),
          service_type: t.Optional(t.String()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pockets"],
        summary: "Update a pocket",
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
      const deleted = await deleteService(params.id, user.id);
      if (!deleted) {
        set.status = 404;
        return { error: "Service not found" };
      }
      await cacheDel(`user:${user.id}:pockets`);
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Pockets"],
        summary: "Delete a pocket",
        security: [{ bearerAuth: [] }],
      },
    },
  );
