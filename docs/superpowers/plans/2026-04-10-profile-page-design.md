# Profile Page Goal-Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `apps/frontend/src/pages/ProfilePage.tsx` so the user's financial goal becomes a hero card with real progress, settings collapse into two popover chips, the identity block shrinks to a compact strip, and the pockets list sits directly on the page — all inside the existing emerald fintech design system.

**Architecture:** Single-file wholesale rewrite. Three local sub-components (`GoalHero`, `SettingsChip`, and two inline editor bodies) added inside `ProfilePage.tsx`. Data comes from `useSettings` (goal, snapshot_day, currency) and `useTimeline` (latest snapshot total). No new hooks, no new endpoints, no shared component extraction.

**Tech Stack:** React 19, TypeScript, TanStack Query (already wired in `useTimeline`/`useSettings`), Radix Popover (`@/components/ui/popover`), Tailwind v4 with emerald fintech tokens from `index.css`. No test framework is configured in `apps/frontend/package.json` (scripts are `dev`, `build`, `lint`, `preview`), so verification is via `bunx tsc -b --noEmit` plus manual visual checks in `bun run dev`.

**Spec:** `docs/superpowers/specs/2026-04-09-profile-page-design.md`

## Baseline note

This plan was written against the actual current state of `ProfilePage.tsx`, which uses a **side-by-side grid** layout (User Card next to Settings Card in a 2-column grid, Pockets wrapped in a separate Card below). The spec's "target layout" is where we're going; the file contents below are what's currently there and what needs to be replaced.

The constraint from `PocketCard.tsx` (`min-w-[200px] flex-1 max-w-[280px]`) is intentional and must be preserved. This means the Pockets list continues to use `flex flex-wrap gap-3` rather than the `space-y-3` full-width stack mentioned in the spec — adapting to PocketCard's fixed card width is the right call.

---

## File Structure

Only one file changes:

- **Modify:** `apps/frontend/src/pages/ProfilePage.tsx` — wholesale rewrite. All sub-components (`GoalHero`, `SettingsChip`, editor bodies) live **inside** `ProfilePage.tsx` as local components. The spec rejects shared component extraction because these have no other consumers.

Because this is a wholesale rewrite of one focused file, the plan is structured as **one task with granular steps**, ending in a single commit. Intermediate "working" states are not meaningful here — the old `EditableField` references and the new sub-components overlap too much to split cleanly.

---

## Task 1: Wholesale rewrite of ProfilePage.tsx

**Goal of this task:** Replace the entire `ProfilePage.tsx` body with the new Goal-Hero design. After this task, the page shows: page header → compact identity strip → Goal Hero → chip row → `POCKETS · N` eyebrow → search → wrapping pocket card list.

**Files:**
- Modify: `apps/frontend/src/pages/ProfilePage.tsx`

---

- [ ] **Step 1: Read the current file**

Read `apps/frontend/src/pages/ProfilePage.tsx` end-to-end so you know what you're replacing. You do not need to preserve any of: `EditableField` sub-component, the `grid grid-cols-1 sm:grid-cols-2` layout, the User Card, the Settings Card, the Pockets Card wrapper. You **must** preserve: imports of `useAuth`, `useCatalog`, `useServices`, `useSettings`, `AddServiceSearch`, `PocketCard`, the `CatalogService`/`ServiceType` type imports, the `handleSelectCatalog`/`handleCreateCustom`/`handleRemove` handlers, the `currencySymbols` map, the `ordinal()` helper, the `initials` derivation.

- [ ] **Step 2: Replace the file contents**

Replace the **entire** contents of `apps/frontend/src/pages/ProfilePage.tsx` with this code:

```tsx
import { useState } from "react";
import { AddServiceSearch } from "@/components/AddServiceSearch";
import { PocketCard } from "@/components/PocketCard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCatalog } from "@/hooks/useCatalog";
import { useServices } from "@/hooks/useServices";
import { useSettings } from "@/hooks/useSettings";
import { useTimeline } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";
import type { CatalogService, ServiceType } from "@/hooks/useCatalog";

const currencySymbols: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function formatAmount(n: number, symbol: string): string {
  return `${symbol}${Number(n).toLocaleString()}`;
}

function formatCompact(n: number, symbol: string): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${symbol}${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `${symbol}${Math.round(n)}`;
}

function GoalHero({
  goal,
  currentTotal,
  symbol,
  onSave,
}: {
  goal: number;
  currentTotal: number | null;
  symbol: string;
  onSave: (goal: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(goal));

  const startEdit = () => {
    setDraft(String(goal));
    setEditing(true);
  };

  const commit = () => {
    const n = Number(draft);
    if (!Number.isNaN(n) && n > 0 && n !== goal) {
      onSave(n);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(String(goal));
    setEditing(false);
  };

  const reached = currentTotal !== null && currentTotal >= goal;
  const percent =
    currentTotal !== null && goal > 0
      ? Math.round((currentTotal / goal) * 100)
      : 0;
  const progressWidth = Math.min(100, percent);

  const wrapperClass = reached
    ? "mt-4 rounded-xl p-5 text-primary-foreground relative overflow-hidden bg-gradient-to-br from-primary via-primary to-amber-400/60"
    : "mt-4 rounded-xl p-5 text-primary-foreground relative overflow-hidden bg-gradient-to-br from-primary to-primary/80";

  return (
    <div className={wrapperClass}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/75">
          Goal
        </span>
        {reached && (
          <span className="rounded-full border border-primary-foreground/35 bg-primary-foreground/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
            ✓ Reached
          </span>
        )}
      </div>

      {editing ? (
        <input
          type="number"
          min={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          autoFocus
          className="mt-1 w-full bg-primary-foreground/15 border border-primary-foreground/30 rounded-md px-2 py-1 text-3xl font-extrabold tracking-tight tabular-nums text-primary-foreground outline-none"
        />
      ) : (
        <div
          onClick={startEdit}
          className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums cursor-pointer"
        >
          {reached && currentTotal !== null ? (
            <>
              {formatAmount(currentTotal, symbol)}
              <span className="ml-1 text-lg font-semibold text-primary-foreground/55">
                {" / "}
                {formatCompact(goal, symbol)}
              </span>
            </>
          ) : (
            formatAmount(goal, symbol)
          )}
        </div>
      )}

      {currentTotal === null && !editing && (
        <a
          href="/"
          className="mt-3 inline-block text-xs text-primary-foreground/90 underline underline-offset-2"
        >
          Take your first snapshot to see progress →
        </a>
      )}

      {currentTotal !== null && (
        <>
          <div className="mt-4 h-1.5 rounded-full bg-primary-foreground/25 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-foreground shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <div className="mt-2 text-xs font-medium tabular-nums text-primary-foreground/90">
            {reached
              ? `${percent}% · +${formatAmount(currentTotal - goal, symbol)} over goal`
              : `${formatAmount(currentTotal, symbol)} · ${percent}% reached`}
          </div>
        </>
      )}
    </div>
  );
}

function SettingsChip({
  label,
  displayValue,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  displayValue: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 cursor-pointer hover:bg-muted/80 transition-colors",
            open && "bg-primary/10 border-primary/35"
          )}
        >
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            {label}
          </span>
          <span className="text-xs font-semibold text-foreground">
            {displayValue}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-[220px] p-3">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function SnapshotDayEditor({
  value,
  onSave,
  onClose,
}: {
  value: number;
  onSave: (value: number) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(String(value));

  const save = () => {
    const n = Math.min(28, Math.max(1, Number(draft) || 1));
    if (n !== value) onSave(n);
    onClose();
  };

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Snapshot day
      </div>
      <input
        type="number"
        min={1}
        max={28}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onClose();
        }}
        autoFocus
        className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function CurrencyEditor({
  value,
  onSave,
  onClose,
}: {
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);

  const save = () => {
    if (draft !== value) onSave(draft);
    onClose();
  };

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Currency
      </div>
      <select
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <option value="EUR">EUR</option>
        <option value="USD">USD</option>
        <option value="GBP">GBP</option>
      </select>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const { searchCatalog, getChildren, subscribe, unsubscribe } = useCatalog();
  const { services, tree, loading, addService, removeService, editService } =
    useServices();
  const { settings, updateSettings } = useSettings();
  const { data: timeline = [] } = useTimeline();

  const [snapshotChipOpen, setSnapshotChipOpen] = useState(false);
  const [currencyChipOpen, setCurrencyChipOpen] = useState(false);

  const currentTotal =
    timeline.length > 0 ? Number(timeline[timeline.length - 1].total) : null;

  const symbol = currencySymbols[settings?.currency ?? "EUR"] ?? "\u20ac";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const handleSelectCatalog = async (
    service: CatalogService,
    childIds: string[]
  ) => {
    await subscribe(service.id, childIds);
  };

  const handleCreateCustom = async (name: string, serviceType: ServiceType) => {
    await addService(name, null, serviceType);
  };

  const handleRemove = async (id: string) => {
    const service = services.find((s) => s.id === id);
    if (service?.catalog_service_id && !service.parent_id) {
      await unsubscribe(service.catalog_service_id);
    } else {
      await removeService(id);
    }
  };

  const snapshotDay = settings?.snapshot_day ?? 1;
  const currency = settings?.currency ?? "EUR";
  const goal = Number(settings?.goal ?? 0);

  return (
    <div>
      {/* Page header */}
      <h1 className="text-xl font-bold text-foreground">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your goal, account and pockets
      </p>

      {/* Identity strip */}
      <div className="mt-5 flex items-center gap-3">
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name ?? "Avatar"}
            className="h-10 w-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">
            {user?.name ?? "User"}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {user?.email}
          </div>
        </div>
      </div>

      {/* Goal Hero */}
      <GoalHero
        goal={goal}
        currentTotal={currentTotal}
        symbol={symbol}
        onSave={(newGoal) => updateSettings({ goal: newGoal })}
      />

      {/* Settings chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <SettingsChip
          label="Snapshot"
          displayValue={`${snapshotDay}${ordinal(snapshotDay)} of month`}
          open={snapshotChipOpen}
          onOpenChange={setSnapshotChipOpen}
        >
          <SnapshotDayEditor
            value={snapshotDay}
            onSave={(snapshot_day) => updateSettings({ snapshot_day })}
            onClose={() => setSnapshotChipOpen(false)}
          />
        </SettingsChip>
        <SettingsChip
          label="Currency"
          displayValue={currency}
          open={currencyChipOpen}
          onOpenChange={setCurrencyChipOpen}
        >
          <CurrencyEditor
            value={currency}
            onSave={(newCurrency) => updateSettings({ currency: newCurrency })}
            onClose={() => setCurrencyChipOpen(false)}
          />
        </SettingsChip>
      </div>

      {/* Pockets */}
      <div className="mt-6 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Pockets · {tree.length}
      </div>
      <div className="mt-2">
        <AddServiceSearch
          searchCatalog={searchCatalog}
          getChildren={getChildren}
          onSelectCatalog={handleSelectCatalog}
          onCreateCustom={handleCreateCustom}
        />
      </div>
      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground text-center py-6">
          Loading...
        </p>
      ) : tree.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground text-center py-6">
          No pockets yet. Search above to add one.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-3">
          {tree.map((group) => (
            <PocketCard
              key={group.service.id}
              group={group}
              onEdit={editService}
              onRemove={handleRemove}
              onAddChild={async (name, parentId, serviceType) => {
                await addService(name, parentId, serviceType);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

This replaces the file wholesale. Key notes:

- **`Card`/`CardContent` imports are gone** — nothing on the page uses them anymore.
- **`EditableField` sub-component is gone** — replaced by the hero's inline edit and the two popover editors.
- **Pockets list uses `flex flex-wrap gap-3`** (not `space-y-3`) because `PocketCard` has fixed-width constraints (`min-w-[200px] flex-1 max-w-[280px]`) that are intentional and must not be touched.
- **Identity avatar uses `from-primary to-primary/70`** (emerald) instead of the old `from-indigo-500 to-violet-500` to match the new design system.
- **No test file is added** — this project has no frontend test runner.

- [ ] **Step 3: Type-check**

Run from the repo root:

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

Expected: no output (clean exit). If there are errors, the most likely culprits are:
- A typo in an import path
- A stale reference to `EditableField` that shouldn't exist (the old component is fully deleted)
- `cn` not resolving — check that `@/lib/utils` exports it (it does, verified in the codebase)
- TS narrowing errors around `currentTotal` — the code uses `currentTotal !== null` inline checks specifically to make narrowing explicit; don't refactor to a `hasData` const alias

Fix any errors and re-run until clean.

- [ ] **Step 4: Lint check**

```bash
cd apps/frontend && bun run lint
```

Expected: no new errors introduced by `ProfilePage.tsx`. Pre-existing lint warnings in other files are not this task's concern — only flag errors that the reviewer would attribute to your changes.

- [ ] **Step 5: Visual verification — in-progress state**

Start the dev server if not already running:

```bash
cd apps/frontend && bun run dev
```

Open `/profile` in the browser. Verify the in-progress state (which should be the default if there are any snapshots):

- Page header reads "Profile" (text-xl font-bold) with subtitle "Your goal, account and pockets"
- Identity strip: 40×40 avatar (emerald gradient if no `avatar_url`), name, email, directly on page background (no Card wrapper)
- Goal Hero: emerald gradient card with `mt-4` spacing, big `€X,XXX` amount, progress bar filled to N%, text `€Y,YYY · N% reached`
- Two chips below: Snapshot and Currency, with correct displays (e.g., `Snapshot: 1st of month`, `Currency: EUR`)
- `POCKETS · {count}` eyebrow, search box, and wrapping pocket cards

- [ ] **Step 6: Visual verification — goal editing**

Click the hero's big number. Verify:

- It becomes an input at the same font size
- Typing a new value and pressing Enter saves it
- Typing a new value and pressing Escape cancels (value reverts)
- Typing a new value and blurring (clicking outside) saves it

Restore your original goal afterward.

- [ ] **Step 7: Visual verification — chip popovers**

Click the Snapshot chip. Verify:

- A popover opens below/near the chip
- It contains a number input, a Save button, and a Cancel button
- Typing a new value and clicking Save updates the chip display
- Clicking Cancel closes without updating
- Pressing Escape closes without updating

Do the same for the Currency chip (it uses a `<select>` with EUR/USD/GBP).

Verify that opening one chip's popover and then clicking the other chip closes the first and opens the second.

Verify that changing the currency re-formats the hero's goal symbol (e.g., switching to USD changes `€50,000` to `$50,000`).

- [ ] **Step 8: Visual verification — goal reached state**

Click the hero, set the goal to a number **below** your current total (e.g., if current is `€1,000`, set goal to `€500`). Verify:

- The gradient gains a warm amber accent on the bottom-right
- A `✓ Reached` badge appears next to the "GOAL" label
- The big number shows current amount with dimmed goal alongside (e.g., `€1,000 / €500`)
- Progress bar fills to 100%
- Progress text reads `200% · +€500 over goal`

Restore your real goal afterward.

- [ ] **Step 9: Visual verification — empty state (optional)**

If you have no snapshots yet, you'll already see this state. Otherwise, temporarily simulate it by editing `currentTotal` derivation in the file to always be `null`, reloading, then reverting:

- Progress bar is not rendered
- `Take your first snapshot to see progress →` link appears under the goal amount

Revert any temporary simulation edits before committing.

- [ ] **Step 10: Pockets CRUD regression check**

Verify nothing about the Pockets section broke:

- Search for a catalog service in `AddServiceSearch` — adding works
- Create a custom pocket — works
- Click the pencil icon on an existing pocket — edit mode works, rename and save
- Add a sub-pocket inside edit mode
- Delete a pocket

All of this should behave exactly as it did before the redesign.

- [ ] **Step 11: Commit**

Stage **only** `apps/frontend/src/pages/ProfilePage.tsx` — the working tree may have unrelated changes in other files that are not this task's concern.

```bash
git add apps/frontend/src/pages/ProfilePage.tsx
git commit -m "$(cat <<'EOF'
feat(profile): redesign as goal hero with popover chip settings

Replaces the side-by-side User/Settings grid with a stacked layout:
compact identity strip, emerald Goal Hero with inline edit and
progress driven by useTimeline, two popover-editable chips
(Snapshot, Currency), and a Pockets section with count eyebrow.
Deletes the legacy EditableField sub-component.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final verification checklist

After the task is committed, run through this end-to-end checklist:

- [ ] `cd apps/frontend && bunx tsc -b --noEmit` — clean, no errors
- [ ] `cd apps/frontend && bun run lint` — no new errors from ProfilePage.tsx
- [ ] `cd apps/frontend && bun run build` — completes successfully
- [ ] `/profile` visual matches the spec's target layout
- [ ] All three Goal Hero states render correctly (empty, in-progress, reached)
- [ ] Inline goal edit: Enter saves, Escape cancels, blur saves
- [ ] Snapshot chip popover: Save commits, Cancel/Escape discards
- [ ] Currency chip popover: Save commits, Cancel/Escape discards
- [ ] Changing currency re-formats the Goal Hero symbol
- [ ] Pockets CRUD unaffected (add catalog/custom, edit, add sub, delete)
- [ ] No touches to `PocketCard.tsx` (its width constraints remain intact)
- [ ] Mobile width (~380px): layout holds, chips wrap, pocket cards wrap
- [ ] Git log shows one clean commit matching the task
