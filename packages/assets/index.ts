import { createLogger } from "@logger";
import { cacheGet, cacheSet } from "@redis";

const log = createLogger("assets");

// --- Types ---

export type AssetType = "crypto" | "invest";

export interface PocketAsset {
  id: string;
  service_id: string;
  asset_catalog_id: string | null;
  symbol: string;
  name: string;
  asset_type: AssetType;
  sort_order: number;
  quantity: string;
  api_id: string | null;
}

export interface PocketAssetWithPrice extends PocketAsset {
  price: number | null;
  currency: string;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  service_type: string;
  catalog_service_id: string | null;
  created_at: Date;
}

export interface AssetsResponse {
  services: Service[];
  assets: PocketAssetWithPrice[];
  currency: string;
}

// --- Market Client ---

export async function fetchMarketPrices(
  marketUrl: string,
  assets: { api_id: string; symbol: string; asset_type: AssetType }[],
  currency: string
): Promise<Record<string, number | null>> {
  if (assets.length === 0) return {};

  const res = await fetch(`${marketUrl}/api/market/prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assets, currency }),
  });

  if (!res.ok) {
    log.error({ status: res.status }, "Market API request failed");
    return {};
  }

  return res.json();
}

// --- Price Cache ---

const PRICE_CACHE_TTL = 180; // 3 minutes

export async function getMarketPrices(
  marketUrl: string,
  assets: { api_id: string; symbol: string; asset_type: AssetType }[],
  currency: string
): Promise<Record<string, number | null>> {
  if (assets.length === 0) return {};

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
  const prices = await fetchMarketPrices(marketUrl, assets, currency);
  await cacheSet(cacheKey, prices, PRICE_CACHE_TTL);
  return prices;
}

// --- Enrichment ---

export async function enrichAssetsWithPrices(
  assets: PocketAsset[],
  marketUrl: string,
  currency: string
): Promise<PocketAssetWithPrice[]> {
  const priceableAssets = assets
    .filter((a) => a.api_id || a.symbol)
    .map((a) => ({
      api_id: a.api_id ?? a.symbol,
      symbol: a.symbol,
      asset_type: a.asset_type,
    }));

  const prices = await getMarketPrices(marketUrl, priceableAssets, currency);

  return assets.map((asset) => ({
    ...asset,
    price: prices[asset.api_id ?? asset.symbol] ?? null,
    currency,
  }));
}
