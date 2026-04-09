# Assets Page Redesign — Design Spec

**Date:** 2026-04-09
**Status:** Approved, ready for planning
**Owner:** pavel

## Context

The current `/assets` page (`apps/frontend/src/pages/AssetsPage.tsx`) renders one
card per investable pocket ("tile" per service) with a search input and inline
asset rows inside each card. It also has a top-right "Refresh Prices" button
and a buggy `useEffect` that auto-fetches once per mount (flagged by the linter
as `react-hooks/set-state-in-effect`).

Problems with the current UX:
1. The tile-per-pocket layout feels heavy and scales poorly — once you have 6+
   pockets the page is just a stack of boxes, and you can't see portfolio totals.
2. Adding an asset requires scrolling to the right pocket first, then finding
   its tiny per-card search. There is no global "add asset" affordance.
3. Editing and deleting are split across inline handles per row, which adds
   visual noise.
4. The "Refresh Prices" button is redundant — user wants prices to refresh
   automatically when the page opens.
5. Quantity is the only field you can edit inline; moving an asset between
   pockets is impossible (requires delete-and-recreate).

## Goals

- Single top-level "Add asset" action that opens a right-side drawer.
- Same drawer component handles editing (click any row → edit drawer).
- Drawer supports moving an asset between pockets, not just changing quantity.
- Main list is a grouped compact list (no cards/tiles), with pocket section
  headers, per-pocket subtotals, and a grand total.
- Prices auto-refresh on page open via a proper TanStack Query (no manual
  button, no buggy `useEffect`).
- Pocket selection uses a **leaves-only** rule: if a service has children,
  it is not a selectable pocket; only leaf services are.

## Non-Goals

- No drag-to-reorder between pockets.
- No bulk select / bulk move.
- No CSV import.
- No per-asset price chart.
- No cost basis / P&L tracking.
- No data migration for assets currently attached to non-leaf pockets
  (they remain visible but are flagged on edit — see below).

---

## Page Layout

### Header strip

```
Assets                                              [+ Add asset]
Manage your investment holdings

€42,318
across 14 assets in 5 pockets
```

- Title + subtitle unchanged.
- Right side: single primary button `+ Add asset` (emerald `bg-primary`).
  No refresh button.
- Below the header: portfolio total shown large (`text-2xl font-semibold
  tabular-nums`), with a muted caption: `across N assets in M pockets`.

### Main list (grouped compact)

```
┌──────────────────────────────────────────────────────────┐
│  BINANCE                                       €12,480   │
│  BTC     Bitcoin                  0.12         €9,230    │
│  ETH     Ethereum                 1.10         €3,250    │
│                                                          │
│  IBKR · US                                     €18,900   │
│  VOO     Vanguard S&P 500        22            €11,420   │
│  MSFT    Microsoft                15            €7,480   │
│                                                          │
│  IBKR · EU                                     €10,938   │
│  VWCE    Vanguard FTSE            38            €10,938   │
│                                                          │
│  ────────────────────────────────                        │
│  Total                                         €42,318   │
└──────────────────────────────────────────────────────────┘
```

- Single bordered container, no per-pocket cards.
- **Pocket section header row**: uppercase small-caps label, muted background
  band, right-aligned subtotal. Nested pockets display as `PARENT · CHILD`.
- **Asset row**: `symbol` (mono, emerald) · `name` (muted) · `quantity`
  (right-aligned, `tabular-nums`) · `€ value` (right-aligned, bold,
  `tabular-nums`).
- Entire row is clickable and keyboard-focusable. `Enter` opens the drawer
  in edit mode.
- Hover state: light muted background + 2px emerald left-border accent.
- Empty pocket (no assets): section header still renders; a single ghost row
  shows `No assets — click Add to create one`.
- **Iteration order**: the list iterates all leaf pockets (from
  `getLeafPockets()`), in their existing `sort_order`, and renders a section
  header for each. If the data also contains assets assigned to a non-leaf
  pocket (see "Leaves-only edge case" below), that pocket is rendered as an
  extra section **after** the leaves with a small warning icon next to the
  name so the user can spot and fix it.
- **Grand total row** at the bottom of the container.

---

## The Asset Drawer

A single component (`AssetDrawer`) handles both Add and Edit.

### Shell

- Slide-in from the right, ~420px wide, full viewport height.
- Dimmed backdrop (`bg-foreground/10`), click-to-close.
- Header: `Add asset` or `Edit asset` + close button (✕).
- Body: form (below).
- Sticky footer:
  - Add mode: `Save` (emerald primary, right-aligned).
  - Edit mode: `Delete` (destructive variant, left-aligned) + `Save` (right).
- `Esc` closes.
- Dirty-form close guard on Edit: `Discard changes?` confirm if form is dirty.

### Form fields (top to bottom)

1. **Asset**
   - Add mode: search input with debounced dropdown, reusing the existing
     `searchAssetCatalog` logic. Dropdown shows symbol + name; selecting fills
     the field. Supports "create custom" when no match (same behavior as the
     current `AssetSearch` component).
   - Edit mode: rendered as a read-only chip (`BTC — Bitcoin`). Changing the
     asset on an existing row is not supported; user must delete and re-add.

2. **Pocket**
   - Select dropdown listing **leaves only**: any service with
     `service_type ∈ {'crypto', 'invest'}` that has no child services.
   - Options show parent prefix when nested: `IBKR · US`, `IBKR · EU`, plus
     flat leaves like `Binance`, `Kraken`.
   - Default in Add mode: last-used pocket id from `localStorage`
     (`assets:lastPocketId`), falling back to the first leaf.
   - Edit mode: prefilled with the asset's current `service_id`.

3. **Quantity**
   - Numeric input. Focus target in Add mode once asset + pocket are filled.
   - `Enter` submits.

4. **Live preview row** (muted, below the form):
   ```
   BTC   0.75   ≈ €48,230
   ```
   Updates as the user types. Uses the price cache already loaded by the page.
   Renders `—` for value if price is unknown.

### Behavior

- `Save` is disabled until all 3 fields are valid (asset + pocket + qty > 0).
- **Add**: `POST /api/pocket-assets` with `{ service_id, asset_catalog_id?,
  symbol, name, asset_type }`, then `PUT /api/pocket-assets/:id/quantity` with
  the entered value. Two calls is acceptable; matches current flow.
- **Edit**: diff against initial values.
  - Quantity changed only → `PUT /api/pocket-assets/:id/quantity`.
  - Pocket changed → **new endpoint needed** (see Backend below).
  - Both changed → run both.
- On success: drawer closes, list re-renders from invalidated queries.
- On failure: inline error below the form, drawer stays open.

### Leaves-only edge case

Existing data may contain assets attached to a non-leaf pocket (e.g. an asset
on `IBKR` before `IBKR US` / `IBKR EU` children existed). The redesign does
**not** migrate this data. Behavior:

- Such assets render in the list under their (non-leaf) pocket header —
  nothing disappears.
- Opening them in the drawer shows the pocket selector **empty** with an
  inline warning: `This asset is on a non-leaf pocket — pick a sub-pocket to
  save.`
- `Save` is blocked until the user picks a valid leaf.
- Users clean up naturally on next edit; no batch migration.

---

## Data & Plumbing

### Auto-fetching prices

Replace the broken `useEffect` + `autoFetched` state with a proper
`useQuery`:

```ts
const assetKeys = useMemo(
  () => allAssets.map(a => `${a.api_id ?? a.symbol}|${a.asset_type}`).sort().join(','),
  [allAssets]
);

const { data: prices = {} } = useQuery({
  queryKey: ['market-prices', assetKeys, currency],
  queryFn: () => fetchPrices(
    allAssets.map(a => ({ api_id: a.api_id ?? a.symbol, asset_type: a.asset_type })),
    currency
  ),
  enabled: allAssets.length > 0,
  staleTime: 5 * 60_000,
});
```

- Fetches on mount, dedupes across remounts, invalidates when holdings change.
- No manual refresh button.
- Hook wrapped in a helper if the query is reused elsewhere; otherwise inline
  in `AssetsPage`.

### `getLeafPockets` helper

In `useServices.ts`:

```ts
export function getLeafPockets(services: Service[]): Service[] {
  const parentIds = new Set(
    services.filter(s => s.parent_id).map(s => s.parent_id!)
  );
  return services.filter(s =>
    (s.service_type === 'crypto' || s.service_type === 'invest') &&
    !parentIds.has(s.id)
  );
}
```

Used by both the main list (to render section headers in order) and the
drawer's pocket selector.

### Move-between-pockets API

The current backend has `PUT /api/pocket-assets/:id/quantity` only. Moving an
asset requires updating `service_id`. Plan:

1. Check `apps/core/src/api/pocket-assets.ts` for an existing generic update
   endpoint.
2. If absent, add `PUT /api/pocket-assets/:id` accepting a partial
   `{ service_id?: string, quantity?: number }` body. Reuse the existing auth
   check. One DB UPDATE.
3. Frontend: add `updateAsset(id, patch)` mutation in `usePocketAssets` and
   call it from the drawer.

Fallback (only if adding the endpoint is blocked): delete-and-recreate in the
frontend. Rejected as default because it loses the row id and breaks any
future audit history.

### Portfolio and pocket totals

Derived in `AssetsPage`:

```ts
const rowValue = (a: PocketAsset) => {
  const price = prices[a.api_id ?? a.symbol] ?? 0;
  return Number(a.quantity) * price;
};

const pocketTotals = new Map<string, number>();
for (const a of allAssets) {
  pocketTotals.set(a.service_id, (pocketTotals.get(a.service_id) ?? 0) + rowValue(a));
}

const grandTotal = Array.from(pocketTotals.values()).reduce((s, v) => s + v, 0);
```

Subtotals rendered next to each section header, grand total at the bottom of
the container and at the top of the page.

---

## Files

### Modify

- `apps/frontend/src/pages/AssetsPage.tsx` — full rewrite: header with total,
  grouped compact list, auto-fetching prices, drawer wiring, click-to-edit.
- `apps/frontend/src/hooks/useServices.ts` — export `getLeafPockets`.
- `apps/frontend/src/hooks/usePocketAssets.ts` — add `updateAsset(id, patch)`
  mutation (partial update including `service_id` and/or `quantity`).
- `apps/core/src/api/pocket-assets.ts` — add `PUT /:id` partial-update route
  if not already present. Verify first.

### Create

- `apps/frontend/src/components/ui/sheet.tsx` — shadcn-style wrapper over the
  `radix-ui` Dialog primitive with slide-from-right animation. Follows the
  existing `popover.tsx` / `tooltip.tsx` pattern.
- `apps/frontend/src/components/AssetDrawer.tsx` — the Add/Edit drawer,
  including the embedded asset search, pocket selector, quantity input, and
  live preview row.

### Delete

- `apps/frontend/src/components/AssetPocketCard.tsx` — replaced entirely by
  the new list layout.
- `apps/frontend/src/components/AssetSearch.tsx` — logic folds into
  `AssetDrawer`. Confirm no other page imports it before deletion. A quick
  grep shows it's used only by `AssetPocketCard`, which is itself being
  deleted.

---

## Edge Cases

### Empty states
- No investable services at all → same empty-state card as today pointing to
  the Profile page. The `+ Add asset` button is hidden in this state.
- Services exist but zero assets → pocket headers still render; each with a
  single ghost row: `No assets — click Add to create one`.
- Investable services exist but none are leaves (every service has children
  that aren't of the right type — an unlikely config) → empty-state card
  tells the user to add a sub-pocket.

### Loading states
- Initial page load: 3–4 skeleton rows (muted placeholders, no layout shift).
- Prices loading: values render as `—` until the query resolves; column width
  is fixed so nothing reflows.
- Drawer save in flight: `Save` button shows spinner, form disabled.

### Error states
- Price fetch fails: keep last-known prices; subtle muted text "Prices
  unavailable" in the header area; rest of page still works.
- Drawer save fails: inline error below the footer; form stays open so input
  is not lost.

### Keyboard
- Drawer: `Esc` closes; `Enter` in quantity submits; `Tab` order follows
  top-to-bottom field order.
- List rows: focusable via `Tab`, `Enter` opens the drawer in edit mode.

### Mobile
- Drawer becomes full-width at `< 640px`.
- List row layout assumes desktop; narrow-screen stacking is nice-to-have,
  not a blocker.

### Persistence
- `localStorage['assets:lastPocketId']` stores the pocket used in the most
  recent successful Add. Read on drawer open in Add mode. Cleared (ignored) if
  the pocket no longer exists or is no longer a leaf.

### Delete confirmation
- No confirmation dialog. The delete button lives inside a drawer the user
  explicitly opened — that is already a two-step action. No toast undo in
  v1; can be added later if accidental deletes happen.

---

## Verification

1. **Dev server sanity** — `bun run dev`; visit `/assets`:
   - Header shows portfolio total and `+ Add asset` button.
   - Grouped list renders pocket headers with subtotals, asset rows, grand
     total. No cards.
   - Prices load automatically; no Refresh button visible.
   - Clicking a row opens the drawer prefilled with that asset's data.
   - Clicking `+ Add asset` opens the drawer empty.
   - Editing quantity, saving, closing — list updates.
   - Moving an asset between pockets via the pocket dropdown — list updates,
     row appears under the new pocket header.
   - Deleting from within the drawer — row disappears.

2. **Build** — `bun run build` in `apps/frontend` compiles clean.

3. **Lint** — no new lint errors introduced in the files we touch.
   (Pre-existing errors in other files are out of scope.)

4. **Regression sweep** — Dashboard, Analytics, Profile, Snapshots still
   render correctly. No stray references to deleted components.

5. **Leaves-only edge case** — if test data has an asset on a non-leaf
   pocket, opening its drawer shows the warning and blocks save until a leaf
   is chosen.
