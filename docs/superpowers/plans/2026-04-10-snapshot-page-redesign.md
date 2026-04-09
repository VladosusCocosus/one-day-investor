# Snapshot Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-mode Snapshots page with a two-column timeline + detail layout and a single right-side drawer for create/edit, powered by shared price-lookup / pocket-assets hooks extracted from the Assets page.

**Architecture:** No backend changes. Two shared hooks move out of `AssetsPage.tsx` into `hooks/`. `SnapshotsPage` becomes a thin coordinator holding selection state + drawer state; the timeline list, detail view, and drawer are each their own focused component. `SnapshotForm.tsx` is deleted.

**Tech Stack:** React, TanStack Query, Tailwind CSS, `radix-ui` Dialog (via existing `ui/sheet.tsx`), lucide-react.

**Spec:** `docs/superpowers/specs/2026-04-10-snapshot-page-redesign.md`

**Worktree:** `.worktrees/snapshot-redesign` on branch `feat/snapshot-redesign`. All tasks run from that working directory.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `apps/frontend/src/hooks/useAllPocketAssets.ts` | Shared bulk loader for pocket assets across multiple service ids |
| Create | `apps/frontend/src/hooks/useMarketPriceLookup.ts` | Shared auto-fetching price lookup (`usePriceLookup`) |
| Modify | `apps/frontend/src/pages/AssetsPage.tsx` | Refactor to use the two new shared hooks; drop inline versions |
| Create | `apps/frontend/src/components/SnapshotListRail.tsx` | Left timeline rail with year grouping |
| Create | `apps/frontend/src/components/SnapshotDetail.tsx` | Right detail panel (header + pocket list) |
| Create | `apps/frontend/src/components/SnapshotDrawer.tsx` | Create/edit drawer with auto-fetching prices |
| Modify | `apps/frontend/src/pages/SnapshotsPage.tsx` | Full rewrite (two-column layout, id-based selection, drawer wiring) |
| Delete | `apps/frontend/src/components/SnapshotForm.tsx` | Replaced by `SnapshotDrawer` |

**Notes on verification:** the frontend has no test harness, so every task verifies with `bun run build` inside `apps/frontend/` as a type-check + bundle check. Dev-server smoke testing happens once at the end of Task 8.

---

### Task 1: Extract `useAllPocketAssets` shared hook

**Files:**
- Create: `apps/frontend/src/hooks/useAllPocketAssets.ts`

- [ ] **Step 1: Create the hook file**

```ts
import { useQueries } from "@tanstack/react-query";
import { marketApi } from "@/lib/market-api";
import type { PocketAsset } from "./usePocketAssets";

/**
 * Loads all pocket assets across a set of service ids.
 * Each service is fetched as an independent query so TanStack Query
 * caches them per-service (matching the keys used by `usePocketAssets`).
 *
 * Returns a flat array of every asset across the given services.
 */
export function useAllPocketAssets(serviceIds: string[]): PocketAsset[] {
  const results = useQueries({
    queries: serviceIds.map((sid) => ({
      queryKey: ["pocket-assets", sid],
      queryFn: async () => {
        const res = await marketApi.get<PocketAsset[]>(
          `/api/pocket-assets/${sid}`
        );
        return res.data;
      },
    })),
  });
  return results.flatMap((r) => r.data ?? []);
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/frontend && bun run build 2>&1 | tail -8
```
Expected: `built in <Xms>`. No errors. The new file is unused until Task 3, which is fine — unused exports don't fail the build.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/hooks/useAllPocketAssets.ts
git commit -m "feat(frontend): add shared useAllPocketAssets hook

Extracts the bulk pocket-assets loader from AssetsPage so the
upcoming SnapshotDrawer can reuse the same cache keys (no
duplicated requests when both screens are mounted)."
```

---

### Task 2: Extract `usePriceLookup` shared hook

**Files:**
- Create: `apps/frontend/src/hooks/useMarketPriceLookup.ts`

- [ ] **Step 1: Create the hook file**

```ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketApi } from "@/lib/market-api";
import type { AssetType } from "./useAssetCatalog";

export interface PriceableAsset {
  api_id: string | null;
  symbol: string;
  asset_type: AssetType;
}

/**
 * Auto-fetching price lookup for a set of assets in a single currency.
 *
 * Results are cached for 5 minutes, keyed by a stable-sorted string of
 * `api_id|asset_type` tuples plus the currency, so two screens requesting
 * the same assets share a single network request.
 *
 * Returns a map of `api_id ?? symbol` → price and an isLoading flag.
 */
export function usePriceLookup(
  assets: PriceableAsset[],
  currency: string
): { prices: Record<string, number>; loading: boolean } {
  const assetKeys = useMemo(
    () =>
      assets
        .map((a) => `${a.api_id ?? a.symbol}|${a.asset_type}`)
        .sort()
        .join(","),
    [assets]
  );

  const { data = {}, isLoading: loading } = useQuery({
    queryKey: ["market-prices", assetKeys, currency],
    queryFn: async () => {
      const payload = assets.map((a) => ({
        api_id: a.api_id ?? a.symbol,
        asset_type: a.asset_type,
      }));
      const res = await marketApi.post<Record<string, number | null>>(
        "/api/market/prices",
        { assets: payload, currency }
      );
      const normalized: Record<string, number> = {};
      for (const [k, v] of Object.entries(res.data)) {
        if (v != null) normalized[k] = v;
      }
      return normalized;
    },
    enabled: assets.length > 0,
    staleTime: 5 * 60_000,
  });

  return { prices: data, loading };
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/frontend && bun run build 2>&1 | tail -8
```
Expected: `built in <Xms>`. No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/hooks/useMarketPriceLookup.ts
git commit -m "feat(frontend): add shared usePriceLookup hook

Extracts the auto-fetching price query from AssetsPage so the
snapshot drawer can share the same cache (5-min staleTime,
stable-sorted asset key). Returns prices + loading instead of
just prices so consumers can show a fetch indicator."
```

---

### Task 3: Refactor `AssetsPage` to use the shared hooks

**Files:**
- Modify: `apps/frontend/src/pages/AssetsPage.tsx`

- [ ] **Step 1: Replace inline hooks with imports + remove duplicates**

Open `apps/frontend/src/pages/AssetsPage.tsx`. Make the following changes:

**Top of the file** — replace the current import block and delete the two inline hook definitions. The new top of the file (down through the `type DrawerMode` declaration) should be exactly:

```tsx
import { useMemo, useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssetDrawer } from "@/components/AssetDrawer";
import { useServices, getLeafPockets, getPocketLabels } from "@/hooks/useServices";
import { useSettings } from "@/hooks/useSettings";
import { useAllPocketAssets } from "@/hooks/useAllPocketAssets";
import { usePriceLookup } from "@/hooks/useMarketPriceLookup";
import type { PocketAsset } from "@/hooks/usePocketAssets";
import { cn } from "@/lib/utils";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
};

type DrawerMode =
  | { kind: "add" }
  | { kind: "edit"; asset: PocketAsset };
```

This removes:
- The `useQuery, useQueries` imports (no longer needed directly).
- The inline `function useAllPocketAssets(...)` definition.
- The inline `function useAllPrices(...)` definition.
- The `marketApi` import (no longer needed directly here).

- [ ] **Step 2: Update the `AssetsPage` function body to use the shared hooks**

Find the lines inside `AssetsPage()` that read:

```tsx
  const allAssets = useAllPocketAssets(allInvestableIds);
  const prices = useAllPrices(allAssets, currency);
```

Replace with:

```tsx
  const allAssets = useAllPocketAssets(allInvestableIds);
  const { prices } = usePriceLookup(allAssets, currency);
```

Everything else in `AssetsPage()` stays exactly as it is. The `prices` variable now comes from the shared hook's `{ prices, loading }` destructure (loading is ignored here — the Assets page already has its own skeleton state tied to `servicesLoading`).

- [ ] **Step 3: Verify build**

```bash
cd apps/frontend && bun run build 2>&1 | tail -8
```
Expected: `built in <Xms>`. No errors. No new TypeScript warnings in `AssetsPage.tsx`.

- [ ] **Step 4: Manual sanity — grep for leftover references**

```bash
grep -n "useAllPrices\|function useAllPocketAssets" apps/frontend/src/pages/AssetsPage.tsx
```
Expected: no output. (Both inline helpers are gone.)

```bash
grep -n "marketApi" apps/frontend/src/pages/AssetsPage.tsx
```
Expected: no output. (The page no longer talks to `marketApi` directly.)

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/AssetsPage.tsx
git commit -m "refactor(frontend): AssetsPage uses shared price/asset hooks

Behavior unchanged. Deletes the inline useAllPocketAssets and
useAllPrices helpers and imports them from hooks/useAllPocketAssets
and hooks/useMarketPriceLookup so the upcoming snapshot drawer can
reuse the same query cache keys."
```

---

### Task 4: `SnapshotListRail` component (left timeline)

**Files:**
- Create: `apps/frontend/src/components/SnapshotListRail.tsx`

- [ ] **Step 1: Create the component file**

```tsx
import { useMemo } from "react";
import type { SnapshotSummary } from "@/hooks/useSnapshots";
import { cn } from "@/lib/utils";

interface SnapshotListRailProps {
  summaries: SnapshotSummary[]; // sorted newest-first (API order)
  selectedId: string | undefined;
  currencySymbol: string;
  onSelect: (id: string) => void;
}

function formatTotal(value: string | number, sym: string): string {
  return `${sym}${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
}

function formatMonthLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    timeZone: "UTC",
  });
}

interface DeltaView {
  up: boolean;
  pct: number;
}

function computeDelta(
  current: SnapshotSummary,
  previous: SnapshotSummary | undefined
): DeltaView | null {
  if (!previous) return null;
  const cur = Number(current.total) || 0;
  const prev = Number(previous.total) || 0;
  if (prev === 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  return { up: pct >= 0, pct: Math.abs(pct) };
}

export function SnapshotListRail({
  summaries,
  selectedId,
  currencySymbol,
  onSelect,
}: SnapshotListRailProps) {
  // Group rows by year while preserving the newest-first order.
  const sections = useMemo(() => {
    const out: { year: string; items: { summary: SnapshotSummary; delta: DeltaView | null }[] }[] = [];
    for (let i = 0; i < summaries.length; i++) {
      const summary = summaries[i];
      const previous = summaries[i + 1]; // older neighbor
      const year = getYear(summary.month);
      const delta = computeDelta(summary, previous);
      const tail = out[out.length - 1];
      if (!tail || tail.year !== year) {
        out.push({ year, items: [{ summary, delta }] });
      } else {
        tail.items.push({ summary, delta });
      }
    }
    return out;
  }, [summaries]);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
        {sections.map((section) => (
          <div key={section.year}>
            <div className="sticky top-0 z-[1] border-b bg-muted/40 px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {section.year}
              </span>
            </div>
            {section.items.map(({ summary, delta }) => {
              const active = summary.id === selectedId;
              return (
                <button
                  key={summary.id}
                  type="button"
                  onClick={() => onSelect(summary.id)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "text-[13px] font-medium",
                        active && "text-[11px] font-semibold uppercase tracking-wider"
                      )}
                    >
                      {formatMonthLong(summary.month)}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums">
                      {formatTotal(summary.total, currencySymbol)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex min-h-[14px] items-center justify-end gap-1 text-[11px] tabular-nums",
                      active
                        ? "text-primary-foreground/85"
                        : delta
                          ? delta.up
                            ? "text-primary"
                            : "text-destructive"
                          : "text-muted-foreground"
                    )}
                  >
                    {delta ? (
                      <>
                        <span>{delta.up ? "▲" : "▼"}</span>
                        <span>{delta.pct.toFixed(1)}%</span>
                      </>
                    ) : (
                      <span>&nbsp;</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/frontend && bun run build 2>&1 | tail -8
```
Expected: `built in <Xms>`. No errors. The component is unused until Task 7.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/SnapshotListRail.tsx
git commit -m "feat(frontend): add SnapshotListRail timeline component

Chronological snapshot list with year grouping (sticky headers),
per-row total, and MoM delta vs the older neighbor. Active row
uses the emerald primary background; idle rows hover-highlight.
Rows are real buttons for keyboard access."
```

---

### Task 5: `SnapshotDetail` component (right panel)

**Files:**
- Create: `apps/frontend/src/components/SnapshotDetail.tsx`

- [ ] **Step 1: Create the component file**

```tsx
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceTree } from "@/hooks/useServices";
import type { SnapshotDetail as SnapshotDetailData } from "@/hooks/useSnapshots";

interface SnapshotDetailProps {
  detail: SnapshotDetailData | undefined;
  prevDetail: SnapshotDetailData | undefined;
  tree: ServiceTree[];
  currencySymbol: string;
  loading: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function formatMoney(value: number, sym: string): string {
  return `${sym}${Math.round(value).toLocaleString("en-US")}`;
}

function formatMonthLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMonthShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatQty(value: string | number): string {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 8,
  });
}

interface PocketRow {
  serviceId: string;
  label: string;
  subtotal: number;
  prevSubtotal: number | null;
  assetRows: AssetRow[];
}

interface AssetRow {
  pocketAssetId: string;
  symbol: string;
  quantity: string | null;
  value: number;
  prevValue: number | null;
}

function buildRows(
  detail: SnapshotDetailData,
  prevDetail: SnapshotDetailData | undefined,
  tree: ServiceTree[]
): PocketRow[] {
  const rows: PocketRow[] = [];

  const entriesByService = new Map<string, typeof detail.entries>();
  for (const e of detail.entries) {
    const arr = entriesByService.get(e.service_id) ?? [];
    arr.push(e);
    entriesByService.set(e.service_id, arr);
  }

  const prevEntriesByService = new Map<string, typeof detail.entries>();
  if (prevDetail) {
    for (const e of prevDetail.entries) {
      const arr = prevEntriesByService.get(e.service_id) ?? [];
      arr.push(e);
      prevEntriesByService.set(e.service_id, arr);
    }
  }

  const pushRow = (serviceId: string, label: string) => {
    const entries = entriesByService.get(serviceId) ?? [];
    const prevEntries = prevEntriesByService.get(serviceId) ?? [];
    if (entries.length === 0) return;

    const subtotal = entries.reduce((s, e) => s + Number(e.amount || 0), 0);
    const prevSubtotal =
      prevEntries.length > 0
        ? prevEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
        : null;

    const assetRows: AssetRow[] = [];
    for (const e of entries) {
      if (!e.pocket_asset_id) continue;
      const prev = prevEntries.find(
        (pe) => pe.pocket_asset_id === e.pocket_asset_id
      );
      assetRows.push({
        pocketAssetId: e.pocket_asset_id,
        symbol: e.pocket_asset_id, // placeholder — replaced below when catalog is available
        quantity: e.quantity,
        value: Number(e.amount || 0),
        prevValue: prev ? Number(prev.amount || 0) : null,
      });
    }

    if (subtotal === 0 && assetRows.length === 0) return;
    rows.push({ serviceId, label, subtotal, prevSubtotal, assetRows });
  };

  for (const group of tree) {
    if (group.children.length > 0) {
      for (const child of group.children) {
        pushRow(child.id, `${group.service.name} · ${child.name}`);
      }
    } else {
      pushRow(group.service.id, group.service.name);
    }
  }

  return rows;
}

function DeltaLine({
  current,
  previous,
  sym,
}: {
  current: number;
  previous: number | null;
  sym: string;
}) {
  if (previous === null) return null;
  const diff = current - previous;
  if (diff === 0) return null;
  const up = diff > 0;
  return (
    <p
      className={
        "text-[11px] font-medium tabular-nums " +
        (up ? "text-primary" : "text-destructive")
      }
    >
      {up ? "▲" : "▼"} {formatMoney(Math.abs(diff), sym)}
    </p>
  );
}

export function SnapshotDetail({
  detail,
  prevDetail,
  tree,
  currencySymbol,
  loading,
  onEdit,
  onDelete,
}: SnapshotDetailProps) {
  if (loading && !detail) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card p-5">
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-muted/60" />
        <div className="mb-2 h-8 w-40 animate-pulse rounded bg-muted/60" />
        <div className="mb-6 h-3 w-44 animate-pulse rounded bg-muted/50" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">Could not load snapshot</p>
      </div>
    );
  }

  const total = detail.entries.reduce((s, e) => s + Number(e.amount || 0), 0);
  const prevTotal =
    prevDetail != null
      ? prevDetail.entries.reduce((s, e) => s + Number(e.amount || 0), 0)
      : null;
  const diff = prevTotal != null ? total - prevTotal : null;
  const diffPct =
    prevTotal != null && prevTotal !== 0
      ? (((total - prevTotal) / prevTotal) * 100)
      : null;

  const rows = buildRows(detail, prevDetail, tree);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {formatMonthLong(detail.month)}
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
            {formatMoney(total, currencySymbol)}
          </p>
          {diff != null && diffPct != null && diff !== 0 && (
            <p
              className={
                "mt-1 text-xs font-medium tabular-nums " +
                (diff > 0 ? "text-primary" : "text-destructive")
              }
            >
              {diff > 0 ? "▲" : "▼"} {formatMoney(Math.abs(diff), currencySymbol)}
              {" "}
              ({diffPct.toFixed(1)}%)
              {prevDetail ? ` vs ${formatMonthShort(prevDetail.month)}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Pocket list */}
      {rows.length === 0 ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">
          No entries in this snapshot.
        </div>
      ) : (
        <div>
          {rows.map((row) => (
            <div key={row.serviceId} className="border-b last:border-b-0">
              <div className="flex items-center justify-between bg-muted/30 px-5 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {row.label}
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatMoney(row.subtotal, currencySymbol)}
                  </span>
                  <DeltaLine
                    current={row.subtotal}
                    previous={row.prevSubtotal}
                    sym={currencySymbol}
                  />
                </div>
              </div>
              {row.assetRows.length > 0 && (
                <div className="divide-y divide-border/50">
                  {row.assetRows.map((ar) => (
                    <div
                      key={ar.pocketAssetId}
                      className="flex items-center gap-3 px-5 py-2"
                    >
                      <span className="w-[90px] text-xs tabular-nums text-muted-foreground">
                        {ar.quantity ? formatQty(ar.quantity) : ""}
                      </span>
                      <span className="flex-1 truncate text-xs text-muted-foreground">
                        {/* quantity is shown; label is omitted because snapshot entries don't carry symbol text */}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="text-[13px] font-medium tabular-nums text-foreground">
                          {formatMoney(ar.value, currencySymbol)}
                        </span>
                        <DeltaLine
                          current={ar.value}
                          previous={ar.prevValue}
                          sym={currencySymbol}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

Note: snapshot entries in the current schema do not carry the asset symbol/name text (only `pocket_asset_id`, `quantity`, `price`, `amount`). The detail view therefore shows quantity + value per row without a symbol label. This matches what the old view showed and avoids a cross-query lookup here. Pocket-level labels come from the services `tree`, which is plenty for navigation.

- [ ] **Step 2: Verify build**

```bash
cd apps/frontend && bun run build 2>&1 | tail -8
```
Expected: `built in <Xms>`. No errors. Component unused until Task 7.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/SnapshotDetail.tsx
git commit -m "feat(frontend): add SnapshotDetail right-panel component

Header with month, total, and delta vs previous snapshot.
Grouped pocket list styled like AssetsPage: uppercase header,
subtotal, and per-asset rows with their own delta lines.
Pure presentational component; selection and mutations live
on the parent page."
```

---

### Task 6: `SnapshotDrawer` component (create/edit form)

**Files:**
- Create: `apps/frontend/src/components/SnapshotDrawer.tsx`

- [ ] **Step 1: Create the component file**

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAllPocketAssets } from "@/hooks/useAllPocketAssets";
import { usePriceLookup } from "@/hooks/useMarketPriceLookup";
import { useSnapshots, type SnapshotDetail } from "@/hooks/useSnapshots";
import type { ServiceTree } from "@/hooks/useServices";

export type SnapshotDrawerMode =
  | { kind: "create" }
  | { kind: "edit"; snapshot: SnapshotDetail };

interface SnapshotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SnapshotDrawerMode;
  tree: ServiceTree[];
  currency: string;
  currencySymbol: string;
  onCreated?: (snapshotId: string) => void;
  onDeleted?: () => void;
}

interface SnapshotEntryInput {
  service_id: string;
  amount: number;
  pocket_asset_id?: string | null;
  quantity?: number | null;
  price?: number | null;
}

function formatMoney(value: number, sym: string): string {
  return `${sym}${Math.round(value).toLocaleString("en-US")}`;
}

function formatMonthLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function currentMonthString(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function SnapshotDrawer({
  open,
  onOpenChange,
  mode,
  tree,
  currency,
  currencySymbol,
  onCreated,
  onDeleted,
}: SnapshotDrawerProps) {
  const { summaries, createSnapshot, updateSnapshot, removeSnapshot } =
    useSnapshots();

  // Stable primitives for the reset effect — mode is a new object each render.
  const modeKind = mode.kind;
  const editingId = mode.kind === "edit" ? mode.snapshot.id : null;

  // Service classification from the tree
  const { investServiceIds, commonServices, allLeafServices } = useMemo(() => {
    const invest: string[] = [];
    const commons: { id: string; label: string }[] = [];
    const leaves: { id: string; label: string; type: string }[] = [];
    for (const group of tree) {
      const iterate =
        group.children.length > 0
          ? group.children.map((c) => ({
              id: c.id,
              label: `${group.service.name} · ${c.name}`,
              type: c.service_type,
            }))
          : [
              {
                id: group.service.id,
                label: group.service.name,
                type: group.service.service_type,
              },
            ];
      for (const leaf of iterate) {
        leaves.push(leaf);
        if (leaf.type === "common") {
          commons.push({ id: leaf.id, label: leaf.label });
        } else {
          invest.push(leaf.id);
        }
      }
    }
    return {
      investServiceIds: invest,
      commonServices: commons,
      allLeafServices: leaves,
    };
  }, [tree]);

  // Pocket assets for invest/crypto services (only used in create mode)
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

  // Form state
  const [month, setMonth] = useState(currentMonthString());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstCommonInputRef = useRef<HTMLInputElement | null>(null);

  // Ref so the reset effect can read the current mode without
  // including it in deps (parent re-renders produce a fresh mode
  // object each time, which would otherwise cause spurious resets).
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Reset form whenever the drawer opens or the identity of the
  // edited snapshot changes. Stable primitive deps only.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    const currentMode = modeRef.current;
    if (currentMode.kind === "edit") {
      setMonth(currentMode.snapshot.month);
      const next: Record<string, string> = {};
      for (const e of currentMode.snapshot.entries) {
        // Only common-pocket entries (no pocket_asset_id) go into the
        // editable state; asset entries are passed through on save as-is.
        if (!e.pocket_asset_id) {
          next[e.service_id] = e.amount;
        }
      }
      setAmounts(next);
    } else {
      setMonth(currentMonthString());
      setAmounts({});
    }
  }, [open, modeKind, editingId]);

  // Auto-focus first common-pocket input when opening
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      firstCommonInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  // Derived values
  const assetTotalByService = useMemo(() => {
    const map = new Map<string, number>();
    for (const asset of allAssets) {
      const qty = Number(asset.quantity) || 0;
      const key = asset.api_id ?? asset.symbol;
      const price = prices[key] ?? 0;
      map.set(
        asset.service_id,
        (map.get(asset.service_id) ?? 0) + qty * price
      );
    }
    return map;
  }, [allAssets, prices]);

  const runningTotal = useMemo(() => {
    if (modeKind === "create") {
      let t = 0;
      for (const id of investServiceIds) t += assetTotalByService.get(id) ?? 0;
      for (const c of commonServices)
        t += Number(amounts[c.id] || 0) || 0;
      return t;
    }
    // Edit mode: asset amounts come from stored entries; common amounts come from state
    if (mode.kind !== "edit") return 0;
    let t = 0;
    for (const e of mode.snapshot.entries) {
      if (e.pocket_asset_id) t += Number(e.amount) || 0;
    }
    for (const c of commonServices) {
      t += Number(amounts[c.id] || 0) || 0;
    }
    return t;
  }, [
    modeKind,
    investServiceIds,
    assetTotalByService,
    commonServices,
    amounts,
    mode,
  ]);

  const monthInputValue = month.slice(0, 7);

  const conflictingExisting = useMemo(() => {
    if (modeKind !== "create") return null;
    return summaries.find((s) => s.month.slice(0, 7) === monthInputValue) ?? null;
  }, [modeKind, summaries, monthInputValue]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const entries: SnapshotEntryInput[] = [];

      if (modeKind === "create") {
        // Asset entries — one row per pocket_asset
        for (const asset of allAssets) {
          const qty = Number(asset.quantity) || 0;
          const key = asset.api_id ?? asset.symbol;
          const price = prices[key] ?? 0;
          entries.push({
            service_id: asset.service_id,
            amount: qty * price,
            pocket_asset_id: asset.id,
            quantity: qty,
            price,
          });
        }
        // Common entries — one per manual input
        for (const c of commonServices) {
          const amount = parseFloat(amounts[c.id] || "0") || 0;
          entries.push({ service_id: c.id, amount });
        }
        const created = await createSnapshot(month, entries);
        if (onCreated) onCreated(created.id);
      } else if (mode.kind === "edit") {
        // Pass asset entries through unchanged
        for (const e of mode.snapshot.entries) {
          if (e.pocket_asset_id) {
            entries.push({
              service_id: e.service_id,
              amount: Number(e.amount) || 0,
              pocket_asset_id: e.pocket_asset_id,
              quantity: e.quantity != null ? Number(e.quantity) : null,
              price: e.price != null ? Number(e.price) : null,
            });
          }
        }
        // Rewrite common entries from form state
        for (const c of commonServices) {
          const amount = parseFloat(amounts[c.id] || "0") || 0;
          entries.push({ service_id: c.id, amount });
        }
        await updateSnapshot(mode.snapshot.id, entries);
      }
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (mode.kind !== "edit") return;
    const ok = window.confirm("Delete this snapshot? This can't be undone.");
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await removeSnapshot(mode.snapshot.id);
      if (onDeleted) onDeleted();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const setAmount = (id: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [id]: value }));
  };

  const canSave = !saving;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent widthClass="w-full sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>
            {modeKind === "create" ? "New snapshot" : "Edit snapshot"}
          </SheetTitle>
          <SheetDescription>
            {modeKind === "create"
              ? "Pick a month, confirm values, and save."
              : "Update common-pocket amounts or delete this snapshot."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <div className="space-y-5">
            {/* Month field */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Month
              </label>
              {modeKind === "create" ? (
                <>
                  <input
                    type="month"
                    className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={monthInputValue}
                    onChange={(e) => setMonth(`${e.target.value}-01`)}
                  />
                  {conflictingExisting && (
                    <p className="mt-1.5 text-[11px] text-destructive">
                      A snapshot already exists for this month. Saving will overwrite it.
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-1.5 rounded-md border bg-muted/40 px-3 py-2">
                  <span className="text-sm font-medium text-foreground">
                    {mode.kind === "edit"
                      ? formatMonthLong(mode.snapshot.month)
                      : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Asset pocket rows (create mode only — shows live totals) */}
            {modeKind === "create" && investServiceIds.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Holdings
                </p>
                {pricesLoading && (
                  <p className="mb-2 text-[11px] italic text-muted-foreground">
                    Fetching prices…
                  </p>
                )}
                <div className="overflow-hidden rounded-md border">
                  {allLeafServices
                    .filter((s) => s.type !== "common")
                    .map((svc) => {
                      const total = assetTotalByService.get(svc.id) ?? 0;
                      return (
                        <div
                          key={svc.id}
                          className="flex items-center justify-between border-b bg-muted/20 px-3 py-2 last:border-b-0"
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {svc.label}
                          </span>
                          <span className="text-sm font-medium tabular-nums text-foreground">
                            {total > 0
                              ? formatMoney(total, currencySymbol)
                              : "—"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Asset pocket rows (edit mode — stored subtotals) */}
            {modeKind === "edit" && mode.kind === "edit" && (
              (() => {
                const storedAssetTotals = new Map<string, number>();
                for (const e of mode.snapshot.entries) {
                  if (e.pocket_asset_id) {
                    storedAssetTotals.set(
                      e.service_id,
                      (storedAssetTotals.get(e.service_id) ?? 0) +
                        (Number(e.amount) || 0)
                    );
                  }
                }
                const rows = allLeafServices
                  .filter((s) => s.type !== "common" && storedAssetTotals.has(s.id));
                if (rows.length === 0) return null;
                return (
                  <div>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Holdings (stored)
                    </p>
                    <div className="overflow-hidden rounded-md border">
                      {rows.map((svc) => (
                        <div
                          key={svc.id}
                          className="flex items-center justify-between border-b bg-muted/20 px-3 py-2 last:border-b-0"
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {svc.label}
                          </span>
                          <span className="text-sm font-medium tabular-nums text-foreground">
                            {formatMoney(
                              storedAssetTotals.get(svc.id) ?? 0,
                              currencySymbol
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Common pocket rows — editable in both modes */}
            {commonServices.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Other pockets
                </p>
                <div className="space-y-2">
                  {commonServices.map((svc, i) => (
                    <div
                      key={svc.id}
                      className="flex items-center gap-3"
                    >
                      <label className="flex-1 truncate text-sm text-foreground">
                        {svc.label}
                      </label>
                      <input
                        ref={i === 0 ? firstCommonInputRef : null}
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        className="w-32 rounded-md border bg-background px-3 py-1.5 text-right text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="0"
                        value={amounts[svc.id] ?? ""}
                        onChange={(e) => setAmount(svc.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (i < commonServices.length - 1) {
                              const next = document.querySelectorAll<HTMLInputElement>(
                                'input[type="number"][data-snapshot-common]'
                              )[i + 1];
                              next?.focus();
                            } else if (canSave) {
                              handleSave();
                            }
                          }
                        }}
                        data-snapshot-common
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Running total */}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </span>
              <span className="text-base font-semibold tabular-nums text-foreground">
                {formatMoney(runningTotal, currencySymbol)}
              </span>
            </div>

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        </SheetBody>

        <SheetFooter>
          {modeKind === "edit" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/frontend && bun run build 2>&1 | tail -10
```
Expected: `built in <Xms>`. No errors. Drawer unused until Task 7.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/SnapshotDrawer.tsx
git commit -m "feat(frontend): add SnapshotDrawer create/edit component

Right-side drawer reusing ui/sheet.tsx. Create mode auto-fetches
prices via usePriceLookup and renders read-only holding subtotals
from current pocket_assets; common pockets are manual numeric
inputs. Edit mode shows stored subtotals and only lets users
rewrite common-pocket amounts. Delete uses window.confirm.
Running total updates live."
```

---

### Task 7: Rewrite `SnapshotsPage.tsx`

**Files:**
- Modify: `apps/frontend/src/pages/SnapshotsPage.tsx`

- [ ] **Step 1: Replace the entire file contents**

Replace `apps/frontend/src/pages/SnapshotsPage.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useServices } from "@/hooks/useServices";
import {
  useSnapshots,
  useSnapshotDetail,
  type SnapshotDetail as SnapshotDetailData,
} from "@/hooks/useSnapshots";
import { useSettings } from "@/hooks/useSettings";
import { SnapshotListRail } from "@/components/SnapshotListRail";
import { SnapshotDetail } from "@/components/SnapshotDetail";
import {
  SnapshotDrawer,
  type SnapshotDrawerMode,
} from "@/components/SnapshotDrawer";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
};

export function SnapshotsPage() {
  const { tree } = useServices();
  const { summaries, loading, removeSnapshot } = useSnapshots();
  const { settings } = useSettings();
  const currency = settings?.currency ?? "EUR";
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency;

  // Selection is id-based so it survives create/delete without reindexing.
  const [selectedId, setSelectedId] = useState<string | undefined>();

  // Default selection + recovery after delete: jump to the newest snapshot.
  useEffect(() => {
    if (loading) return;
    const present = summaries.some((s) => s.id === selectedId);
    if (!present) {
      setSelectedId(summaries[0]?.id);
    }
  }, [summaries, loading, selectedId]);

  const selectedIndex = summaries.findIndex((s) => s.id === selectedId);
  const selectedSummary = selectedIndex >= 0 ? summaries[selectedIndex] : undefined;
  const prevSummary =
    selectedIndex >= 0 ? summaries[selectedIndex + 1] : undefined;

  const { data: detail, isLoading: detailLoading } = useSnapshotDetail(
    selectedSummary?.id
  );
  const { data: prevDetail } = useSnapshotDetail(prevSummary?.id);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<SnapshotDrawerMode>({
    kind: "create",
  });

  const openCreate = () => {
    setDrawerMode({ kind: "create" });
    setDrawerOpen(true);
  };

  const openEdit = () => {
    if (!detail) return;
    setDrawerMode({ kind: "edit", snapshot: detail as SnapshotDetailData });
    setDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedSummary) return;
    const ok = window.confirm("Delete this snapshot? This can't be undone.");
    if (!ok) return;
    try {
      await removeSnapshot(selectedSummary.id);
      // Selection recovery runs via the effect above once summaries refresh.
    } catch (e) {
      // Surface via alert — this is a rare failure path. The drawer and
      // detail view don't show a persistent error banner here because
      // the delete button lives on the detail header.
      alert(
        e instanceof Error ? `Delete failed: ${e.message}` : "Delete failed"
      );
    }
  };

  const hasNoSnapshots = !loading && summaries.length === 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Snapshots</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your portfolio snapshots
          </p>
        </div>
        {!hasNoSnapshots && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New snapshot
          </Button>
        )}
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md bg-muted/50"
              />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
        </div>
      ) : hasNoSnapshots ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
            <p className="text-sm text-muted-foreground">No snapshots yet</p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create first snapshot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <SnapshotListRail
            summaries={summaries}
            selectedId={selectedId}
            currencySymbol={currencySymbol}
            onSelect={setSelectedId}
          />
          <SnapshotDetail
            detail={detail}
            prevDetail={prevDetail}
            tree={tree}
            currencySymbol={currencySymbol}
            loading={detailLoading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      <SnapshotDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        tree={tree}
        currency={currency}
        currencySymbol={currencySymbol}
        onCreated={(id) => setSelectedId(id)}
        onDeleted={() => {
          // Nothing to do — the summaries refetch + effect fallback handle it.
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/frontend && bun run build 2>&1 | tail -15
```
Expected: `built in <Xms>`. No errors. The old page's `currentIndex`, `mode === "form"`, `mode === "services"`, and `SnapshotForm` / `ServiceManager` / `Settings` imports are gone.

- [ ] **Step 3: Grep sanity**

```bash
grep -n "SnapshotForm\|ServiceManager\|Settings\|currentIndex" apps/frontend/src/pages/SnapshotsPage.tsx
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/pages/SnapshotsPage.tsx
git commit -m "feat(frontend): rewrite SnapshotsPage with two-column layout

Left rail timeline + right detail panel, driven by id-based
selection state. New snapshot / edit / delete all flow through
SnapshotDrawer. Services cog and embedded form are removed
(ServiceManager is still used by the Profile page — not deleted
here). Create flow auto-selects the new snapshot; delete flow
falls back to the newest remaining via a recovery effect."
```

---

### Task 8: Delete `SnapshotForm.tsx` and final verification

**Files:**
- Delete: `apps/frontend/src/components/SnapshotForm.tsx`

- [ ] **Step 1: Verify there are no remaining references**

```bash
grep -rn "SnapshotForm" apps/frontend/src
```
Expected: only matches inside `SnapshotForm.tsx` itself. If any other file still imports it, STOP and report as BLOCKED.

- [ ] **Step 2: Delete the file**

```bash
rm apps/frontend/src/components/SnapshotForm.tsx
```

- [ ] **Step 3: Verify build after deletion**

```bash
cd apps/frontend && bun run build 2>&1 | tail -10
```
Expected: `built in <Xms>`. No errors.

- [ ] **Step 4: Final grep sweep**

```bash
grep -rn "SnapshotForm\|Fetch Prices\|mode === \"services\"" apps/frontend/src
```
Expected: no output.

- [ ] **Step 5: Confirm `ServiceManager.tsx` is untouched and still used**

```bash
grep -rln "ServiceManager" apps/frontend/src
```
Expected: at least one match outside `ServiceManager.tsx` itself (`ProfilePage.tsx`). If only `ServiceManager.tsx` matches, something has deleted the Profile-page consumer — STOP and report.

- [ ] **Step 6: Manual smoke test**

Start the dev servers in separate terminals and open `/snapshots`:

```bash
cd apps/core && bun run dev
cd apps/market && bun run dev
cd apps/frontend && bun run dev
```

Verify on `http://localhost:5173/snapshots`:

1. Header shows title, subtitle, and `+ New snapshot` button. No settings cog.
2. Left rail shows every snapshot grouped by year, newest first, with totals and MoM deltas.
3. Clicking a rail row updates the right detail panel.
4. Right detail panel shows month, total, delta vs previous snapshot, and a grouped pocket list with per-pocket subtotals and per-asset delta lines.
5. `+ New snapshot` opens the drawer in create mode, prices auto-fetch, asset pocket rows become live totals, common pocket inputs are editable, running total updates on typing, conflict warning shows when the chosen month already exists.
6. Saving create mode selects the new snapshot in the rail.
7. Clicking `Edit` on the right panel opens the drawer in edit mode with stored values. Changing a common pocket amount and saving updates the detail view.
8. Clicking `Delete` on the right panel prompts confirm; on confirm the snapshot disappears and the newest remaining is auto-selected.
9. Navigating to `/assets`, `/dashboard`, `/analytics`, `/profile` still works — no regressions.
10. Console is clean.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/components/SnapshotForm.tsx
git commit -m "chore(frontend): delete SnapshotForm

Replaced by SnapshotDrawer. Final verification: Fetch Prices
button, Settings cog, and three-mode state machine are all gone.
ServiceManager.tsx is intentionally preserved — it is still
consumed by ProfilePage."
```

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] `cd apps/frontend && bun run build` passes clean with no new errors
- [ ] `grep -rn "SnapshotForm\|Fetch Prices" apps/frontend/src` returns nothing
- [ ] `grep -rln "ServiceManager" apps/frontend/src` returns at least two matches (the component file and its Profile consumer)
- [ ] Manual smoke: create, edit, delete, move between snapshots via the rail all work
- [ ] `/assets`, `/dashboard`, `/analytics`, `/profile` still render
- [ ] No new lint errors introduced in touched files (pre-existing errors in other files are out of scope)
