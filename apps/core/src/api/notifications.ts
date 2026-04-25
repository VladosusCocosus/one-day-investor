import { Elysia, t } from "elysia";
import { getSettings, updateSettings } from "@database";
import { validateUnsubscribeToken } from "@notifications";

export const notificationsApi = new Elysia({ prefix: "/api/notifications" })
  .get(
    "/preferences",
    async ({ query, set }) => {
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
    },
    {
      query: t.Object(
        { token: t.Optional(t.String()) },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Notifications"],
        summary: "Get notification preferences via unsubscribe token",
      },
    },
  )
  .put(
    "/preferences",
    async ({ query, body, set }) => {
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

      const updated = await updateSettings(userId, body);
      return {
        notify_snapshot_reminders: updated.notify_snapshot_reminders,
        notify_service_updates: updated.notify_service_updates,
        notify_blog_posts: updated.notify_blog_posts,
      };
    },
    {
      query: t.Object(
        { token: t.Optional(t.String()) },
        { additionalProperties: true },
      ),
      body: t.Object(
        {
          notify_snapshot_reminders: t.Optional(t.Boolean()),
          notify_service_updates: t.Optional(t.Boolean()),
          notify_blog_posts: t.Optional(t.Boolean()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Notifications"],
        summary: "Update notification preferences via unsubscribe token",
      },
    },
  );
