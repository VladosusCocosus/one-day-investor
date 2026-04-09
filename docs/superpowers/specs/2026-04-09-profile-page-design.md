# Profile Page Design — Goal Hero

**Date:** 2026-04-09
**Status:** Approved design
**Scope:** Layout reorganization of `/profile` — keeps the emerald fintech system from AnalyticsPage but rethinks hierarchy so the goal becomes the hero.

## Problem

The current ProfilePage is three stacked sections of roughly equal visual weight — identity card, settings card, pockets list. Nothing anchors the page. The goal amount, which is the most meaningful personal-finance number on this screen, is buried inside a generic settings row alongside "Snapshot day" and "Currency".

## Goal

Give the page a hero moment driven by the user's actual financial progress, collapse the quiet settings into a smaller secondary affordance, and let pockets remain the main list content.

## Target Layout

Top-to-bottom, single column, within existing page padding. All type and color tokens come from the already-established emerald fintech system (see `AnalyticsPage.tsx` and `index.css`).

```
┌─────────────────────────────────────────┐
│ Profile                                 │  text-xl font-bold
│ Your goal, account and pockets          │  text-sm text-muted-foreground
└─────────────────────────────────────────┘
                                             mt-5
┌─ Identity strip (no Card) ──────────────┐
│  ⬤⬤  Pavel K.                            │  avatar + name + email, compact
│  ⬤⬤  pavel@example.com                   │
└─────────────────────────────────────────┘
                                             mt-4
┌─ Goal Hero (emerald gradient) ──────────┐
│  GOAL                                   │  uppercase label
│  €50,000                                │  text-3xl font-extrabold
│  ▰▰▰▰▰▱▱▱▱▱▱▱  42%                     │  progress bar + %
│  €21,240 reached                         │
└─────────────────────────────────────────┘
                                             mt-3
[ Snapshot: 1st ]  [ Currency: EUR ]         chip row
                                             mt-6
POCKETS · 4                                  eyebrow label
┌─ AddServiceSearch ──────────────────────┐
└─────────────────────────────────────────┘
                                             mt-3
┌─ PocketCard (full width) ───────────────┐
└─────────────────────────────────────────┘
┌─ PocketCard (full width) ───────────────┐
└─────────────────────────────────────────┘
```

## Sections

### 1. Page header

Unchanged from current AnalyticsPage conventions.

- Title: `<h1 className="text-xl font-bold text-foreground">Profile</h1>`
- Subtitle: `<p className="mt-1 text-sm text-muted-foreground">Your goal, account and pockets</p>` (updated copy — was "Your account, settings and pockets")

### 2. Identity strip

A compact, card-less row sitting directly on the page background. No wrapping `<Card>` — the hero below is the visual anchor, and an extra card above would dilute it.

- Container: `mt-5 flex items-center gap-3`
- Avatar: 40×40 rounded-full, gradient fallback (`from-primary to-primary/70`) with initials when no `avatar_url`, unchanged from current code
- Text block: name (`text-sm font-semibold text-foreground`) + email (`text-xs text-muted-foreground mt-0.5`)
- No dates, no side content, no actions — sign out lives in the Sidebar and stays there

### 3. Goal Hero

The emotional center of the page. An emerald gradient card with the goal amount as the biggest number on the screen, a progress bar driven by the latest snapshot total, and three visually distinct states.

**Wrapper:**
- `mt-4 rounded-xl p-5 text-white relative overflow-hidden`
- Base gradient: `bg-gradient-to-br from-primary to-primary/80` (matches `--primary` emerald token)

**Content (in-progress state):**
- Eyebrow label: `GOAL` — `text-[10px] font-bold uppercase tracking-widest text-white/75`
- Amount: `text-3xl font-extrabold tracking-tight tabular-nums` displayed as the formatted currency (`€50,000`)
- Progress track: `mt-4 h-1.5 rounded-full bg-white/25 overflow-hidden`
- Progress fill: `h-full rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]`, width = `min(100, (current / goal) * 100)%`
- Progress text: `mt-2 text-xs text-white/90 font-medium` formatted as `{formattedCurrent} · {percent}% reached`

**Inline edit (click on amount):**
- Clicking the amount turns it into an inline number input with the same size/weight as the display (`text-3xl font-extrabold`)
- Background becomes `bg-white/15`, border `border-white/30`
- Enter or blur commits via `useSettings.updateSettings({ goal: Number(v) })`
- Esc cancels
- Implemented directly in the hero JSX with a local `useState` draft — the same simple state-machine shape the old `EditableField` used (`editing`/`draft`/commit on Enter+blur). The old `EditableField` component is deleted (see "Components to modify"); no shared component is extracted because the hero is the only place this pattern now appears in ProfilePage and the styling diverges enough that sharing would just add indirection.

**States:**

| State | Condition | Rendering |
|---|---|---|
| `in-progress` | timeline has at least one snapshot AND `current < goal` | Progress bar + "€X · Y% reached" |
| `empty` | timeline has no snapshots (or returns empty) | No progress bar. Instead: `<a href="/" className="mt-3 inline-block text-xs text-white/90 underline underline-offset-2">Take your first snapshot to see progress →</a>` (links to Dashboard) |
| `reached` | timeline has snapshots AND `current >= goal` | Gradient adds a warm amber highlight: `bg-gradient-to-br from-primary via-primary to-amber-400/60`. Label row gains a reached badge: `<span className="ml-2 rounded-full border border-white/35 bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">✓ Reached</span>`. Amount displays as `{formattedCurrent}` in full size, with `<span className="ml-1 text-lg font-semibold text-white/55">/ {formattedGoal}</span>` appended. Progress bar fills to 100%. Progress text: `{percent}% · +{formattedOverage} over goal`. |

**Data source:**
- Current total = last entry of `useTimeline()` sorted by month ascending, `.total` field
- Goal = `settings.goal`
- Both already available from existing hooks — no new endpoints

### 4. Settings chips

Two small editable pills directly under the hero. They handle the remaining settings (goal already handled by the hero inline edit).

**Row:**
- `mt-3 flex flex-wrap gap-2`

**Chip (shared styling):**
- Base: `inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/80 transition-colors`
- Label span: `text-[10px] text-muted-foreground uppercase tracking-wider font-medium`
- Value span: `text-xs font-semibold text-foreground`
- Active/open variant (when its popover is open): `bg-primary/10 border-primary/35 text-primary`

**Snapshot day chip:**
- Label: `Snapshot`
- Value: `1st of month` (reuses existing `ordinal()` helper)
- Popover: number input, min 1, max 28
- Save commits via `useSettings.updateSettings({ snapshot_day: clamped })`

**Currency chip:**
- Label: `Currency`
- Value: current code (e.g. `EUR`)
- Popover: `<select>` with EUR / USD / GBP options
- Save commits via `useSettings.updateSettings({ currency: v })`

**Popover mechanics:**
- Use the existing `@/components/ui/popover` component (`Popover`, `PopoverTrigger`, `PopoverContent`)
- `PopoverTrigger` wraps each chip with `asChild`
- `PopoverContent` contains: small uppercase label, input/select, and a Save/Cancel button row (`Button` variant="default" size="sm" and variant="ghost" size="sm")
- Save closes the popover on successful mutation; Cancel closes without mutating
- Open state is tracked per-chip (two separate `useState<boolean>` values)
- No stray open-state syncing — let Popover's `open`/`onOpenChange` drive it

### 5. Pockets

Structurally unchanged from the current stacked layout. Only the eyebrow label gets a count appended.

- Eyebrow: `<div className="mt-6 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pockets · {tree.length}</div>` — adds the count, matches the eyebrow style from AnalyticsPage exactly
- Search box: `<div className="mt-2"><AddServiceSearch … /></div>` — unchanged props
- List: `<div className="mt-3 space-y-3">` with full-width `PocketCard`s (already relaxed in the current implementation)
- Empty state: `<p className="mt-3 text-sm text-muted-foreground text-center py-6">No pockets yet. Search above to add one.</p>` — unchanged
- Loading state: same placeholder as current

No changes to `PocketCard`'s internals. No changes to `AddServiceSearch`.

## Non-goals

- No new API endpoints, no new hooks
- No changes to `PocketCard`'s edit/view internals
- No changes to the Dashboard link destination (it goes to `/` which is the current snapshot page)
- No changes to Sidebar, AuthContext, sign-out placement
- No responsive layout beyond the existing single-column stack — the page is already narrow (mobile-first), so the hero, chips, and pocket list all fill the content column at every breakpoint
- No analytics events, no tracking
- No animations beyond the default Tailwind transitions on hover and the Popover's built-in enter/exit

## Components to modify

| File | Change |
|---|---|
| `apps/frontend/src/pages/ProfilePage.tsx` | Rewrite layout JSX: replace stacked Card sections with identity strip → Goal Hero → chip row → Pockets. Add `useTimeline()` import and derive `currentTotal`. Replace the three-row Settings Card with two Popover-driven chips. Add hero inline edit using a scaled-up EditableField variant. |
| `apps/frontend/src/pages/ProfilePage.tsx` (same file) | Delete the existing `EditableField` component — it's no longer used once the chips move to popovers and the goal moves to the hero. |
| No other files need changes. | |

## Reused existing code

- `Card`, `CardContent` — not used in this redesign (the hero is a styled div, chips are not carded, pockets are not wrapped in an outer card). `Card` imports can be dropped from ProfilePage.
- `Popover`, `PopoverTrigger`, `PopoverContent` from `@/components/ui/popover` — already in the repo
- `Button` from `@/components/ui/button` — for Save/Cancel in popovers
- `useAuth`, `useSettings`, `useServices`, `useCatalog` — unchanged
- `useTimeline` from `@/hooks/useAnalytics` — added import (already exists, already used by AnalyticsPage)
- `AddServiceSearch`, `PocketCard` — unchanged
- Currency formatter (`currencySymbols` map) and `ordinal()` helper — preserved

## Visual tokens (reference)

| Element | Classes |
|---|---|
| Page title | `text-xl font-bold text-foreground` |
| Page subtitle | `mt-1 text-sm text-muted-foreground` |
| Identity strip | `mt-5 flex items-center gap-3` |
| Hero wrapper | `mt-4 rounded-xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground relative overflow-hidden` |
| Hero label | `text-[10px] font-bold uppercase tracking-widest text-primary-foreground/75` |
| Hero amount | `text-3xl font-extrabold tracking-tight tabular-nums` |
| Hero progress track | `mt-4 h-1.5 rounded-full bg-primary-foreground/25 overflow-hidden` |
| Hero progress fill | `h-full rounded-full bg-primary-foreground shadow-[0_0_8px_rgba(255,255,255,0.5)]` |
| Hero progress text | `mt-2 text-xs text-primary-foreground/90 font-medium tabular-nums` |
| Chip | `inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/80 transition-colors` |
| Chip (open) | add `bg-primary/10 border-primary/35 text-primary` |
| Chip label | `text-[10px] text-muted-foreground uppercase tracking-wider font-medium` |
| Chip value | `text-xs font-semibold text-foreground` |
| Section eyebrow (Pockets) | `mt-6 text-[11px] font-medium uppercase tracking-wider text-muted-foreground` |

## Verification

1. `cd apps/frontend && bun run dev`, load `/profile`
2. Visually compare vs `/analytics` — matching header typography, matching `mt-5`/`mt-6` rhythm, matching uppercase section labels, matching emerald palette
3. Goal hero states — verify all three render correctly by toggling the timeline data (add/remove snapshots from the Dashboard), and by temporarily setting the goal below then above the latest total
4. Inline edit — click the hero goal number, type a new value, Enter saves, Esc cancels, blur saves
5. Popovers — click each chip, popover opens, input/select works, Save commits and closes, Cancel closes without mutating; opening one chip's popover does not leave the other chip's popover open
6. Pockets — `AddServiceSearch` still adds pockets (catalog + custom), `PocketCard` edit/remove/add-sub-pocket still works unchanged
7. `bunx tsc -b --noEmit` — no TS regressions
8. Mobile width (≤ 380px) — hero amount stays on one line, chips wrap cleanly, pocket cards fill the column

## Open questions

None. All design decisions are resolved.
