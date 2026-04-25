import { Elysia, t } from "elysia";
import { SnapshotEntry } from "./schemas";
import {
  findSnapshotsByUserId,
  findSnapshotById,
  findLatestSnapshot,
  createSnapshot,
  updateSnapshot,
  deleteSnapshot,
} from "@database";
import { createLogger } from "@logger";
import { resolveAuth } from "../auth/session";

const log = createLogger("api:snapshots");

export const snapshotsApi = new Elysia({ prefix: "/api/snapshots" })
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
      return findSnapshotsByUserId(user.id);
    },
    {
      detail: {
        tags: ["Snapshots"],
        summary: "List snapshots for the current user",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/latest",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const snapshot = await findLatestSnapshot(user.id);
      if (!snapshot) {
        set.status = 404;
        return { error: "No snapshots found" };
      }
      return snapshot;
    },
    {
      detail: {
        tags: ["Snapshots"],
        summary: "Get the latest snapshot",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/:id",
    async ({ user, set, params }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const snapshot = await findSnapshotById(params.id, user.id);
      if (!snapshot) {
        set.status = 404;
        return { error: "Snapshot not found" };
      }
      return snapshot;
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Snapshots"],
        summary: "Get a snapshot by id",
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
      const { month, entries } = body;
      if (!month || !entries) {
        set.status = 400;
        return { error: "month and entries are required" };
      }
      try {
        log.info(
          {
            userId: user.id,
            month,
            entryCount: entries.length,
            byServiceAndPocket: entries.map(
              (e) => `${e.service_id}|${e.pocket_asset_id ?? "null"}`,
            ),
          },
          "createSnapshot called",
        );
        const snapshot = await createSnapshot({
          user_id: user.id,
          month,
          entries,
        });
        return snapshot;
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("snapshots_user_id_month")) {
          set.status = 409;
          return { error: "Snapshot already exists for this month" };
        }
        log.error({ err }, "createSnapshot failed");
        throw err;
      }
    },
    {
      body: t.Object(
        {
          month: t.String(),
          entries: t.Array(SnapshotEntry),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Snapshots"],
        summary: "Create a snapshot for a month",
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
      const { entries } = body;
      if (!entries) {
        set.status = 400;
        return { error: "entries are required" };
      }
      const result = await updateSnapshot(params.id, user.id, entries);
      if (!result) {
        set.status = 404;
        return { error: "Snapshot not found" };
      }
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object(
        {
          entries: t.Array(SnapshotEntry),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Snapshots"],
        summary: "Replace a snapshot's entries",
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
      const deleted = await deleteSnapshot(params.id, user.id);
      if (!deleted) {
        set.status = 404;
        return { error: "Snapshot not found" };
      }
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Snapshots"],
        summary: "Delete a snapshot",
        security: [{ bearerAuth: [] }],
      },
    },
  );
