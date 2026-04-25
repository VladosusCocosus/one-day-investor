import { Elysia, t } from "elysia";
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
  .get(
    "/",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return getSettings(user.id);
    },
    {
      detail: {
        tags: ["Settings"],
        summary: "Get the current user's settings",
      },
    },
  )
  .put(
    "/",
    async ({ user, set, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return updateSettings(user.id, body);
    },
    {
      body: t.Object(
        {
          snapshot_day: t.Optional(t.Numeric()),
          goal: t.Optional(t.Numeric()),
          currency: t.Optional(t.String()),
          language: t.Optional(t.String()),
          notify_snapshot_reminders: t.Optional(t.Boolean()),
          notify_service_updates: t.Optional(t.Boolean()),
          notify_blog_posts: t.Optional(t.Boolean()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Settings"],
        summary: "Update the current user's settings",
      },
    },
  );
