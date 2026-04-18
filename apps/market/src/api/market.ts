import { Elysia } from "elysia";
import { fetchPrices, type AssetType } from "@market";
import { cacheGet, cacheSet } from "@redis";
import { resolveUser } from "../auth/session";
import { createLogger } from "@logger";

const log = createLogger("market-api");

const PRICE_CACHE_TTL = 180; // 3 minutes

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
      assets: { api_id: string; symbol?: string; asset_type: AssetType }[];
      currency: string;
    };
    if (!assets || !currency) {
      set.status = 400;
      return { error: "assets and currency are required" };
    }

    // Build cache key from sorted asset ids + currency
    const assetKey = assets
      .map((a) => `${a.api_id}:${a.asset_type}`)
      .sort()
      .join(",");
    const cacheKey = `prices:${currency}:${assetKey}`;

    // Check Redis cache
    const cached = await cacheGet<Record<string, number | null>>(cacheKey);
    if (cached) {
      log.debug({ currency, count: assets.length }, "Price cache hit");
      return cached;
    }

    // Cache miss — fetch (exchange tickers first, then CoinGecko/Yahoo fallback)
    log.info({ currency, count: assets.length }, "Price cache miss, fetching");
    const prices = await fetchPrices(assets, currency);

    // Cache the result
    await cacheSet(cacheKey, prices, PRICE_CACHE_TTL);

    return prices;
  });
