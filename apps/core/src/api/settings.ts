import { Elysia } from "elysia";
import { getSettings, updateSettings } from "@database";
import { resolveUser } from "../auth/session";

export const settingsApi = new Elysia({ prefix: "/api/settings" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .get("/", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return getSettings(user.id);
  })
  .put("/", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const params = body as { snapshot_day?: number; goal?: number; currency?: string };
    return updateSettings(user.id, params);
  });
