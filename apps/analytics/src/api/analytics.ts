import { Elysia, t } from "elysia";
import { findCurrentTotal, findDistribution, findTimeline, findAssetTimeline } from "@database";
import { resolveAuth } from "../auth/session";

export const analyticsApi = new Elysia({ prefix: "/api/analytics" })
  .derive(async ({ cookie, request }) => {
    const headers = Object.fromEntries(request.headers.entries()) as Record<
      string,
      string | undefined
    >;
    const { user } = await resolveAuth(
      cookie as Record<string, { value?: string }>,
      headers
    );
    return { user };
  })
  .get(
    "/distribution",
    async ({ user, set, query }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const month = query.month;
      if (!month) {
        set.status = 400;
        return { error: "month query parameter is required" };
      }
      return findDistribution(user.id, month);
    },
    {
      query: t.Object(
        { month: t.Optional(t.String()) },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Analytics"],
        summary: "Distribution of holdings for a given month",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/timeline",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return findTimeline(user.id);
    },
    {
      detail: {
        tags: ["Analytics"],
        summary: "Monthly portfolio totals over time",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/current",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return findCurrentTotal(user.id);
    },
    {
      detail: {
        tags: ["Analytics"],
        summary: "Current portfolio total",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/asset-timeline",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const rows = await findAssetTimeline(user.id);

      const grouped: Record<string, Record<string, number>> = {};
      for (const row of rows) {
        if (!grouped[row.month]) grouped[row.month] = {};
        grouped[row.month][row.asset] = Number(row.amount);
      }

      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, assets]) => ({ month, assets }));
    },
    {
      detail: {
        tags: ["Analytics"],
        summary: "Per-asset value timeline",
        security: [{ bearerAuth: [] }],
      },
    },
  );
