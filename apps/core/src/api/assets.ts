import { Elysia } from "elysia";
import { resolveUser } from "../auth/session";
import {
  findServicesByUserId,
  findPocketAssetsByServiceIds,
  findExchangeCredentialsByUserId,
} from "@database";
import { enrichAssetsWithPrices } from "@assets";
import { getAdapter, decrypt } from "@exchange";
import { cacheGet, cacheSet } from "@redis";
import { syncExchangeToDb } from "./exchange-sync";
import { createLogger } from "@logger";
import config from "@config";

const log = createLogger("assets");

const EXCHANGE_CACHE_TTL = 180; // 3 minutes
const MARKET_URL = config.get("marketUrl");

function getLeafServiceIds(services: { id: string; parent_id: string | null }[]): string[] {
  return services
    .filter((s) => !services.some((other) => other.parent_id === s.id))
    .map((s) => s.id);
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

    // 1. Sync exchange holdings if credentials exist and cache expired
    const credentials = await findExchangeCredentialsByUserId(user.id);
    for (const cred of credentials) {
      const cacheKey = `user:${user.id}:exchange-synced:${cred.id}`;
      const synced = await cacheGet<boolean>(cacheKey);
      if (!synced) {
        try {
          log.info({ exchange: cred.exchange, label: cred.label }, "Syncing exchange holdings");
          const adapter = getAdapter(cred.exchange as "binance" | "bybit");
          const apiKey = decrypt(cred.api_key);
          const apiSecret = decrypt(cred.api_secret);
          const pockets = await adapter.fetchPockets(apiKey, apiSecret);
          await syncExchangeToDb(user.id, cred.service_id!, pockets);
          await cacheSet(cacheKey, true, EXCHANGE_CACHE_TTL);
        } catch (err) {
          log.error({ err, exchange: cred.exchange, label: cred.label }, "Exchange sync failed");
        }
      }
    }

    // 2. Read services and assets from DB (always fresh)
    const services = await findServicesByUserId(user.id);
    const leafIds = getLeafServiceIds(services);
    const assets = await findPocketAssetsByServiceIds(leafIds);

    // 3. Enrich with cached market prices
    const currency = "USD"; // prices always in USD, frontend converts via settings
    const assetsWithPrices = await enrichAssetsWithPrices(assets, MARKET_URL, currency);

    return { services, assets: assetsWithPrices, currency };
  });
