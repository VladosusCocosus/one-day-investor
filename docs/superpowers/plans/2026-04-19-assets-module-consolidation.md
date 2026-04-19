# Assets Module Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate scattered asset/price logic into a unified `packages/assets` package, simplify the core endpoint from 168 to ~30 lines, and replace 5 frontend hooks with 1.

**Architecture:** New `packages/assets` package exports shared types, a market client, price caching, and an enrichment function. `apps/core` uses it to serve a single `/api/assets` endpoint that returns services + assets with prices. Frontend uses one `useAssets()` hook.

**Tech Stack:** TypeScript, Bun workspaces, Redis (@redis package), Elysia, React Query

**Spec:** `docs/superpowers/specs/2026-04-19-assets-module-consolidation-design.md`

---

## File Structure

### New files
- `packages/assets/package.json` — package manifest
- `packages/assets/index.ts` — public API: types, market client, cache, enrichment
- `apps/frontend/src/hooks/useAssets.ts` — unified assets hook

### Modified files
- `apps/core/package.json` — add `@assets` dependency
- `apps/core/src/api/assets.ts` — rewrite to use `@assets` package
- `apps/frontend/src/pages/AssetsPage.tsx` — switch to `useAssets()` hook
- `apps/frontend/src/components/SnapshotDrawer.tsx` — switch to `useAssets()` hook
- `apps/frontend/src/hooks/usePocketAssets.ts` — invalidate `["assets"]` query key, re-export types from `@assets`

### Deleted files
- `apps/frontend/src/hooks/useExchangePrices.ts`
- `apps/frontend/src/hooks/useMarketPriceLookup.ts`
- `apps/frontend/src/hooks/useMarketPrices.ts`
- `apps/frontend/src/hooks/useAllPocketAssets.ts`

---

### Task 1: Create `packages/assets` package with types

**Files:**
- Create: `packages/assets/package.json`
- Create: `packages/assets/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@assets",
  "module": "index.ts",
  "type": "module",
  "private": true,
  "dependencies": {
    "@logger": "workspace:*",
    "@redis": "workspace:*"
  },
  "peerDependencies": {
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create index.ts with types and exports**

```ts
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
```

- [ ] **Step 3: Install dependencies**

Run: `cd /Users/pavel/Projects/one-day-investor && bun install`
Expected: Bun resolves workspace dependencies for `@assets`

- [ ] **Step 4: Commit**

```bash
git add packages/assets/
git commit -m "feat: create packages/assets with types, market client, cache, and enrichment"
```

---

### Task 2: Wire `@assets` into `apps/core`

**Files:**
- Modify: `apps/core/package.json` — add `@assets` dependency
- Modify: `apps/core/src/api/assets.ts` — rewrite endpoint

- [ ] **Step 1: Add `@assets` dependency to core**

In `apps/core/package.json`, add to `dependencies`:
```json
"@assets": "workspace:*"
```

- [ ] **Step 2: Run bun install**

Run: `cd /Users/pavel/Projects/one-day-investor && bun install`

- [ ] **Step 3: Rewrite `apps/core/src/api/assets.ts`**

Replace the entire file with:

```ts
import { Elysia } from "elysia";
import { resolveUser } from "../auth/session";
import {
  findServicesByUserId,
  findPocketAssetsByServiceIds,
  findExchangeCredentialsByUserId,
} from "@database";
import { enrichAssetsWithPrices } from "@assets";
import { getAdapter, decrypt } from "@exchange";
import { cacheGet, cacheSet, cacheDel } from "@redis";
import { syncExchangeToDb } from "./exchange-sync";
import { createLogger } from "@logger";
import config from "@config";

const log = createLogger("assets");

const EXCHANGE_CACHE_TTL = 180; // 3 minutes
const MARKET_URL = `http://localhost:${config.MARKET_PORT ?? 3002}`;

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
```

- [ ] **Step 4: Verify core builds**

Run: `cd /Users/pavel/Projects/one-day-investor/apps/core && bun build src/index.ts --no-bundle 2>&1 | head -20`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add apps/core/package.json apps/core/src/api/assets.ts
git commit -m "refactor: rewrite assets endpoint to use @assets package"
```

---

### Task 3: Create `useAssets` hook and migrate `AssetsPage`

**Files:**
- Create: `apps/frontend/src/hooks/useAssets.ts`
- Modify: `apps/frontend/src/pages/AssetsPage.tsx`

- [ ] **Step 1: Create `useAssets` hook**

```ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type AssetType = "crypto" | "invest";

export interface PocketAssetWithPrice {
  id: string;
  service_id: string;
  asset_catalog_id: string | null;
  symbol: string;
  name: string;
  asset_type: AssetType;
  sort_order: number;
  quantity: string;
  api_id: string | null;
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
  created_at: string;
}

interface AssetsResponse {
  services: Service[];
  assets: PocketAssetWithPrice[];
  currency: string;
}

export function useAssets() {
  const { data, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const res = await api.get<AssetsResponse>("/api/assets");
      return res.data;
    },
    staleTime: 60_000,
  });

  return {
    services: data?.services ?? [],
    assets: data?.assets ?? [],
    currency: data?.currency ?? "USD",
    loading: isLoading,
  };
}
```

- [ ] **Step 2: Migrate `AssetsPage.tsx`**

Replace the imports and price-fetching logic. The key changes:
1. Remove imports: `useAllPocketAssets`, `usePriceLookup`, `useExchangePrices`
2. Add import: `useAssets`
3. Remove `useAllPocketAssets`, `useExchangePrices`, `usePriceLookup` calls
4. Use `assets` from `useAssets()` directly — they already have `.price`
5. Simplify `rowValue` to use `asset.price` directly

Replace the full file content:

```tsx
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssetDrawer } from "@/components/AssetDrawer";
import { PocketDrawer, type PocketDrawerMode } from "@/components/PocketDrawer";
import {
  useServices,
  getLeafPockets,
  getLeafCommonPockets,
  getPocketLabels,
} from "@/hooks/useServices";
import { useSettings } from "@/hooks/useSettings";
import { useAssets, type PocketAssetWithPrice } from "@/hooks/useAssets";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/lib/use-page-meta";
import { pageMeta } from "@/lib/metadata";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
};

type AssetDrawerMode =
  | { kind: "add"; pocketId: string }
  | { kind: "edit"; asset: PocketAssetWithPrice };

export function AssetsPage() {
  usePageMeta(pageMeta.assets);
  const { services, loading: servicesLoading } = useServices();
  const { settings } = useSettings();
  const currency = settings?.currency ?? "EUR";
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const { assets: allAssets } = useAssets();

  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);
  const [assetDrawerMode, setAssetDrawerMode] = useState<AssetDrawerMode>({
    kind: "add",
    pocketId: "",
  });
  const [pocketDrawerMode, setPocketDrawerMode] =
    useState<PocketDrawerMode | null>(null);

  const leafPockets = useMemo(() => getLeafPockets(services), [services]);
  const leafCommonPockets = useMemo(
    () => getLeafCommonPockets(services),
    [services]
  );
  const pocketLabels = useMemo(() => getPocketLabels(services), [services]);

  const rowValue = (a: PocketAssetWithPrice) => {
    return (Number(a.quantity) || 0) * (a.price ?? 0);
  };

  // Build a flat price map for components that need Record<string, number>
  const prices = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of allAssets) {
      if (a.price != null) {
        map[a.api_id ?? a.symbol] = a.price;
      }
    }
    return map;
  }, [allAssets]);

  const assetsByService = useMemo(() => {
    const map = new Map<string, PocketAssetWithPrice[]>();
    for (const a of allAssets) {
      const arr = map.get(a.service_id) ?? [];
      arr.push(a);
      map.set(a.service_id, arr);
    }
    for (const [id, arr] of map) {
      arr.sort((x, y) => rowValue(y) - rowValue(x));
      map.set(id, arr);
    }
    return map;
  }, [allAssets, prices]);

  const pocketTotal = (serviceId: string) =>
    (assetsByService.get(serviceId) ?? []).reduce(
      (s, a) => s + rowValue(a),
      0
    );

  const grandTotal = leafPockets.reduce(
    (s, p) => s + pocketTotal(p.id),
    0
  );
  const grandAssetCount = leafPockets.reduce(
    (s, p) => s + (assetsByService.get(p.id)?.length ?? 0),
    0
  );
  const grandPocketCount = leafPockets.length;

  const hasInvestmentPockets = leafPockets.length > 0;
  const hasCommonPockets = leafCommonPockets.length > 0;
  const hasNoPockets =
    !servicesLoading && !hasInvestmentPockets && !hasCommonPockets;

  const formatMoney = (v: number) =>
    `${currencySymbol}${Math.round(v).toLocaleString("en-US")}`;

  const openAddAsset = (pocketId: string) => {
    setAssetDrawerMode({ kind: "add", pocketId });
    setAssetDrawerOpen(true);
  };

  const openEditAsset = (asset: PocketAssetWithPrice) => {
    setAssetDrawerMode({ kind: "edit", asset });
    setAssetDrawerOpen(true);
  };

  const openAddPocket = () => {
    setPocketDrawerMode({ kind: "add" });
  };

  const openEditPocket = (pocketId: string) => {
    const leaf = services.find((s) => s.id === pocketId);
    if (!leaf) return;
    if (leaf.parent_id) {
      setPocketDrawerMode({
        kind: "edit",
        parentId: leaf.parent_id,
        focusChildId: leaf.id,
      });
    } else {
      setPocketDrawerMode({ kind: "edit", parentId: leaf.id });
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your investment holdings
          </p>
        </div>
        {!servicesLoading && (
          <Button variant="outline" size="sm" onClick={openAddPocket}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add pocket
          </Button>
        )}
      </div>

      {!servicesLoading && !hasNoPockets && (
        <div className="mt-5">
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {formatMoney(grandTotal)}
          </p>
          <p className="text-xs text-muted-foreground">
            across {grandAssetCount}{" "}
            {grandAssetCount === 1 ? "asset" : "assets"} in {grandPocketCount}{" "}
            {grandPocketCount === 1 ? "pocket" : "pockets"}
          </p>
        </div>
      )}

      {servicesLoading ? (
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-md bg-muted/50"
            />
          ))}
        </div>
      ) : hasNoPockets ? (
        <Card className="mt-6">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No pockets yet. Click <span className="font-medium">Add pocket</span> to start.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border bg-card">
          {leafPockets.map((pocket) => {
            const assets = assetsByService.get(pocket.id) ?? [];
            const total = pocketTotal(pocket.id);
            return (
              <PocketSection
                key={pocket.id}
                label={pocketLabels.get(pocket.id) ?? pocket.name}
                total={formatMoney(total)}
                assets={assets}
                rowValue={rowValue}
                formatMoney={formatMoney}
                onHeaderClick={() => openEditPocket(pocket.id)}
                onAddAsset={() => openAddAsset(pocket.id)}
                onRowClick={openEditAsset}
              />
            );
          })}
          {leafCommonPockets.map((pocket) => (
            <CommonPocketRow
              key={pocket.id}
              label={pocketLabels.get(pocket.id) ?? pocket.name}
              onClick={() => openEditPocket(pocket.id)}
            />
          ))}
          {hasInvestmentPockets && (
            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {formatMoney(grandTotal)}
              </span>
            </div>
          )}
        </div>
      )}

      <AssetDrawer
        open={assetDrawerOpen}
        onOpenChange={setAssetDrawerOpen}
        mode={assetDrawerMode}
        services={services}
        prices={prices}
        currencySymbol={currencySymbol}
        assetsByService={assetsByService}
      />

      <PocketDrawer
        mode={pocketDrawerMode}
        onModeChange={setPocketDrawerMode}
      />
    </div>
  );
}

interface PocketSectionProps {
  label: string;
  total: string;
  assets: PocketAssetWithPrice[];
  rowValue: (a: PocketAssetWithPrice) => number;
  formatMoney: (v: number) => string;
  onHeaderClick: () => void;
  onAddAsset: () => void;
  onRowClick: (a: PocketAssetWithPrice) => void;
}

function PocketSection({
  label,
  total,
  assets,
  rowValue,
  formatMoney,
  onHeaderClick,
  onAddAsset,
  onRowClick,
}: PocketSectionProps) {
  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center bg-muted/30">
        <button
          type="button"
          onClick={onHeaderClick}
          className={cn(
            "flex flex-1 items-center px-4 py-2 text-left transition-colors",
            "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
          )}
          aria-label={`Edit pocket ${label}`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </button>
        <span className="px-2 text-xs font-medium text-foreground tabular-nums">
          {total}
        </span>
        <button
          type="button"
          onClick={onAddAsset}
          aria-label={`Add asset to ${label}`}
          className={cn(
            "mr-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors",
            "hover:bg-emerald-50 hover:text-emerald-700",
            "focus-visible:bg-emerald-50 focus-visible:text-emerald-700 focus-visible:outline-none"
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {assets.length === 0 ? (
        <button
          type="button"
          onClick={onAddAsset}
          className="block w-full px-4 py-3 text-left text-xs italic text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
        >
          No assets — click <span className="font-medium">+</span> to add one
        </button>
      ) : (
        assets.map((a) => {
          const qty = Number(a.quantity) || 0;
          const value = rowValue(a);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onRowClick(a)}
              className={cn(
                "group flex w-full items-center gap-3 border-l-2 border-transparent px-4 py-2.5 text-left transition-colors",
                "hover:border-primary hover:bg-muted/40",
                "focus-visible:border-primary focus-visible:bg-muted/40 focus-visible:outline-none"
              )}
            >
              <span className="w-[60px] shrink-0 font-mono text-[13px] font-semibold text-primary">
                {a.symbol}
              </span>
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {a.name}
              </span>
              <span className="w-[90px] text-right text-[13px] tabular-nums text-foreground">
                {qty.toLocaleString("en-US", { maximumFractionDigits: 8 })}
              </span>
              <span className="w-[90px] text-right text-[13px] font-medium tabular-nums text-foreground">
                {value > 0 ? formatMoney(value) : "—"}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}

function CommonPocketRow({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between border-b bg-muted/10 px-4 py-2 text-left transition-colors last:border-b-0",
        "hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none"
      )}
      aria-label={`Edit pocket ${label}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Verify frontend builds**

Run: `cd /Users/pavel/Projects/one-day-investor/apps/frontend && bunx vite build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/hooks/useAssets.ts apps/frontend/src/pages/AssetsPage.tsx
git commit -m "feat: create useAssets hook and migrate AssetsPage"
```

---

### Task 4: Migrate `SnapshotDrawer` to `useAssets`

**Files:**
- Modify: `apps/frontend/src/components/SnapshotDrawer.tsx`

- [ ] **Step 1: Update imports in SnapshotDrawer.tsx**

Replace:
```ts
import { useAllPocketAssets } from "@/hooks/useAllPocketAssets";
import { usePriceLookup } from "@/hooks/useMarketPriceLookup";
```

With:
```ts
import { useAssets } from "@/hooks/useAssets";
```

- [ ] **Step 2: Replace hook calls**

Find the block (around lines 126-141):
```ts
  const allAssets = useAllPocketAssets(
    modeKind === "create" ? investServiceIds : []
  );
  const priceableAssets = useMemo(
    () =>
      allAssets.map((a) => ({
        api_id: a.api_id ?? a.symbol,
        symbol: a.symbol,
        asset_type: a.asset_type,
      })),
    [allAssets]
  );
  const { prices, loading: pricesLoading } = usePriceLookup(
    priceableAssets,
    currency
  );
```

Replace with:
```ts
  const { assets: allAssetsFromApi } = useAssets();
  // Filter to only invest/crypto services when in create mode
  const allAssets = useMemo(
    () =>
      modeKind === "create"
        ? allAssetsFromApi.filter((a) => investServiceIds.includes(a.service_id))
        : [],
    [allAssetsFromApi, investServiceIds, modeKind]
  );
  const prices = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of allAssets) {
      if (a.price != null) {
        map[a.api_id ?? a.symbol] = a.price;
      }
    }
    return map;
  }, [allAssets]);
  const pricesLoading = false; // prices come with assets, no separate loading state
```

- [ ] **Step 3: Verify frontend builds**

Run: `cd /Users/pavel/Projects/one-day-investor/apps/frontend && bunx vite build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/SnapshotDrawer.tsx
git commit -m "refactor: migrate SnapshotDrawer to useAssets hook"
```

---

### Task 5: Update `usePocketAssets` and delete old hooks

**Files:**
- Modify: `apps/frontend/src/hooks/usePocketAssets.ts`
- Delete: `apps/frontend/src/hooks/useExchangePrices.ts`
- Delete: `apps/frontend/src/hooks/useMarketPriceLookup.ts`
- Delete: `apps/frontend/src/hooks/useMarketPrices.ts`
- Delete: `apps/frontend/src/hooks/useAllPocketAssets.ts`

- [ ] **Step 1: Update `usePocketAssets` to invalidate `["assets"]` query key**

In `usePocketAssets.ts`, replace the `AssetType` import source and update `invalidateAll`:

Replace:
```ts
import type { AssetType } from "./useAssetCatalog";
```

With:
```ts
import type { AssetType } from "./useAssets";
```

Replace:
```ts
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["pocket-assets"] });
  };
```

With:
```ts
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["pocket-assets"] });
    queryClient.invalidateQueries({ queryKey: ["assets"] });
  };
```

- [ ] **Step 2: Check for any other imports of `PocketAsset` type from `usePocketAssets`**

`AssetDrawer.tsx` imports `type PocketAsset` from `usePocketAssets`. Update it to import from `useAssets` instead:

In `apps/frontend/src/components/AssetDrawer.tsx`, replace:
```ts
import { usePocketAssets, type PocketAsset } from "@/hooks/usePocketAssets";
```

With:
```ts
import { usePocketAssets } from "@/hooks/usePocketAssets";
import type { PocketAssetWithPrice as PocketAsset } from "@/hooks/useAssets";
```

- [ ] **Step 3: Delete old hooks**

```bash
rm apps/frontend/src/hooks/useExchangePrices.ts
rm apps/frontend/src/hooks/useMarketPriceLookup.ts
rm apps/frontend/src/hooks/useMarketPrices.ts
rm apps/frontend/src/hooks/useAllPocketAssets.ts
```

- [ ] **Step 4: Verify frontend builds**

Run: `cd /Users/pavel/Projects/one-day-investor/apps/frontend && bunx vite build 2>&1 | tail -10`
Expected: Build succeeds with no import errors

- [ ] **Step 5: Commit**

```bash
git add -A apps/frontend/src/hooks/ apps/frontend/src/components/AssetDrawer.tsx
git commit -m "refactor: delete old price/asset hooks, consolidate to useAssets"
```

---

### Task 6: Remove unused market-api axios client (if possible)

**Files:**
- Possibly modify: `apps/frontend/src/lib/market-api.ts`

- [ ] **Step 1: Check remaining usages of `marketApi`**

Search for imports of `market-api` across the frontend. After previous tasks, `usePocketAssets.ts` and `useAssetCatalog.ts` still use it for mutations and catalog search (these go to the market service directly).

Run: `grep -r "market-api" apps/frontend/src/ --include="*.ts" --include="*.tsx"`

If `usePocketAssets.ts` and `useAssetCatalog.ts` are the only remaining consumers, the market-api client stays — those endpoints are still on the market service.

- [ ] **Step 2: Commit if any changes**

No changes expected — `market-api.ts` stays for pocket asset mutations and catalog search.

---

### Task 7: Final verification

- [ ] **Step 1: Full frontend build**

Run: `cd /Users/pavel/Projects/one-day-investor/apps/frontend && bunx vite build`
Expected: Clean build, no errors

- [ ] **Step 2: Core build check**

Run: `cd /Users/pavel/Projects/one-day-investor/apps/core && bun build src/index.ts --no-bundle 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Verify the endpoint manually (if running locally)**

Run: `cd /Users/pavel/Projects/one-day-investor && bun run apps/core/src/index.ts &`
Then: `curl -s http://localhost:3001/api/assets | jq 'keys'`
Expected: `["assets", "currency", "services"]`

- [ ] **Step 4: Final commit if any fixes needed**
