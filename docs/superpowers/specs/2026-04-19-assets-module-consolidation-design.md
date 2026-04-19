# Assets Module Consolidation

## Problem

Asset and price data is scattered across multiple modules:
- `apps/core/src/api/assets.ts` — 168 lines doing too much: DB reads, exchange API calls, caching, price derivation
- `apps/market/src/api/market.ts` — separate price endpoint with its own Redis cache
- `packages/market/index.ts` — price fetching logic (Binance/Bybit/CoinGecko/Yahoo)
- Frontend uses 5 hooks (`useExchangePrices`, `useMarketPriceLookup`, `useMarketPrices`, `useAllPocketAssets`, `usePocketAssets`) making 3-4 separate API calls to assemble what is conceptually one thing: "my assets with prices"

## Design

### New package: `packages/assets`

A unified package with four responsibilities:

#### 1. Types

Shared types for the entire monorepo:

```ts
type AssetType = "crypto" | "invest"

interface AssetCatalogEntry {
  id: string
  symbol: string
  name: string
  asset_type: AssetType
  api_id: string
  sort_order: number
}

interface PocketAsset {
  id: string
  service_id: string
  symbol: string
  name: string
  asset_type: AssetType
  quantity: string
  api_id: string | null
  asset_catalog_id: string | null
}

interface PocketAssetWithPrice extends PocketAsset {
  price: number | null
  currency: string
}

interface Service {
  id: string
  name: string
  parent_id: string | null
  user_id: string
  type: string
}

interface AssetsResponse {
  services: Service[]
  assets: PocketAssetWithPrice[]
  currency: string
}
```

#### 2. Market client

Function to request prices from the market service over HTTP:

```ts
async function fetchMarketPrices(
  marketUrl: string,
  assets: { api_id: string; symbol: string; asset_type: AssetType }[],
  currency: string
): Promise<Record<string, number | null>>
```

#### 3. Price cache

Caches the result from market service in Redis. The expensive operation is fetching prices, not reading assets from DB.

- Redis key: `prices:{currency}:{sorted asset keys}`
- TTL: 3 minutes
- On cache miss: calls `fetchMarketPrices` and stores the result
- Assets from DB are read fresh every time (cheap operation)

```ts
async function getMarketPrices(
  marketUrl: string,
  assets: { api_id: string; symbol: string; asset_type: AssetType }[],
  currency: string
): Promise<Record<string, number | null>>
```

#### 4. Enrichment

Combines assets from DB with cached prices:

```ts
async function enrichAssetsWithPrices(
  assets: PocketAsset[],
  marketUrl: string,
  currency: string
): Promise<PocketAssetWithPrice[]>
```

Reads assets as-is, calls `getMarketPrices` (cached), merges price into each asset.

### Changes to `apps/core`

Current `apps/core/src/api/assets.ts` (168 lines) simplifies to ~30 lines:

```ts
.get("/", async ({ user }) => {
  const currency = user.currency ?? "USD"
  const services = await findServicesByUserId(user.id)
  const leafIds = getLeafServiceIds(services)
  const assets = await findPocketAssetsByServiceIds(leafIds)
  // Sync exchange holdings to DB if credentials exist and cache expired (3 min TTL)
  await syncExchangesIfNeeded(user.id)
  // Re-read assets after sync in case new holdings were added
  const freshAssets = await findPocketAssetsByServiceIds(leafIds)
  const assetsWithPrices = await enrichAssetsWithPrices(freshAssets, MARKET_URL, currency)
  return { services, assets: assetsWithPrices, currency }
})
```

**Removed from core:**
- `buildExchangePrices()` — no longer needed, prices come from market service
- `CachedPockets`, `CachedRegularPockets` — Redis pocket caching removed, DB is fast enough
- Exchange price merging logic — market service already fetches Binance/Bybit tickers

**Stays in core:**
- Exchange sync (`syncExchangeToDb`) — syncs holdings from exchange APIs to DB
- Auth and routing

### Changes to frontend

Replace 5 hooks with 1 primary hook:

**New `useAssets()`:**

```ts
export function useAssets() {
  const { data, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => api.get<AssetsResponse>("/api/assets"),
    staleTime: 60_000,
  })

  return {
    services: data?.services ?? [],
    assets: data?.assets ?? [],
    currency: data?.currency ?? "USD",
    loading: isLoading,
  }
}
```

**Deleted hooks:**
- `useExchangePrices.ts` — prices already in `/api/assets` response
- `useMarketPriceLookup.ts` — no separate price request needed
- `useMarketPrices.ts` — no separate price request needed
- `useAllPocketAssets.ts` — all assets come in one response

**Remaining hooks:**
- `usePocketAssets.ts` — kept for mutations (add/update/remove asset), invalidates `["assets"]` query key
- `useAssetCatalog.ts` — catalog search via market service, unrelated to portfolio view

### What stays unchanged

- **`apps/market`** — remains a separate service with `/api/market/prices` and `/api/asset-catalog/search`
- **`packages/market`** — price fetching logic (Binance → Bybit → CoinGecko, Yahoo Finance) untouched
- **`packages/database`** — `asset-catalog/` and `pocket-assets/` modules stay as-is
- **`apps/core/src/api/exchange-sync.ts`** — exchange holdings sync stays in core
- **`useAssetCatalog`** — catalog search hook stays

## Decisions

- **Price source**: Always market prices from providers (Binance ticker API / CoinGecko / Yahoo). Exchange connections provide only quantities/holdings.
- **Response format**: Grouped by services/pockets (like current), but with prices included in each asset — no separate price fetch.
- **Market service**: Stays as separate HTTP service. Core calls it over network. Both use shared `packages/assets` for types.
- **Cache layer**: Cache prices only (expensive), not the full response. Assets from DB are cheap to read fresh.
