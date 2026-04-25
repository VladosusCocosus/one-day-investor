import { Elysia, t } from "elysia";
import { PriceQueryAsset } from "./schemas";
import { fetchPrices, type AssetType } from "@market";
import { cacheGet, cacheSet } from "@redis";
import { createLogger } from "@logger";

const log = createLogger("market-api");

const PRICE_CACHE_TTL = 180; // 3 minutes

export const marketApi = new Elysia({ prefix: "/api/market" })
  .post(
    "/prices",
    async ({ set, body }) => {
      const { assets, currency } = body as {
        assets: { api_id: string; symbol?: string; asset_type: AssetType }[];
        currency: string;
      };
      if (!assets || !currency) {
        set.status = 400;
        return { error: "assets and currency are required" };
      }

      const assetKey = assets
        .map((a) => `${a.api_id}:${a.asset_type}`)
        .sort()
        .join(",");
      const cacheKey = `prices:${currency}:${assetKey}`;

      const cached = await cacheGet<Record<string, number | null>>(cacheKey);
      if (cached) {
        log.debug({ currency, count: assets.length }, "Price cache hit");
        return cached;
      }

      log.info({ currency, count: assets.length }, "Price cache miss, fetching");
      const prices = await fetchPrices(assets, currency);

      await cacheSet(cacheKey, prices, PRICE_CACHE_TTL);

      return prices;
    },
    {
      body: t.Object(
        {
          assets: t.Array(PriceQueryAsset),
          currency: t.String(),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Market"],
        summary: "Fetch current prices for a list of assets",
      },
    },
  );
