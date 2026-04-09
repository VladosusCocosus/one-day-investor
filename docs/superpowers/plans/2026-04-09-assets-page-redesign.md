# Assets Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tile-per-pocket Assets page with a grouped compact list, add a single right-side drawer for add/edit, auto-fetch prices on load, and introduce a leaves-only pocket selector.

**Architecture:** Backend gains a partial-update endpoint on `pocket_assets` so the frontend can move assets between pockets. Frontend gets a new Radix Dialog sheet wrapper, an `AssetDrawer` form, and a rewritten `AssetsPage` that derives leaf pockets from the services tree and uses a proper TanStack Query for prices (replacing the buggy `useEffect`).

**Tech Stack:** PostgreSQL, ElysiaJS, React, TanStack Query, `radix-ui` (Dialog), Tailwind CSS, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-04-09-assets-page-redesign.md`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `packages/database/pocket-assets/index.ts` | Add `updatePocketAsset(id, patch)` partial-update |
| Modify | `apps/market/src/api/pocket-assets.ts` | Add `PUT /:id` route wiring the new function |
| Modify | `apps/frontend/src/hooks/useServices.ts` | Export `getLeafPockets` helper |
| Modify | `apps/frontend/src/hooks/usePocketAssets.ts` | Add `updateAsset(id, patch)` mutation |
| Create | `apps/frontend/src/components/ui/sheet.tsx` | Radix Dialog wrapper with slide-from-right animation |
| Create | `apps/frontend/src/components/AssetDrawer.tsx` | Add/Edit drawer with asset search, pocket select, qty, preview |
| Modify | `apps/frontend/src/pages/AssetsPage.tsx` | Full rewrite: grouped compact list, header total, auto-fetch prices |
| Delete | `apps/frontend/src/components/AssetPocketCard.tsx` | Replaced by the new list layout |
| Delete | `apps/frontend/src/components/AssetSearch.tsx` | Logic folded into `AssetDrawer` |

---

### Task 1: Backend — `updatePocketAsset` partial-update DB function

**Files:**
- Modify: `packages/database/pocket-assets/index.ts`

- [ ] **Step 1: Add `updatePocketAsset` function**

Append this to `packages/database/pocket-assets/index.ts` (after `updatePocketAssetQuantity`):

```ts
export async function updatePocketAsset(
  id: string,
  patch: { service_id?: string; quantity?: number }
): Promise<PocketAsset | null> {
  const sets: string[] = [];
  const values: (string | number)[] = [];
  let i = 1;

  if (patch.service_id !== undefined) {
    sets.push(`service_id = $${i++}`);
    values.push(patch.service_id);
  }
  if (patch.quantity !== undefined) {
    sets.push(`quantity = $${i++}`);
    values.push(patch.quantity);
  }

  if (sets.length === 0) {
    // Nothing to update — just return current row
    const current = await pool.query<PocketAsset>(
      "SELECT * FROM pocket_assets WHERE id = $1",
      [id]
    );
    return current.rows[0] ?? null;
  }

  values.push(id);
  const result = await pool.query<PocketAsset>(
    `UPDATE pocket_assets SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}
```

- [ ] **Step 2: Type-check the database package**

Run: `cd packages/database && bun run typecheck 2>&1 || bunx tsc --noEmit`
Expected: No errors. If no typecheck script exists, run `bunx tsc --noEmit` from the package directory.

- [ ] **Step 3: Commit**

```bash
git add packages/database/pocket-assets/index.ts
git commit -m "feat(db): add partial-update for pocket_assets

Supports updating service_id and quantity in a single UPDATE so assets
can be moved between pockets without delete-and-recreate."
```

---

### Task 2: Backend — wire `PUT /api/pocket-assets/:id` route

**Files:**
- Modify: `apps/market/src/api/pocket-assets.ts`

- [ ] **Step 1: Import `updatePocketAsset`**

Change the import block at the top of `apps/market/src/api/pocket-assets.ts`:

```ts
import {
  findPocketAssetsByServiceId,
  addPocketAsset,
  updatePocketAssetQuantity,
  updatePocketAsset,
  removePocketAsset,
} from "@database";
```

- [ ] **Step 2: Add the `PUT /:id` route**

Insert this chain between the existing `.put("/:id/quantity", ...)` and `.delete("/:id", ...)` handlers:

```ts
  .put("/:id", async ({ user, set, params, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const patch = body as { service_id?: string; quantity?: number };
    if (patch.service_id === undefined && patch.quantity === undefined) {
      set.status = 400;
      return { error: "At least one of service_id or quantity is required" };
    }
    if (patch.quantity !== undefined && typeof patch.quantity !== "number") {
      set.status = 400;
      return { error: "quantity must be a number" };
    }
    if (patch.service_id !== undefined && typeof patch.service_id !== "string") {
      set.status = 400;
      return { error: "service_id must be a string" };
    }
    const result = await updatePocketAsset(params.id, patch);
    if (!result) {
      set.status = 404;
      return { error: "Pocket asset not found" };
    }
    return result;
  })
```

- [ ] **Step 3: Type-check the market app**

Run: `cd apps/market && bun run typecheck 2>&1 || bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Start the market app and sanity-check the endpoint**

In one terminal: `cd apps/market && bun run dev`
In another, after signing in from the frontend so you have a valid session cookie, you may verify manually from the browser devtools later when wiring the frontend. No curl test required — the endpoint will be exercised by the frontend in Task 8.

- [ ] **Step 5: Commit**

```bash
git add apps/market/src/api/pocket-assets.ts
git commit -m "feat(api): add PUT /api/pocket-assets/:id partial update

Allows moving an asset between pockets and/or updating quantity in a
single call."
```

---

### Task 3: Frontend — `getLeafPockets` helper

**Files:**
- Modify: `apps/frontend/src/hooks/useServices.ts`

- [ ] **Step 1: Add the helper**

Append this exported function at the bottom of `apps/frontend/src/hooks/useServices.ts` (after the `useServices` hook):

```ts
/**
 * Returns services that are valid pocket targets for asset rows.
 * A leaf pocket is a crypto/invest service that has no child services.
 */
export function getLeafPockets(services: Service[]): Service[] {
  const parentIds = new Set(
    services.filter((s) => s.parent_id).map((s) => s.parent_id!)
  );
  return services.filter(
    (s) =>
      (s.service_type === "crypto" || s.service_type === "invest") &&
      !parentIds.has(s.id)
  );
}

/**
 * Returns a map of service id → "Parent · Child" display label for leaves.
 * Leaves at the root level just show their own name.
 */
export function getPocketLabels(services: Service[]): Map<string, string> {
  const byId = new Map(services.map((s) => [s.id, s]));
  const labels = new Map<string, string>();
  for (const leaf of getLeafPockets(services)) {
    if (leaf.parent_id) {
      const parent = byId.get(leaf.parent_id);
      labels.set(leaf.id, parent ? `${parent.name} · ${leaf.name}` : leaf.name);
    } else {
      labels.set(leaf.id, leaf.name);
    }
  }
  return labels;
}
```

- [ ] **Step 2: Verify frontend build**

Run: `cd apps/frontend && bun run build 2>&1 | tail -5`
Expected: `built in <Xms>`. No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/hooks/useServices.ts
git commit -m "feat(frontend): add getLeafPockets and getPocketLabels helpers

Derives the list of valid asset pocket targets and their display labels
from the services tree."
```

---

### Task 4: Frontend — `updateAsset` mutation

**Files:**
- Modify: `apps/frontend/src/hooks/usePocketAssets.ts`

- [ ] **Step 1: Add the mutation and export it**

Replace the full contents of `apps/frontend/src/hooks/usePocketAssets.ts` with:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketApi } from "@/lib/market-api";
import type { AssetType } from "./useAssetCatalog";

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

export function usePocketAssets(serviceId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading: loading } = useQuery({
    queryKey: ["pocket-assets", serviceId],
    queryFn: async () => {
      const res = await marketApi.get<PocketAsset[]>(`/api/pocket-assets/${serviceId}`);
      return res.data;
    },
    enabled: !!serviceId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["pocket-assets"] });
  };

  const addMutation = useMutation({
    mutationFn: async (params: {
      service_id: string;
      asset_catalog_id?: string | null;
      symbol: string;
      name: string;
      asset_type: AssetType;
    }) => {
      const res = await marketApi.post<PocketAsset>("/api/pocket-assets", params);
      return res.data;
    },
    onSuccess: invalidateAll,
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const res = await marketApi.put<PocketAsset>(
        `/api/pocket-assets/${id}/quantity`,
        { quantity }
      );
      return res.data;
    },
    onSuccess: invalidateAll,
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { service_id?: string; quantity?: number };
    }) => {
      const res = await marketApi.put<PocketAsset>(`/api/pocket-assets/${id}`, patch);
      return res.data;
    },
    onSuccess: invalidateAll,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await marketApi.delete(`/api/pocket-assets/${id}`);
    },
    onSuccess: invalidateAll,
  });

  const addAsset = async (params: {
    service_id: string;
    asset_catalog_id?: string | null;
    symbol: string;
    name: string;
    asset_type: AssetType;
  }) => {
    return addMutation.mutateAsync(params);
  };

  const updateQuantity = async (id: string, quantity: number) => {
    return updateQuantityMutation.mutateAsync({ id, quantity });
  };

  const updateAsset = async (
    id: string,
    patch: { service_id?: string; quantity?: number }
  ) => {
    return updateAssetMutation.mutateAsync({ id, patch });
  };

  const removeAsset = async (id: string) => {
    await removeMutation.mutateAsync(id);
  };

  return { assets, loading, addAsset, updateQuantity, updateAsset, removeAsset };
}
```

- [ ] **Step 2: Verify frontend build**

Run: `cd apps/frontend && bun run build 2>&1 | tail -5`
Expected: `built in <Xms>`. No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/hooks/usePocketAssets.ts
git commit -m "feat(frontend): add updateAsset partial-update mutation

Wraps PUT /api/pocket-assets/:id so the drawer can move an asset
between pockets or update quantity in one call. Also invalidates all
pocket-assets queries on any mutation so the list view stays in sync
regardless of which service id the mutation ran under."
```

---

### Task 5: Frontend — `ui/sheet.tsx` (Radix Dialog wrapper)

**Files:**
- Create: `apps/frontend/src/components/ui/sheet.tsx`

- [ ] **Step 1: Create `sheet.tsx`**

Create `apps/frontend/src/components/ui/sheet.tsx`:

```tsx
"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

function Sheet({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-foreground/15 backdrop-blur-[1px]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

interface SheetContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  widthClass?: string
}

function SheetContent({
  className,
  widthClass = "w-full sm:max-w-[420px]",
  children,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full flex-col border-l bg-background shadow-xl outline-none",
          widthClass,
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
          "duration-200",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          data-slot="sheet-close"
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function SheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 border-b px-5 py-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SheetBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("flex-1 overflow-y-auto px-5 py-5", className)}
      {...props}
    />
  )
}

function SheetFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("flex items-center justify-between gap-2 border-t px-5 py-3", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
}
```

- [ ] **Step 2: Verify frontend build**

Run: `cd apps/frontend && bun run build 2>&1 | tail -5`
Expected: `built in <Xms>`. No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/ui/sheet.tsx
git commit -m "feat(frontend): add Sheet component wrapping Radix Dialog

Slide-in-from-right panel with header/body/footer structure. Follows
the shadcn wrapper pattern used by popover.tsx and tooltip.tsx."
```

---

### Task 6: Frontend — `AssetDrawer` component

**Files:**
- Create: `apps/frontend/src/components/AssetDrawer.tsx`

- [ ] **Step 1: Create `AssetDrawer.tsx`**

Create `apps/frontend/src/components/AssetDrawer.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Trash2, AlertTriangle } from "lucide-react";
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
import { useAssetCatalog } from "@/hooks/useAssetCatalog";
import { usePocketAssets, type PocketAsset } from "@/hooks/usePocketAssets";
import { getLeafPockets, getPocketLabels, type Service } from "@/hooks/useServices";
import type { AssetCatalog, AssetType } from "@/hooks/useAssetCatalog";
import { cn } from "@/lib/utils";

const LAST_POCKET_KEY = "assets:lastPocketId";

type Mode =
  | { kind: "add" }
  | { kind: "edit"; asset: PocketAsset };

interface AssetDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  services: Service[];
  prices: Record<string, number>;
  currencySymbol: string;
}

interface AssetSelection {
  asset_catalog_id: string | null;
  symbol: string;
  name: string;
  asset_type: AssetType;
  api_id: string | null;
}

function formatMoney(value: number, sym: string): string {
  return `${sym}${Math.round(value).toLocaleString("en-US")}`;
}

export function AssetDrawer({
  open,
  onOpenChange,
  mode,
  services,
  prices,
  currencySymbol,
}: AssetDrawerProps) {
  const { searchAssetCatalog } = useAssetCatalog();
  // usePocketAssets is called without a serviceId — we only use its mutations here.
  const { addAsset, updateAsset, removeAsset } = usePocketAssets(undefined);

  const leafPockets = useMemo(() => getLeafPockets(services), [services]);
  const pocketLabels = useMemo(() => getPocketLabels(services), [services]);

  // Form state
  const [selection, setSelection] = useState<AssetSelection | null>(null);
  const [pocketId, setPocketId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state (add mode only)
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssetCatalog[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form whenever the drawer opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    if (mode.kind === "edit") {
      const a = mode.asset;
      setSelection({
        asset_catalog_id: a.asset_catalog_id,
        symbol: a.symbol,
        name: a.name,
        asset_type: a.asset_type,
        api_id: a.api_id,
      });
      // If the asset lives on a non-leaf pocket, leave the selector empty
      // so the user is forced to pick a leaf.
      const isLeaf = leafPockets.some((p) => p.id === a.service_id);
      setPocketId(isLeaf ? a.service_id : "");
      setQuantity(String(Number(a.quantity) || 0));
      setQuery("");
      setResults([]);
      setSearched(false);
      setSearchOpen(false);
    } else {
      setSelection(null);
      const lastId = localStorage.getItem(LAST_POCKET_KEY);
      const lastIsValid = lastId && leafPockets.some((p) => p.id === lastId);
      setPocketId(lastIsValid ? lastId : leafPockets[0]?.id ?? "");
      setQuantity("");
      setQuery("");
      setResults([]);
      setSearched(false);
      setSearchOpen(false);
    }
  }, [open, mode, leafPockets]);

  // Asset search (add mode)
  const handleSearchChange = (value: string) => {
    setQuery(value);
    setSearched(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setSearchOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await searchAssetCatalog(value);
      setResults(res);
      setSearched(true);
      setSearchOpen(true);
    }, 200);
  };

  const handlePickCatalog = (asset: AssetCatalog) => {
    setSelection({
      asset_catalog_id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      asset_type: asset.asset_type,
      api_id: asset.api_id,
    });
    setQuery("");
    setResults([]);
    setSearchOpen(false);
  };

  const handleCreateCustom = () => {
    const q = query.trim();
    if (!q) return;
    setSelection({
      asset_catalog_id: null,
      symbol: q.toUpperCase(),
      name: q,
      // Default custom assets to crypto — user can always fix in catalog later.
      asset_type: "crypto",
      api_id: null,
    });
    setQuery("");
    setResults([]);
    setSearchOpen(false);
  };

  const qtyNum = Number(quantity) || 0;
  const previewKey = selection?.api_id ?? selection?.symbol ?? "";
  const previewPrice = previewKey ? prices[previewKey] : undefined;
  const previewValue =
    previewPrice != null && qtyNum > 0 ? qtyNum * previewPrice : null;

  const canSave =
    !!selection &&
    !!pocketId &&
    leafPockets.some((p) => p.id === pocketId) &&
    qtyNum > 0 &&
    !saving;

  const handleSave = async () => {
    if (!selection || !pocketId) return;
    setSaving(true);
    setError(null);
    try {
      if (mode.kind === "add") {
        const created = await addAsset({
          service_id: pocketId,
          asset_catalog_id: selection.asset_catalog_id,
          symbol: selection.symbol,
          name: selection.name,
          asset_type: selection.asset_type,
        });
        if (qtyNum > 0) {
          await updateAsset(created.id, { quantity: qtyNum });
        }
        localStorage.setItem(LAST_POCKET_KEY, pocketId);
      } else {
        const a = mode.asset;
        const patch: { service_id?: string; quantity?: number } = {};
        if (pocketId !== a.service_id) patch.service_id = pocketId;
        if (qtyNum !== Number(a.quantity)) patch.quantity = qtyNum;
        if (Object.keys(patch).length > 0) {
          await updateAsset(a.id, patch);
        }
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
    setSaving(true);
    setError(null);
    try {
      await removeAsset(mode.asset.id);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setSaving(false);
    }
  };

  const onLeafPocket =
    mode.kind === "edit" &&
    !leafPockets.some((p) => p.id === mode.asset.service_id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {mode.kind === "add" ? "Add asset" : "Edit asset"}
          </SheetTitle>
          <SheetDescription>
            {mode.kind === "add"
              ? "Search for an asset, pick a pocket, and enter the quantity."
              : "Update quantity, move to a different pocket, or delete."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <div className="space-y-5">
            {/* Asset field */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Asset
              </label>
              {mode.kind === "edit" ? (
                <div className="mt-1.5 rounded-md border bg-muted/40 px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {mode.asset.symbol}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {mode.asset.name}
                    </span>
                  </div>
                </div>
              ) : selection ? (
                <div className="mt-1.5 flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {selection.symbol}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selection.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelection(null)}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative mt-1.5">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    className="w-full rounded-md border bg-background px-3 py-2 pl-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Search assets..."
                    value={query}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                  {searchOpen && results.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-background shadow-md">
                      {results.map((asset) => (
                        <button
                          type="button"
                          key={asset.id}
                          className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
                          onClick={() => handlePickCatalog(asset)}
                        >
                          <span className="font-mono font-semibold">
                            {asset.symbol}
                          </span>
                          <span className="text-muted-foreground">
                            {asset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchOpen &&
                    searched &&
                    results.length === 0 &&
                    query.trim() && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border bg-background p-3 shadow-md">
                        <p className="text-xs text-muted-foreground">
                          No match for "{query.trim().toUpperCase()}".
                        </p>
                        <Button
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={handleCreateCustom}
                        >
                          Add as custom
                        </Button>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Pocket field */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Pocket
              </label>
              <select
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={pocketId}
                onChange={(e) => setPocketId(e.target.value)}
              >
                <option value="" disabled>
                  Select a pocket
                </option>
                {leafPockets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pocketLabels.get(p.id) ?? p.name}
                  </option>
                ))}
              </select>
              {onLeafPocket && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-destructive">
                  <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" />
                  This asset is on a non-leaf pocket — pick a sub-pocket to
                  save.
                </p>
              )}
            </div>

            {/* Quantity field */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Quantity
              </label>
              <input
                type="number"
                step="any"
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSave) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
            </div>

            {/* Live preview */}
            {selection && qtyNum > 0 && (
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Preview
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {selection.symbol}
                  </span>
                  <span className="text-sm text-foreground tabular-nums">
                    {qtyNum.toLocaleString("en-US", {
                      maximumFractionDigits: 8,
                    })}
                  </span>
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {previewValue != null
                      ? `≈ ${formatMoney(previewValue, currencySymbol)}`
                      : "—"}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        </SheetBody>

        <SheetFooter>
          {mode.kind === "edit" ? (
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
          <Button
            size="sm"
            className={cn(!canSave && "opacity-60")}
            onClick={handleSave}
            disabled={!canSave}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verify frontend build**

Run: `cd apps/frontend && bun run build 2>&1 | tail -5`
Expected: `built in <Xms>`. No errors.

Note: The build will currently succeed even though `AssetDrawer` is not yet used anywhere — that's fine; Task 7 wires it in.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/AssetDrawer.tsx
git commit -m "feat(frontend): add AssetDrawer component

Single drawer handles both Add and Edit. Includes asset search with
custom-create fallback, leaves-only pocket selector, quantity input
with Enter-to-submit, live value preview, and delete in edit mode.
Warns when editing an asset attached to a non-leaf pocket."
```

---

### Task 7: Frontend — rewrite `AssetsPage.tsx`

**Files:**
- Modify: `apps/frontend/src/pages/AssetsPage.tsx`

- [ ] **Step 1: Replace the full contents**

Replace `apps/frontend/src/pages/AssetsPage.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssetDrawer } from "@/components/AssetDrawer";
import { useServices, getLeafPockets, getPocketLabels } from "@/hooks/useServices";
import { useSettings } from "@/hooks/useSettings";
import { marketApi } from "@/lib/market-api";
import type { PocketAsset } from "@/hooks/usePocketAssets";
import { cn } from "@/lib/utils";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
};

function useAllPocketAssets(serviceIds: string[]): PocketAsset[] {
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

function useAllPrices(
  assets: PocketAsset[],
  currency: string
): Record<string, number> {
  const assetKeys = useMemo(
    () =>
      assets
        .map((a) => `${a.api_id ?? a.symbol}|${a.asset_type}`)
        .sort()
        .join(","),
    [assets]
  );

  const { data = {} } = useQuery({
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

  return data;
}

type DrawerMode =
  | { kind: "add" }
  | { kind: "edit"; asset: PocketAsset };

export function AssetsPage() {
  const { services, loading: servicesLoading } = useServices();
  const { settings } = useSettings();
  const currency = settings?.currency ?? "EUR";
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>({ kind: "add" });

  // All crypto/invest services (parents + children) so findPocketAssetsByServiceId
  // is queried for every potential holder, including legacy non-leaf holders.
  const allInvestableIds = useMemo(
    () =>
      services
        .filter(
          (s) => s.service_type === "crypto" || s.service_type === "invest"
        )
        .map((s) => s.id),
    [services]
  );

  const allAssets = useAllPocketAssets(allInvestableIds);
  const prices = useAllPrices(allAssets, currency);

  const leafPockets = useMemo(() => getLeafPockets(services), [services]);
  const pocketLabels = useMemo(() => getPocketLabels(services), [services]);

  // Group assets by service_id. A "non-leaf" service_id may appear too — we
  // render those at the bottom with a warning icon.
  const assetsByService = useMemo(() => {
    const map = new Map<string, PocketAsset[]>();
    for (const a of allAssets) {
      const arr = map.get(a.service_id) ?? [];
      arr.push(a);
      map.set(a.service_id, arr);
    }
    return map;
  }, [allAssets]);

  const rowValue = (a: PocketAsset) => {
    const price = prices[a.api_id ?? a.symbol] ?? 0;
    return (Number(a.quantity) || 0) * price;
  };

  const pocketTotal = (serviceId: string) =>
    (assetsByService.get(serviceId) ?? []).reduce(
      (s, a) => s + rowValue(a),
      0
    );

  const grandTotal = allAssets.reduce((s, a) => s + rowValue(a), 0);
  const grandAssetCount = allAssets.length;
  const grandPocketCount = leafPockets.length;

  // Non-leaf pockets that still contain assets (legacy data)
  const orphanServices = useMemo(() => {
    const leafIds = new Set(leafPockets.map((p) => p.id));
    const byId = new Map(services.map((s) => [s.id, s]));
    const orphanIds = Array.from(assetsByService.keys()).filter(
      (id) => !leafIds.has(id)
    );
    return orphanIds
      .map((id) => byId.get(id))
      .filter((s): s is NonNullable<typeof s> => !!s);
  }, [assetsByService, leafPockets, services]);

  const formatMoney = (v: number) =>
    `${currencySymbol}${Math.round(v).toLocaleString("en-US")}`;

  const openAdd = () => {
    setDrawerMode({ kind: "add" });
    setDrawerOpen(true);
  };

  const openEdit = (asset: PocketAsset) => {
    setDrawerMode({ kind: "edit", asset });
    setDrawerOpen(true);
  };

  const hasNoInvestables = !servicesLoading && leafPockets.length === 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your investment holdings
          </p>
        </div>
        {!hasNoInvestables && (
          <Button onClick={openAdd} size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add asset
          </Button>
        )}
      </div>

      {!hasNoInvestables && (
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
      ) : hasNoInvestables ? (
        <Card className="mt-6">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No crypto or invest pockets yet. Add them on the Profile page.
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
                onRowClick={openEdit}
              />
            );
          })}
          {orphanServices.map((svc) => {
            const assets = assetsByService.get(svc.id) ?? [];
            const total = pocketTotal(svc.id);
            return (
              <PocketSection
                key={svc.id}
                label={svc.name}
                total={formatMoney(total)}
                assets={assets}
                rowValue={rowValue}
                formatMoney={formatMoney}
                onRowClick={openEdit}
                warning="Non-leaf pocket — edit each asset to move it to a sub-pocket"
              />
            );
          })}
          <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </span>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {formatMoney(grandTotal)}
            </span>
          </div>
        </div>
      )}

      <AssetDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        services={services}
        prices={prices}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}

interface PocketSectionProps {
  label: string;
  total: string;
  assets: PocketAsset[];
  rowValue: (a: PocketAsset) => number;
  formatMoney: (v: number) => string;
  onRowClick: (a: PocketAsset) => void;
  warning?: string;
}

function PocketSection({
  label,
  total,
  assets,
  rowValue,
  formatMoney,
  onRowClick,
  warning,
}: PocketSectionProps) {
  return (
    <div className="border-b last:border-b-0">
      {/* Section header */}
      <div className="flex items-center justify-between bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-1.5">
          {warning && (
            <span title={warning}>
              <AlertTriangle className="h-3 w-3 text-destructive" />
            </span>
          )}
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <span className="text-xs font-medium text-foreground tabular-nums">
          {total}
        </span>
      </div>

      {/* Asset rows */}
      {assets.length === 0 ? (
        <div className="px-4 py-3 text-xs italic text-muted-foreground">
          No assets — click <span className="font-medium">Add asset</span> to
          create one
        </div>
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

```

- [ ] **Step 2: Verify frontend build**

Run: `cd apps/frontend && bun run build 2>&1 | tail -15`
Expected: `built in <Xms>`. No TypeScript errors. Bundle produced.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/AssetsPage.tsx
git commit -m "feat(frontend): rewrite AssetsPage with grouped compact list

Replaces the per-pocket tile layout with a single bordered container
of section headers + thin rows. Adds a portfolio total in the header,
per-pocket subtotals, and a grand total row. Prices auto-fetch via
TanStack Query (replacing the buggy useEffect). Clicking a row opens
the AssetDrawer in edit mode; the top-right Add asset button opens it
in add mode. Legacy assets on non-leaf pockets are rendered at the
bottom with a warning icon."
```

---

### Task 8: Frontend — delete old components, manual verification

**Files:**
- Delete: `apps/frontend/src/components/AssetPocketCard.tsx`
- Delete: `apps/frontend/src/components/AssetSearch.tsx`

- [ ] **Step 1: Verify no remaining references**

Run: `grep -rn "AssetPocketCard\|AssetSearch" apps/frontend/src`
Expected: No matches (other than the files being deleted themselves).

- [ ] **Step 2: Delete the files**

```bash
rm apps/frontend/src/components/AssetPocketCard.tsx
rm apps/frontend/src/components/AssetSearch.tsx
```

- [ ] **Step 3: Verify frontend build after deletion**

Run: `cd apps/frontend && bun run build 2>&1 | tail -5`
Expected: `built in <Xms>`. No errors.

- [ ] **Step 4: Run dev servers and manually verify**

Start backend services in separate terminals:
```bash
cd apps/core && bun run dev
cd apps/market && bun run dev
cd apps/frontend && bun run dev
```

Open `http://localhost:5173/assets` and verify:

1. **Header**: title, subtitle, portfolio total, `across N assets in M pockets` caption, and a `+ Add asset` button top-right. No Refresh button.
2. **List**: one bordered container with section headers for each leaf pocket, subtotals on the right, thin asset rows, grand total row at the bottom.
3. **Prices**: load automatically on page open, no manual refresh required.
4. **Add flow**: click `+ Add asset` → drawer slides in from the right → search for `BTC` → pick from dropdown → pick a pocket → type a quantity → preview appears → click Save → drawer closes, new row appears, grand total updates.
5. **Edit flow**: click an existing row → drawer opens prefilled → change quantity → Save → row updates.
6. **Move between pockets**: click a row → change the pocket selector → Save → row moves to the new section.
7. **Delete**: click a row → Delete button in drawer footer → row disappears.
8. **Leaves-only rule**: create a service hierarchy where `IBKR` has children `IBKR US` and `IBKR EU` on the Profile page. Return to Assets. Confirm the pocket selector in the drawer shows `IBKR · US` and `IBKR · EU` but **not** plain `IBKR`.
9. **Non-leaf edge case** (only if you already have an asset attached to a non-leaf pocket in your data): confirm it renders at the bottom with a warning icon; opening it shows the warning in the drawer and blocks save until a leaf is picked.
10. **Keyboard**: `Tab` through list rows, `Enter` opens drawer. Inside drawer: `Enter` in quantity field submits, `Esc` closes.
11. **No console errors**.

- [ ] **Step 5: Regression sweep**

Navigate to `/dashboard`, `/profile`, `/analytics`, `/snapshots`. Confirm nothing broke.

- [ ] **Step 6: Commit**

```bash
git add -A apps/frontend/src/components/AssetPocketCard.tsx apps/frontend/src/components/AssetSearch.tsx
git commit -m "chore(frontend): delete AssetPocketCard and AssetSearch

AssetPocketCard is superseded by the new grouped list layout in
AssetsPage. AssetSearch's logic is now embedded directly in
AssetDrawer. Neither has any remaining consumers."
```

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] `cd apps/frontend && bun run build` passes clean
- [ ] `grep -rn "AssetPocketCard\|AssetSearch" apps/frontend/src` returns nothing
- [ ] `grep -n "Refresh Prices" apps/frontend/src/pages/AssetsPage.tsx` returns nothing
- [ ] Manual smoke test: add, edit, move-between-pockets, delete all work
- [ ] No new lint errors in touched files (pre-existing errors in other files are out of scope)
- [ ] Dashboard, Profile, Analytics, Snapshots pages still render correctly
