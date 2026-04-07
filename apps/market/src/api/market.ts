import { Elysia } from "elysia";
import { fetchPrices, type AssetType } from "@market";
import { resolveUser } from "../auth/session";

export const marketApi = new Elysia({ prefix: "/api/market" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .post("/prices", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { assets, currency } = body as {
      assets: { api_id: string; asset_type: AssetType }[];
      currency: string;
    };
    if (!assets || !currency) {
      set.status = 400;
      return { error: "assets and currency are required" };
    }
    return fetchPrices(assets, currency);
  });
