import { Elysia } from "elysia";
import { getSettings, updateSettings } from "@database";
import { validateUnsubscribeToken } from "@notifications";

export const notificationsApi = new Elysia({ prefix: "/api/notifications" })
  .get("/preferences", async ({ query, set }) => {
    const token = query.token;
    if (!token) {
      set.status = 400;
      return { error: "Missing token" };
    }

    const userId = validateUnsubscribeToken(token);
    if (!userId) {
      set.status = 403;
      return { error: "Invalid token" };
    }

    const settings = await getSettings(userId);
    return {
      notify_snapshot_reminders: settings.notify_snapshot_reminders,
      notify_service_updates: settings.notify_service_updates,
      notify_blog_posts: settings.notify_blog_posts,
    };
  })
  .put("/preferences", async ({ query, body, set }) => {
    const token = query.token;
    if (!token) {
      set.status = 400;
      return { error: "Missing token" };
    }

    const userId = validateUnsubscribeToken(token);
    if (!userId) {
      set.status = 403;
      return { error: "Invalid token" };
    }

    const params = body as {
      notify_snapshot_reminders?: boolean;
      notify_service_updates?: boolean;
      notify_blog_posts?: boolean;
    };

    const updated = await updateSettings(userId, params);
    return {
      notify_snapshot_reminders: updated.notify_snapshot_reminders,
      notify_service_updates: updated.notify_service_updates,
      notify_blog_posts: updated.notify_blog_posts,
    };
  });
