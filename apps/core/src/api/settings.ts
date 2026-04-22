import { Elysia } from "elysia";
import { getSettings, updateSettings } from "@database";
import { resolveAuth } from "../auth/session";

export const settingsApi = new Elysia({ prefix: "/api/settings" })
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
    return getSettings(user.id);
  })
  .put("/", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const params = body as {
      snapshot_day?: number;
      goal?: number;
      currency?: string;
      language?: string;
      notify_snapshot_reminders?: boolean;
      notify_service_updates?: boolean;
      notify_blog_posts?: boolean;
    };
    return updateSettings(user.id, params);
  });
