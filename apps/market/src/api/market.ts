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
      assets: { api_id: string; asset_type: AssetType }[];
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

    // Cache miss — fetch from providers
    log.info({ currency, count: assets.length }, "Price cache miss, fetching");
    const prices = await fetchPrices(assets, currency);

    // For any null prices, try exchange prices from Redis as fallback
    const nullKeys = Object.entries(prices)
      .filter(([, v]) => v === null)
      .map(([k]) => k);

    if (nullKeys.length > 0) {
      // Look for exchange prices cached by the core service
      // Exchange prices are stored per-credential, but we can scan for any user's cached prices
      // that match these symbols. For simplicity, use the requesting user's exchange data.
      const exchangePrices = await cacheGet<Record<string, number>>(
        `user:${user.id}:exchange-prices`
      );

      // Also check the unified assets cache for this user
      if (!exchangePrices) {
        // Try reading from individual exchange credential caches
        const { cacheKeys } = await import("@redis");
        const keys = await cacheKeys(`user:${user.id}:exchange:*`);
        for (const key of keys) {
          const data = await cacheGet<{ prices?: Record<string, number> }>(key);
          if (data?.prices) {
            for (const symbol of nullKeys) {
              if (data.prices[symbol] != null && prices[symbol] === null) {
                // Exchange prices are in USD, convert if needed
                if (currency.toUpperCase() === "USD") {
                  prices[symbol] = data.prices[symbol];
                } else {
                  // We'd need exchange rate conversion here
                  // For now, store raw USD — the frontend handles display
                  const { getExchangeRate } = await import("@market");
                  const rate = await getExchangeRate("USD", currency);
                  prices[symbol] = Math.round(data.prices[symbol] * rate * 100) / 100;
                }
                log.info({ symbol, price: prices[symbol] }, "Used exchange price as fallback");
              }
            }
          }
        }
      }
    }

    // Cache the result
    await cacheSet(cacheKey, prices, PRICE_CACHE_TTL);

    return prices;
  });
