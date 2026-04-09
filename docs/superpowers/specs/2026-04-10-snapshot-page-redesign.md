# Snapshot Page Redesign — Design Spec

**Date:** 2026-04-10
**Status:** Approved, ready for planning
**Owner:** pavel
**Branch:** `feat/snapshot-redesign` (isolated worktree at `.worktrees/snapshot-redesign`)

## Context

The current `/snapshots` page (`apps/frontend/src/pages/SnapshotsPage.tsx`) uses
a three-mode state machine:

- **view** — prev/next arrow navigation between snapshots, showing pocket
  groups with amounts and deltas vs the previous snapshot.
- **form** — a full-page `SnapshotForm` for creating or editing. Asset pockets
  require clicking a "Fetch Prices" button before the form can compute values.
- **services** — a full-page `ServiceManager` for renaming/adding/deleting
  services (duplicated with the Profile page).

Problems with the current UX:

1. Navigation is prev/next only. You can't see the full history at a glance
   or jump to a non-adjacent snapshot.
2. The "Fetch Prices" button is the same friction the user already removed
   from the Assets page. Prices should load automatically.
3. Create/edit takes over the entire page (a pattern the user already rejected
   for Assets in favor of a right-side drawer).
4. The embedded `ServiceManager` duplicates what the Profile page already
   handles — two places to manage the same thing.
5. The detail view's per-row diffs are cramped and mix service-level and
   asset-level information awkwardly.

## Goals

- Two-column layout: a chronological timeline rail on the left, detail view
  on the right. Always see history at a glance.
- Single right-side drawer for both create and edit, matching the Assets page
  pattern.
- Prices auto-fetch on drawer open (create mode) via the same TanStack Query
  price lookup used by the Assets page. No manual "Fetch Prices" button.
- Remove the embedded `ServiceManager` from this page. `ServiceManager.tsx`
  itself stays (Profile page still uses it) — only the Snapshots-side entry
  point and cog icon go.
- Extract the shared price lookup and bulk pocket-assets loader into
  dedicated hooks so `AssetsPage` and the new `SnapshotDrawer` share one path.

## Non-Goals

- No backend changes. Existing snapshot endpoints and database schema are
  sufficient.
- No change to the underlying snapshot data model (service_id, amount,
  optional pocket_asset_id/quantity/price per entry).
- No new sparkline, chart, or historical trend visualization (parked — may
  land in a follow-up if the two-column layout doesn't carry enough trend
  information).
- No deletion undo, no bulk operations, no CSV import, no month-spanning
  edits (you can't change the month of an existing snapshot — delete and
  recreate if needed).
- No migration or cleanup of historical snapshots. Existing data renders
  as-is.

---

## Page Layout

### Header strip

```
Snapshots                                            [+ New snapshot]
Track your portfolio snapshots
```

- Title + subtitle unchanged in wording.
- Right side: a single primary `+ New snapshot` button.
- **No** Settings cog. The Services management entry point on this page is
  removed.

### Two-column body

```
grid-cols-1 lg:grid-cols-[280px_1fr] gap-6
```

- **Left rail** (280px on large screens, full-width and stacked on mobile):
  bordered container holding the timeline list. Scrollable.
- **Right panel**: bordered container holding the detail view of the currently
  selected snapshot. Grows to fill remaining width.
- Height of the two columns naturally matches their content; neither is
  force-stretched.

### Empty state

Replaces both columns with a single centered card (same pattern as today):

```
┌───────────────────────────────────────┐
│  No snapshots yet                     │
│  [+ Create first snapshot]            │
└───────────────────────────────────────┘
```

The `+ New snapshot` button in the header strip is hidden in this state —
only the centered CTA is shown.

### Loading state

Both columns render skeleton blocks until `useSnapshots()` resolves:

- Left rail: four muted row placeholders.
- Right panel: a taller placeholder block.

---

## Left Rail — Timeline List

Chronological list of snapshots, newest first. Each snapshot is a clickable
row, keyboard-focusable, one row per snapshot.

### Row content

```
┌──────────────────────────┐
│ MAR 2026       €42,318   │   ← active: bg-primary, primary-foreground text
│                ▲ 3.2%    │
├──────────────────────────┤
│ Feb 2026       €40,997   │   ← idle: hover:bg-muted/40
│                ▲ 1.8%    │
├──────────────────────────┤
│ Jan 2026       €40,273   │
│                ▼ 0.4%    │
└──────────────────────────┘
```

- Top line: month label (`text-[11px] font-semibold uppercase tracking-wider`
  on active row; `text-sm font-medium` title-case on idle rows) and the
  snapshot total on the right (`tabular-nums`).
- Second line: MoM delta vs the previous snapshot in the list (`▲ 3.2%`
  emerald = `text-primary`, `▼ 0.4%` destructive). Oldest snapshot has no
  delta line — leave the second line empty to preserve row height.
- Whole row is a `<button type="button">`. Click or Enter selects.
- Fixed row height (approx `h-14`) so the list scrolls cleanly.

### Year grouping

A small sticky year header separates years when the list spans multiple:

```
──── 2026 ────
  Mar 2026  €42,318  ▲ 3.2%
  Feb 2026  €40,997  ▲ 1.8%
  Jan 2026  €40,273  ▼ 0.4%
──── 2025 ────
  Dec 2025  €40,435
  Nov 2025  €39,812
```

Year labels are muted, uppercase, non-interactive, do not contribute to
scroll math.

### Scroll behavior

- Max height: `max-h-[calc(100vh-12rem)]` (roughly viewport minus header).
- `overflow-y-auto`.
- On first load (and after delete), the newest snapshot is auto-selected.

### No per-row actions

No edit, no delete, no overflow menu on individual rows. All mutating actions
live in the drawer, reached via the right panel's Edit button.

---

## Right Panel — Detail View

Shows the currently selected snapshot.

### Header block

```
March 2026                          [Edit]  [Delete]
€42,318
▲ €1,321 (3.2%) vs Feb 2026
```

- Month title: `text-base font-semibold text-foreground`, full month name.
- Total: `text-2xl font-semibold tabular-nums`.
- Delta line: `▲`/`▼` + absolute + percent + "vs <prev month>". Colour rules
  match the left rail (`text-primary` up, `text-destructive` down). Hidden if
  there's no previous snapshot.
- Right side:
  - `Edit` — primary ghost button, opens the drawer in edit mode.
  - `Delete` — destructive ghost button, opens a `window.confirm()` dialog
    and on confirm calls `removeSnapshot(id)`.

### Pocket list

Styled like the Assets page's grouped compact list for visual consistency:

```
────────────────────────────────────
 BINANCE                  €12,480
  BTC     0.12            €9,230
          ▲ €820
  ETH     1.10            €3,250
          ▼ €140
 IBKR · US                €18,900
  VOO     22              €11,420
  MSFT    15              €7,480
 CASH                     €10,938
          ▲ €200
────────────────────────────────────
```

- **Pocket header row**: uppercase small-caps label with `Parent · Child`
  nesting for leaves, pocket subtotal on the right (bold, tabular-nums).
- **Asset rows** render for snapshots that captured per-asset data (where
  `pocket_asset_id` is non-null on the entry):
  - `symbol` (mono, emerald), `quantity`, `value`.
  - Below the value: a small delta line showing change vs the previous
    snapshot for the **same** `pocket_asset_id`. If the previous snapshot
    didn't have that asset, omit the delta rather than show a misleading
    `+100%`.
- **Common pocket rows** (no asset children, entry has no `pocket_asset_id`):
  show only the pocket header row and a small delta under the subtotal.
- Rows are **read-only**. Not clickable. Editing happens in the drawer.
- Pockets with zero value and no matching entries are hidden entirely
  (matches current behavior).

### Pocket iteration order

The detail view iterates the full `tree` from `useServices()` (parents with
children grouped, leaves rendered inside parents) — same traversal the
current page uses. No leaves-only filtering here because common pockets are
valid snapshot targets even though they're not in the Assets page selector.

### Loading and error

- While `useSnapshotDetail(selectedId)` is fetching: pocket list shows three
  skeleton rows; header total shows `—`.
- On error: muted `Could not load snapshot` text replaces the pocket list.
  The Edit and Delete buttons stay functional (Delete still works because we
  already have the id; Edit opens the drawer with an empty prefill).

---

## The Snapshot Drawer

Single `SnapshotDrawer` component handles both **create** and **edit** modes.
Reuses the existing `ui/sheet.tsx` wrapper that the Assets drawer already
uses.

### Shell

- Slide-in from the right, ~480px wide (`w-full sm:max-w-[480px]` — wider
  than the Assets drawer since the form has more rows).
- Dimmed backdrop, click-to-close.
- Header: `New snapshot` or `Edit snapshot` + close (✕).
- Body: scrollable form (below).
- Sticky footer:
  - Create mode: `Save` (primary, right only).
  - Edit mode: `Delete` (destructive, left) + `Save` (primary, right).

### Body — create mode

```
Month
┌──────────────┐
│ March 2026 ▾ │   ← <input type="month">, defaults to current month
└──────────────┘
An existing snapshot for this month will be overwritten on save.
                                   ← inline warning, only shown on conflict

────────────────────────────────────────────

 BINANCE                         €12,480    ← pocket subtotal (read-only)
  BTC       0.12    €76,916/BTC  €9,230     ← asset row, read-only
  ETH       1.10    €2,954/ETH   €3,250

 IBKR · US                       €18,900
  VOO       22      €519/VOO     €11,420
  MSFT      15      €498/MSFT    €7,480

 CASH                            [____________]   ← manual number input
 EMERGENCY FUND                   [____________]

────────────────────────────────────────────

                      Total €42,318
```

**Behavior:**

- Month input defaults to the current month (`YYYY-MM-01`).
- On open, `usePriceLookup(allAssets, currency)` fires automatically (shared
  hook — if the Assets page already warmed the cache within 5 minutes, no
  network request). Loading state is a subtle muted "Fetching prices…" above
  the pocket list. Asset row values show `—` until prices resolve.
- **Asset pocket rows** are read-only: `symbol`, `quantity` (from current
  `pocket_assets`), per-unit price, and computed value = qty × price. The
  pocket header total is the sum.
- **Common pocket rows** are manual `<input type="number" step="0.01">`
  controls. Focus lands on the first empty common input when the drawer
  opens.
- **Running total** at the bottom updates live as the user types.
- **Conflict detection**: if the chosen month matches a month already in the
  `summaries` array from `useSnapshots()`, show the inline warning line and
  proceed to overwrite on save (matches current backend behavior — the API
  already handles upsert by month).
- **Tab order**: month input → common pocket inputs in order → Save button.
- **Enter** in a common-pocket input moves focus to the next common input.
  In the last common input, Enter saves (if the form is valid).

### Body — edit mode

```
Month:  March 2026     ← read-only text, same "chip" pattern as Assets drawer

 BINANCE                         €12,480
  BTC       0.12    €76,916/BTC  €9,230
  ETH       1.10    €2,954/ETH   €3,250

 CASH                             [10,938_____]    ← still editable
 EMERGENCY FUND                   [ 5,000_____]

                      Total €42,318
```

- Month is read-only. Changing month = delete + recreate; not supported here.
- Asset pocket rows show the **stored** quantity/price/value from the
  snapshot entries. No re-fetch of live prices. Read-only.
- Common pocket rows remain editable so the user can correct typos without
  re-entering everything.
- **Save** writes only common pocket amounts back. Asset rows pass through
  unchanged (the drawer re-submits their stored `service_id`,
  `pocket_asset_id`, `quantity`, `price`, `amount` exactly as loaded).
- **Delete**: `window.confirm("Delete this snapshot? This can't be undone.")`
  — on confirm, call `removeSnapshot(mode.snapshot.id)`. After success,
  drawer closes and selection falls back to the newest remaining snapshot
  (or the empty state).

### Interactions

- `Esc` closes the drawer. If the edit form is dirty, first show a
  `window.confirm("Discard changes?")` — matches the Assets drawer pattern.
- `Save` button disabled while a save is in flight; shows "Saving…".
- Native `confirm()` is fine for both unsaved-changes and delete — cheap,
  familiar, no new dependency.

### Error handling

- Save or delete failure: inline error banner in the drawer body above the
  footer. Form stays open; values preserved.
- Price-fetch failure in create mode: inline muted error text in place of
  "Fetching prices…"; asset row values show `—`. Save still works — it just
  records zero for those assets, which is intentional (the user can always
  re-open and retry).

---

## Data & Plumbing

### Shared price lookup hook

New file: `apps/frontend/src/hooks/useMarketPriceLookup.ts`.

```ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketApi } from "@/lib/market-api";
import type { AssetType } from "./useAssetCatalog";

interface PriceableAsset {
  api_id: string | null;
  symbol: string;
  asset_type: AssetType;
}

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

- `AssetsPage` refactored to use this hook, removing its inline `useAllPrices`.
- `SnapshotDrawer` uses it in create mode.

### Shared bulk pocket-assets loader

New file: `apps/frontend/src/hooks/useAllPocketAssets.ts`.

```ts
import { useQueries } from "@tanstack/react-query";
import { marketApi } from "@/lib/market-api";
import type { PocketAsset } from "./usePocketAssets";

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

- `AssetsPage` refactored to import from here instead of its inline version.
- `SnapshotDrawer` uses the same hook. The drawer passes the set of
  crypto/invest service ids from `useServices()` (both parents and children,
  matching the current `SnapshotForm` behavior).

### Selection state on `SnapshotsPage`

- Replace the current `currentIndex: number` with `selectedId: string | undefined`.
  Indices break on create/delete; stable ids don't.
- Default `selectedId` = `summaries[0]?.id` once data loads.
- `selectedSummary = summaries.find(s => s.id === selectedId)` — drives the
  right panel.
- `prevSummary` = the next newer item after the selected (i.e. at index
  `indexOf(selectedId) + 1`, since summaries are newest-first). Used for
  delta computation.
- On delete success: `setSelectedId(summaries[0]?.id)` after the mutation
  resolves. (The query invalidation refetches summaries first.)
- On create success: `setSelectedId(createdSnapshot.id)` so the user
  immediately sees what they just saved.

### Remove the services cog

- Delete the `mode === "services"` branch from `SnapshotsPage.tsx`.
- Remove the `Settings` icon import and the cog button from the header.
- Drop `tree` from the `useServices()` destructure if no longer needed
  elsewhere in the page (it still is — the detail view and the drawer both
  iterate it).
- **Do not delete** `ServiceManager.tsx`. Grep confirms `ProfilePage.tsx`
  still imports it.

### Delete the old `SnapshotForm.tsx`

After the drawer ships and builds clean, delete `SnapshotForm.tsx`. Grep
check first: `grep -rn "SnapshotForm" apps/frontend/src` should return only
the file itself at deletion time.

### Files

**Modify:**
- `apps/frontend/src/pages/SnapshotsPage.tsx` — full rewrite (two-column
  layout, id-based selection, drawer wiring).
- `apps/frontend/src/pages/AssetsPage.tsx` — refactor to use shared hooks
  (identical behavior, no UX change).

**Create:**
- `apps/frontend/src/hooks/useMarketPriceLookup.ts` — shared price lookup.
- `apps/frontend/src/hooks/useAllPocketAssets.ts` — shared bulk loader.
- `apps/frontend/src/components/SnapshotListRail.tsx` — the left timeline
  list with year grouping.
- `apps/frontend/src/components/SnapshotDetail.tsx` — the right detail view
  (header + pocket list).
- `apps/frontend/src/components/SnapshotDrawer.tsx` — the create/edit drawer.

**Delete:**
- `apps/frontend/src/components/SnapshotForm.tsx` — replaced by the drawer.

---

## Edge Cases

### Selection

- **First load, no snapshots**: empty state; no selection; drawer only reachable
  via the empty-state CTA (which opens create mode).
- **Create from empty state**: `+ Create first snapshot` button opens the
  drawer in create mode with the current month pre-filled.
- **After delete of the selected snapshot**: re-select `summaries[0]?.id`.
  If that was the last one, fall through to the empty state.
- **After create**: select the newly-created snapshot id so the user
  immediately sees their work on the right.

### Delta computation

- Delta for the header and for pocket rows always compares against the
  snapshot **directly after** the selected one in the (newest-first) list.
  "After" = older in time.
- If the selected snapshot is the oldest, deltas are hidden.
- Per-asset deltas are only shown when the previous snapshot has an entry
  with the same `pocket_asset_id`. No match → no delta line.

### Conflict on create

- `useSnapshots()` already exposes `summaries` with months. If the user picks
  a month that exists, show the inline warning under the month picker.
- Save proceeds (backend upserts by month).
- After save, the left rail refetches; the target snapshot is whichever one
  the backend returned.

### Price fetch failures

- `usePriceLookup` returns an empty `prices` object and `loading: false` on
  error (TanStack Query's default behavior). The drawer displays `—` for
  asset values and a muted error text near the header.
- Save is still allowed; asset entries will be recorded as `amount: 0` with
  the current `quantity` and `price: 0`. The user can re-edit once prices
  come back.

### Keyboard

- Left rail rows are focusable; `Enter` selects.
- Right panel Edit button is focusable; `Enter` opens drawer.
- Inside the drawer, `Tab` moves through month input (create only), then
  each common-pocket input top-to-bottom, then Save. `Enter` on the last
  common input saves.
- `Esc` closes the drawer (with dirty-form confirm in edit mode).

### Mobile

- Under `lg` breakpoint, the grid collapses: the left rail becomes a
  horizontal scroll strip (or stays vertical above the detail — pick the
  simpler vertical stack). Drawer becomes full-width.
- Manual verification only; no special breakpoints beyond `lg`.

---

## Verification

1. **Build**: `cd apps/frontend && bun run build` passes clean with no new
   TypeScript errors.
2. **Grep sweep**:
   - `grep -rn "SnapshotForm" apps/frontend/src` returns nothing after cleanup.
   - `grep -rn "Fetch Prices" apps/frontend/src` returns nothing.
   - `grep -rn "mode === \"services\"" apps/frontend/src` returns nothing.
3. **Manual smoke test** (`bun run dev`, visit `/snapshots`):
   - Header renders with title + `+ New snapshot` button (no cog).
   - Left rail lists every snapshot with correct totals and deltas.
   - Clicking a rail row updates the right panel.
   - Right panel shows total, delta vs previous, pocket list with per-pocket
     subtotals and correct per-asset deltas.
   - `+ New snapshot` opens the drawer in create mode. Prices auto-fetch.
     Common inputs are editable; asset rows are read-only computed totals.
     Running total updates live. Save closes the drawer and selects the new
     snapshot in the rail.
   - Picking an already-existing month shows the overwrite warning and still
     saves correctly.
   - `Edit` on the right panel opens the drawer in edit mode with stored
     values. Changing a common pocket amount and saving updates the detail
     view.
   - `Delete` prompts confirm; on confirm the snapshot disappears and the
     newest remaining is auto-selected.
4. **Regression**: Assets page still works after the shared hooks refactor
   (grouped list, drawer, add/edit/delete flows — identical to before).
5. **Dashboard / Analytics / Profile pages** render without errors.
