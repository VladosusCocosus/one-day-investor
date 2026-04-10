# Profile — Pockets Redesign

**Status:** Design approved, ready for implementation plan
**Scope:** `/profile` page, Pockets section only. Identity strip, settings chips, and `GoalHero` are untouched.

## Problem

The current Pockets section on the Profile page has two issues:

1. **Cluttered card grid.** Each pocket is a 200–280px card with a type badge, pencil icon, trash icon, and inline children list. Wrapped across a row, the page reads as a noisy tile wall. The user wants a cleaner, more information-dense presentation that reads top-to-bottom as a list.
2. **Inline click-to-edit is cramped.** Clicking the pencil morphs the card into input fields in-place, which squeezes every control (name input, type select, child rows, add-sub-pocket row, save/cancel) into the 280px-wide card footprint. The user wants editing to happen in a drawer with proper room to breathe.

## Design

### List presentation (`PocketList`)

A single flat hierarchical list, no card chrome around individual rows.

- **Section header:** "Pockets · N" label on the left (uppercase, tracked, muted — existing convention), `+` icon button on the right (24×24 rounded, `bg-muted`, emerald hover). Clicking the `+` opens the drawer in add mode.
- **Parent row:** bold name, right-aligned child count ("2"). Row height ~34px with 8–10px horizontal padding. Hover background `#f8fafc`.
- **Leaf parent row** (parent with zero children): a colored dot on the left (emerald = invest, amber = crypto, slate = common) before the name, no child count.
- **Child row:** 26px left indent, same colored dot, medium-weight name, muted color (`text-muted-foreground`).
- **No dividers between rows.** Hover background is the only separator.
- **Empty state:** centered muted text "No pockets yet. Add one to start tracking." — no illustration.
- **Whole row is clickable:**
  - Click a parent row → drawer opens in `edit` mode on that parent.
  - Click a child row → drawer opens in `edit` mode on the child's parent, with that child auto-focused inside the drawer.

### Drawer (`PocketDrawer`)

Right-side `Sheet`, `widthClass="w-full sm:max-w-[480px]"` — same convention as the existing `SnapshotDrawer`.

A single component with two modes, following the `DrawerMode` union pattern used in `AssetsPage.tsx`:

```ts
type DrawerMode =
  | { kind: "add" }
  | { kind: "edit"; parentId: string; focusChildId?: string };
```

`ProfilePage` owns `const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null)`. The drawer is open iff `drawerMode !== null`.

**Header (both modes):**
- Eyebrow: "Add pocket" (add) or "Editing pocket" (edit) — 10px uppercase tracked muted.
- Title:
  - Add mode: static "New pocket" (16px bold).
  - Edit mode: an editable `<input>` bound to the parent's draft name, styled to look like a heading (no border, transparent background, same 16px bold weight).
- Subtitle:
  - Add mode: "Search the catalog, or create a custom one".
  - Edit mode: "N sub-pockets" (or "Leaf pocket" if zero children).

**Body — add mode:**
- Renders the existing `<AddServiceSearch>` component inline. No reimplementation — the catalog autocomplete, "create custom" fallback, the inline sub-service checkbox UI, and its **own "Add" button** are all reused as-is.
- The drawer passes `onSelectCatalog` and `onCreateCustom` callbacks that wrap the existing mutations and capture the new parent id:
  - `onSelectCatalog(service, childIds)` → `const created = await subscribe(service.id, childIds)` → `setDrawerMode({ kind: "edit", parentId: created[0].id })`. (`subscribeToService` on the backend returns `Service[]` with the parent as the first element — verified in `packages/database/services/index.ts`.)
  - `onCreateCustom(name, type)` → `const parent = await addService(name, null, type)` → `setDrawerMode({ kind: "edit", parentId: parent.id })`. (`addService` already returns the created `Service` from its mutation.)
- The drawer does not close — it morphs into edit mode for the freshly-created parent, so the user can immediately add more sub-pockets. Any children preselected via the catalog checkboxes are already persisted and will render in the edit-mode children list.

**Body — edit mode:**
- If the parent is a *leaf parent* (no children), render a "Type" field above the sub-pockets section: a type pill (same visual as the child rows) showing the current type; clicking it opens the three-option popover.
- Section label: "Sub-pockets · N" (where N is the live child count from the `useServices` tree — adds and removes fire immediately and invalidate the query, so this always reflects the server state).
- Children list: each child is a row with:
  - An `<input>` for the name, 13px, bordered, editable.
  - A **type pill** on the right: a small rounded-full button showing a colored dot + label (e.g., "● invest"). Clicking it opens a popover (`Popover` primitive, already imported by other components) with three options — Common, Invest, Crypto — each with a matching dot. Selecting an option closes the popover and updates the local draft.
  - A trash icon at the far right. Clicking it calls `removeService(childId)` directly — no confirmation dialog (matches current behavior).
  - If `focusChildId` matches this row, the name input mounts with `autoFocus` and the row gets an emerald ring (`ring-2 ring-primary/40`) for ~800 ms after mount, then fades via a CSS transition, so the user can see where focus landed.
- Dashed "+ Add sub-pocket" row at the bottom of the list. Clicking it pushes a new draft row with empty name and default type `common`. Typing a name and either pressing Enter or blurring with non-empty content calls `addService(name, parentId, type)` and clears the draft row (the real child appears in the list once the query invalidates).

**Footer (both modes):**
- Left slot:
  - Add mode: empty.
  - Edit mode: destructive "Delete pocket" button (`btn-danger` styling — red text, red-100 border, white background). Clicking it calls `unsubscribe(catalog_service_id)` if the parent has one, otherwise `removeService(parentId)` — exact same branching as `ProfilePage.handleRemove` today. On success, the drawer closes.
- Right slot:
  - Add mode: only **"Cancel"** (ghost). The commit action lives inside `<AddServiceSearch>`'s own "Add" button — the drawer does not add a duplicate primary button. Cancel closes the drawer and clears any in-progress search state.
  - Edit mode: **"Cancel"** (ghost) + **"Save"** (primary). Cancel discards the parent/child field-edit drafts and closes the drawer (does not undo child additions or removals — those already fired their mutations, see State model below). Save flushes the draft via `editService(parentId, {name, service_type})` for the parent, then loops pending child field edits through `editService(childId, {...})`, and closes on success.

### State model

The drawer keeps two pieces of local state during `edit` mode:

1. **`parentDraft`** — `{ name: string; service_type: ServiceType }`, seeded from the parent. Flushed on Save.
2. **`childDrafts`** — `Map<childId, {name: string; service_type: ServiceType}>` for children whose fields were edited locally. Rows not in this map render from the live data. Flushed on Save.

Both drafts are re-seeded from the live `ServiceTree` whenever `mode.parentId` changes (including when `mode` transitions from `add` to `edit` after a successful create, and when the user opens the drawer on a different pocket). Any unsaved drafts from the previous parent are dropped on transition — Cancel/Save only apply to the currently-opened parent.

Child **additions** and **removals** bypass drafts and fire their mutations immediately — same semantics as the current `PocketCard`, because new children need IDs to be edited further. This means Cancel only discards field edits, never adds/removes.

### Data flow (unchanged)

No backend changes. No new hooks. The drawer calls the same `useServices` / `useCatalog` surface that `PocketCard` calls today:

- `addService(name, parentId, serviceType)` — add child or custom parent.
- `removeService(id)` — remove child or custom parent.
- `editService(id, {name?, service_type?})` — patch parent or child fields.
- `subscribe(catalogId, childIds)` / `unsubscribe(catalogId)` — catalog-backed parent add/remove.

React Query invalidates `["services"]` on every mutation, so the list and the drawer (both reading from the same query) stay in sync automatically.

### Component structure & file changes

**New files:**
- `apps/frontend/src/components/PocketList.tsx` — renders the hierarchical list plus the section header with the `+` button. Props: `tree: ServiceTree[]`, `loading: boolean`, `onOpenAdd: () => void`, `onOpenEdit: (parentId: string, focusChildId?: string) => void`.
- `apps/frontend/src/components/PocketDrawer.tsx` — the full drawer shell, both modes, all drafts, save/cancel/delete wiring. Props: `mode: DrawerMode | null`, `onModeChange: (mode: DrawerMode | null) => void`. Consumes `useServices`, `useCatalog` internally.
- `apps/frontend/src/components/PocketTypePill.tsx` — the small "● invest" pill + three-option `Popover`. Props: `value: ServiceType`, `onChange: (v: ServiceType) => void`. Used for both leaf-parent type and child-row type.

**Deleted files:**
- `apps/frontend/src/components/PocketCard.tsx` — fully replaced; no other consumers in the codebase.

**Modified files:**
- `apps/frontend/src/pages/ProfilePage.tsx`:
  - Removes the `AddServiceSearch` import/render from the page body (it lives inside the drawer now).
  - Removes the `tree.map((group) => <PocketCard ... />)` block and the loading/empty fallbacks around it.
  - Adds `const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null)`.
  - Renders `<PocketList tree={tree} loading={loading} onOpenAdd={...} onOpenEdit={...} />` and `<PocketDrawer mode={drawerMode} onModeChange={setDrawerMode} />`.
  - The `handleSelectCatalog`, `handleCreateCustom`, and `handleRemove` helpers move inside `PocketDrawer`.

**Untouched:**
- `apps/frontend/src/components/AddServiceSearch.tsx` — rendered inside `PocketDrawer` (add mode) without modification.
- `apps/frontend/src/components/TypeBadge.tsx` — still used elsewhere; `PocketDrawer` does not use it (it uses `PocketTypePill` instead for the interactive pill).
- All hooks, API, and backend.

### Accessibility & keyboard

- Row focus: each list row is a real `<button>` so it participates in tab order; Enter/Space opens the drawer with the same semantics as click.
- Drawer focus: when the drawer opens, the `Sheet` primitive already moves focus inside on mount. In `edit` mode with a `focusChildId`, the `autoFocus` on that child's name input wins.
- Type pill popover: radix `Popover` provides arrow-key navigation between the three options by default.
- Escape closes the drawer, same as other drawers (radix default).

### Edge cases

- **Parent has no children:** drawer renders the "Type" pill row above the sub-pockets section so the leaf can change its own type. The sub-pockets section still renders with just the "+ Add sub-pocket" row.
- **Removing the last child:** parent silently becomes a leaf and the drawer re-renders with the "Type" pill now visible. No notification, matches current implicit behavior.
- **Catalog-backed parent with children:** Delete button calls `unsubscribe(catalog_service_id)` — the children are removed server-side by the unsubscribe endpoint.
- **Custom parent (no catalog id):** Delete calls `removeService(parentId)` which cascades children via the DB constraint.
- **Add mode with failing mutation:** the drawer stays in add mode and surfaces the error (reuse whatever `AddServiceSearch` already does — no new error UI added in this spec).
- **Save with no edits:** Save button still closes the drawer without firing mutations (skip the `editService` calls if drafts equal live data).
- **Concurrent edits across tabs:** unchanged from today. The query invalidation on mutation refreshes the list; a drawer open in another tab continues to show its local draft until Save.

### Out of scope

- Reordering pockets (drag & drop). Not asked for and not currently supported.
- Bulk select / bulk delete.
- Changing `AddServiceSearch` internals. It is reused as-is.
- Any change to `GoalHero`, identity strip, or the snapshot-day / currency chips above the pockets section.
- Backend / API changes.

## Verification

- Manual: can open `/profile`, add a pocket via `+`, see the drawer transition from add → edit, add a sub-pocket inside the drawer, save, see the new parent + child in the list. Click a child row, see the drawer open with that child auto-focused. Edit a name and type, save, see the updated values. Delete a pocket from the drawer footer, see it disappear.
- Build: `bun run build` passes (frontend app).
- Lint: `bun run lint` passes with no new warnings.
- Regression: `AssetsPage`, `DashboardPage`, `AnalyticsPage` continue to render unchanged (they read the same `useServices` tree).
