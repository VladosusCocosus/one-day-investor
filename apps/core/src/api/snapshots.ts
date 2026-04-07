import { Elysia } from "elysia";
import {
  findSnapshotsByUserId,
  findSnapshotById,
  findLatestSnapshot,
  createSnapshot,
  updateSnapshot,
  deleteSnapshot,
} from "@database";
import { resolveUser } from "../auth/session";

export const snapshotsApi = new Elysia({ prefix: "/api/snapshots" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .get("/", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return findSnapshotsByUserId(user.id);
  })
  .get("/latest", async ({ user, set }) => {
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
  })
  .get("/:id", async ({ user, set, params }) => {
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
  })
  .post("/", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { month, entries } = body as {
      month: string;
      entries: { service_id: string; amount: number }[];
    };
    if (!month || !entries) {
      set.status = 400;
      return { error: "month and entries are required" };
    }
    try {
      return await createSnapshot({
        user_id: user.id,
        month,
        entries,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("unique")) {
        set.status = 409;
        return { error: "Snapshot already exists for this month" };
      }
      throw err;
    }
  })
  .put("/:id", async ({ user, set, params, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { entries } = body as {
      entries: { service_id: string; amount: number }[];
    };
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
  })
  .delete("/:id", async ({ user, set, params }) => {
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
  });
