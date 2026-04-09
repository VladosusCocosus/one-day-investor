import { Elysia } from "elysia";
import { findCurrentTotal, findDistribution, findTimeline } from "@database";
import { resolveUser } from "../auth/session";

export const analyticsApi = new Elysia({ prefix: "/api/analytics" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .get("/distribution", async ({ user, set, query }) => {
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
  })
  .get("/timeline", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return findTimeline(user.id);
  })
  .get("/current", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return findCurrentTotal(user.id);
  });
