import { Elysia } from "elysia";
import { resolveUser } from "../auth/session";
import {
  findServicesByUserId,
  findPocketAssetsByServiceIds,
  findExchangeCredentialsByUserId,
} from "@database";
import { getAdapter, decrypt, type ExchangePocket } from "@exchange";
import { cacheGet, cacheSet, cacheDel } from "@redis";
import { syncExchangeToDb } from "./exchange-sync";
import { createLogger } from "@logger";

const log = createLogger("assets");

const EXCHANGE_CACHE_TTL = 180; // 3 minutes

interface CachedPockets {
  pockets: ExchangePocket[];
  prices: Record<string, number>; // symbol → USD price from exchange
  cachedAt: string;
}

function buildExchangePrices(pockets: ExchangePocket[]): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const pocket of pockets) {
    for (const asset of pocket.assets) {
      const qty = parseFloat(asset.quantity);
      const value = parseFloat(asset.valueUsd);
      if (qty > 0 && value > 0) {
        prices[asset.symbol] = value / qty;
      }
    }
  }
  return prices;
}

interface CachedRegularPockets {
  services: unknown[];
  assets: unknown[];
  cachedAt: string;
}

export const assetsApi = new Elysia({ prefix: "/api/assets" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .get("/", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    // 1. Regular pockets from Redis (hydrate from DB if missing)
    let regularData = await cacheGet<CachedRegularPockets>(
      `user:${user.id}:pockets`
    );

    if (!regularData) {
      const services = await findServicesByUserId(user.id);
      const leafIds = services
        .filter((s) => !services.some((other) => other.parent_id === s.id))
        .map((s) => s.id);
      const assets = await findPocketAssetsByServiceIds(leafIds);
      regularData = {
        services,
        assets,
        cachedAt: new Date().toISOString(),
      };
      await cacheSet(`user:${user.id}:pockets`, regularData);
    }

    // 2. Exchange pockets from Redis (fetch from API if expired)
    const credentials = await findExchangeCredentialsByUserId(user.id);
    const exchangeData: {
      credentialId: string;
      exchange: string;
      label: string;
      pockets: ExchangePocket[];
      cachedAt: string;
    }[] = [];

    for (const cred of credentials) {
      const cacheKey = `user:${user.id}:exchange:${cred.id}`;
      let cached = await cacheGet<CachedPockets>(cacheKey);

      if (!cached) {
        try {
          log.info({ exchange: cred.exchange, label: cred.label }, "Fetching exchange data (cache miss)");
          const adapter = getAdapter(cred.exchange as "binance" | "bybit");
          const apiKey = decrypt(cred.api_key);
          const apiSecret = decrypt(cred.api_secret);
          const start = Date.now();
          const pockets = await adapter.fetchPockets(apiKey, apiSecret);
          const totalAssets = pockets.reduce((sum, p) => sum + p.assets.length, 0);
          log.info(
            { exchange: cred.exchange, label: cred.label, pockets: pockets.length, assets: totalAssets, ms: Date.now() - start },
            "Exchange data fetched"
          );

          await syncExchangeToDb(user.id, cred.service_id!, pockets);

          cached = {
            pockets,
            prices: buildExchangePrices(pockets),
            cachedAt: new Date().toISOString(),
          };
          await cacheSet(cacheKey, cached, EXCHANGE_CACHE_TTL);

          // Invalidate regular pockets cache since DB was updated
          await cacheDel(`user:${user.id}:pockets`);

          // Re-read regular data
          const services = await findServicesByUserId(user.id);
          const leafIds = services
            .filter((s) => !services.some((other) => other.parent_id === s.id))
            .map((s) => s.id);
          const assets = await findPocketAssetsByServiceIds(leafIds);
          regularData = {
            services,
            assets,
            cachedAt: new Date().toISOString(),
          };
          await cacheSet(`user:${user.id}:pockets`, regularData);
        } catch (err) {
          log.error({ err, exchange: cred.exchange, label: cred.label }, "Failed to fetch exchange data");
          exchangeData.push({
            credentialId: cred.id,
            exchange: cred.exchange,
            label: cred.label,
            pockets: [],
            cachedAt: new Date().toISOString(),
          });
          continue;
        }
      }

      exchangeData.push({
        credentialId: cred.id,
        exchange: cred.exchange,
        label: cred.label,
        pockets: cached.pockets,
        cachedAt: cached.cachedAt,
      });
    }

    // Merge all exchange prices into a single map
    const exchangePrices: Record<string, number> = {};
    for (const entry of exchangeData) {
      for (const pocket of entry.pockets) {
        for (const asset of pocket.assets) {
          const qty = parseFloat(asset.quantity);
          const value = parseFloat(asset.valueUsd);
          if (qty > 0 && value > 0) {
            exchangePrices[asset.symbol] = value / qty;
          }
        }
      }
    }

    return {
      services: regularData.services,
      assets: regularData.assets,
      exchange: exchangeData,
      exchangePrices,
      cachedAt: regularData.cachedAt,
    };
  });
