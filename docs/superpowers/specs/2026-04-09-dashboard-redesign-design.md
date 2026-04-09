# Dashboard Redesign — Hero Sparkline

**Status:** Approved design, ready for implementation plan
**Date:** 2026-04-09
**Context:** `apps/frontend` — replaces the current plain-text DashboardPage with an emerald-fintech "home base" layout.

## Problem

The current `DashboardPage` is visually flat: three basic KPI cards (Total Assets, Monthly Change, Months Tracked) plus a snapshot history table. Meanwhile `AnalyticsPage` has a polished visual system (donut + area chart, emerald palette, refined KPI strip).

The dashboard should be the app's **home base**: a visually rich overview that doubles as a launcher for the main workflows. It should feel *different from*, not a subset of, the analytics page.

## Goals

1. Adopt the analytics visual language (emerald fintech palette, card typography, chart system).
2. Embed distribution donut + portfolio timeline charts on the dashboard — always showing the latest month, **no month picker**.
3. Add a visually dominant "hero" element that differentiates dashboard from analytics.
4. Provide a quick-navigation row for the 4 most common actions.
5. Extract chart code from `AnalyticsPage` into reusable components so both pages stay visually identical.

## Non-goals

- No changes to the `AnalyticsKpiStrip` component (stays on analytics page unchanged).
- No refactor of hooks, API routes, or data shapes.
- No new routes or navigation structure.
- No changes to Analytics page behavior — only its internal JSX is extracted into shared components.

## Visual composition

```
┌─────────────────────────────────────────────────────────┐
│  GOOD EVENING, PAVEL                                    │
│  €127,450   ↑ 4.2% vs prev month    ╭─── sparkline ──╮  │  ← Hero card (full width)
│                                     │  interactive    │  │
│                                     ╰─────────────────╯  │
└─────────────────────────────────────────────────────────┘
┌── ⛁ Add asset ── ◈ Add pocket ── ◉ Snapshot ── ▣ Analytics ──┐  ← Pill bar (equal-width)
└──────────────────────────────────────────────────────────────┘
┌─── Services ───┐  ┌─── Largest ────────────┐
│      8         │  │   Revolut              │                   ← Meta chips
│ tracked        │  │   32% of portfolio     │
└────────────────┘  └────────────────────────┘
┌── Distribution (1.2fr) ──┐  ┌──── Portfolio timeline (1.8fr) ────┐
│    donut + legend        │  │    emerald area chart              │
└──────────────────────────┘  └────────────────────────────────────┘
```

**Spacing rhythm:** `mt-6` between each row, matching AnalyticsPage.

**Mobile (< `sm`):**
- Hero stacks vertically (greeting + total above, sparkline below at full width).
- Pill bar becomes a 2×2 grid.
- Meta chips stack to a single column.
- Charts stack (donut above timeline).

## Components

### New reusable (extracted from AnalyticsPage)

#### `DistributionDonut.tsx`
- Location: `apps/frontend/src/components/DistributionDonut.tsx`
- Owns its `<Card>` wrapper, the recharts `PieChart` + `Pie` + `Cell` + `Tooltip`, center "Total" overlay, and the custom legend list.
- Props: `{ distribution: DistributionEntry[]; activeMonth: string | undefined; loading: boolean }`
- Exports the shared `CHART_COLORS` array (currently duplicated in AnalyticsPage).
- Format helpers (`formatMonthLong`, `formatAmount`, `formatCompact`) live inside the file for now.

#### `PortfolioTimelineChart.tsx`
- Location: `apps/frontend/src/components/PortfolioTimelineChart.tsx`
- Owns its `<Card>` wrapper, "Portfolio value over time" header, and the full `AreaChart` (axes, gridlines, gradient fill, tooltip).
- Props: `{ timeline: TimelineEntry[]; loading: boolean }`
- Imports `CHART_COLORS` from `DistributionDonut`.

#### `HeroSparkline.tsx`
- Location: `apps/frontend/src/components/HeroSparkline.tsx`
- Compact interactive area chart (~70px tall) intended for use *inside* the hero card. No `<Card>` wrapper.
- No axes, no gridlines, no Y scale labels. Single minimal tooltip on hover (month + value).
- Uses `CHART_COLORS[0]` + emerald gradient fill (same visual language as PortfolioTimelineChart).
- Empty state: flat gray line.
- Props: `{ timeline: TimelineEntry[]; loading: boolean }`
- Kept separate from `PortfolioTimelineChart` because sizing, chrome, and visual density differ enough that prop-configuring one component would add more complexity than a focused second component.

### New dashboard-specific

#### `DashboardHero.tsx`
- Location: `apps/frontend/src/components/DashboardHero.tsx`
- The top card. Layout: 2-column grid at `sm+`, stacked below `sm`.
- Left column: time-aware greeting (label-xs, uppercase, muted), then total value (large bold), then MoM delta badge (emerald pill with arrow, reuses the lucide `ArrowUpRight`/`ArrowDownRight` pattern from `AnalyticsKpiStrip`).
- Right column: `<HeroSparkline />`.
- Greeting: `hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"` + `, ${user?.name ?? 'there'}`.
- Empty state (`timeline.length === 0`): render "€0" for total, hide the delta badge, render `<HeroSparkline />` which shows its own flat-gray-line empty state.
- Single snapshot (`timeline.length === 1`): hide delta badge; sparkline renders a single dot (recharts handles this).
- Props: `{ timeline: TimelineEntry[]; distribution: DistributionEntry[]; user: User | null }`

#### `QuickActions.tsx`
- Location: `apps/frontend/src/components/QuickActions.tsx`
- Equal-width pill bar.
  - Desktop (`sm+`): container is `flex rounded-full border bg-card p-1.5 gap-1`.
  - Mobile (`< sm`): container is `grid grid-cols-2 gap-1.5 rounded-xl border bg-card p-1.5` — rounded pills inside a rounded rectangle so the geometry still works at narrow widths.
- 4 pills, each a `react-router-dom <Link>`:

  | Action      | Route        | Lucide icon  |
  |-------------|--------------|--------------|
  | Add asset   | `/assets`    | `Coins`      |
  | Add pocket  | `/profile`   | `Wallet`     |
  | Snapshot    | `/snapshots` | `Camera`     |
  | Analytics   | `/analytics` | `BarChart3`  |

- Pill classes: `flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors`
- Icon size: `h-4 w-4`

### Modified

#### `AnalyticsPage.tsx`
- Replaces the inline donut + area chart JSX (~190 lines, roughly lines 112–301) with:
  ```tsx
  <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1.8fr]">
    <DistributionDonut distribution={distribution} activeMonth={activeMonth} loading={distLoading} />
    <PortfolioTimelineChart timeline={timeline} loading={timelineLoading} />
  </div>
  ```
- Keeps: greeting/subtitle header, month picker, `AnalyticsKpiStrip`, all existing state and hooks.
- Removes: local `CHART_COLORS` constant (now imported from `DistributionDonut`), `formatMonthLong`, `formatAmount`, `formatCompact` helpers (moved into `DistributionDonut`; AnalyticsPage no longer needs them).
- **Visual regression:** must look pixel-identical to the current version after refactor.

#### `DashboardPage.tsx`
- Full body rewrite.
- Hooks:
  ```tsx
  const { user } = useAuth();
  const { data: timeline = [], isLoading: timelineLoading } = useTimeline();
  const latestMonth = timeline[timeline.length - 1]?.month;
  const { data: distribution = [], isLoading: distLoading } =
    useDistribution(latestMonth ? latestMonth.slice(0, 7) : undefined);
  ```
- Renders (in order): `<DashboardHero />`, `<QuickActions />`, meta-chips grid (`grid grid-cols-1 sm:grid-cols-2 gap-3`), charts grid (`grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr] gap-6`).
- Meta chips: two plain `<Card>` components rendered inline in `DashboardPage` (not a separate component — they're 10 lines total and only used here):
  - Services: `{distribution.length}` + subtitle "tracked"
  - Largest: sorted `[...distribution].sort((a,b)=>Number(b.amount)-Number(a.amount))[0]?.name ?? "—"` + subtitle `{pct}% of portfolio` or `"No data"`
- Removes: `useSnapshots` import, local `formatMonth` / `formatAmount` helpers, old 3-card KPI grid, snapshot history table.
- Keeps: only `useAuth` (for the hero greeting).

## Data wiring

All data flows through the existing hooks unchanged:

- `useTimeline()` → already returns oldest-first; last entry = latest month.
- `useDistribution(monthYYYY_MM)` → already accepts `undefined` to disable the query.

**No backend changes. No hook changes.**

### Derived values (computed inside `DashboardHero`)

- `total = distribution.reduce((s, d) => s + Number(d.amount), 0)` — same formula as `AnalyticsKpiStrip`.
- `delta` — MoM % change from the last two timeline entries. Logic is duplicated from `AnalyticsKpiStrip` (not extracted) because: (1) dashboard doesn't use `activeMonth` semantics (always latest), so the logic simplifies; (2) extraction would mean either making `AnalyticsKpiStrip` a thin wrapper or pulling ~15 lines of math into a shared helper for only two callers. Inlining is simpler and the cost is small.
- `greeting` — time-aware string, computed at render.
- `servicesCount`, `largest`, `largestPct` — computed inline in `DashboardPage` for the meta chips.

## Edge cases

| Scenario | Behavior |
|----------|----------|
| No snapshots yet (`timeline.length === 0`) | Hero shows €0 + flat gray sparkline. Delta badge hidden. Meta chips show "0 tracked" and "— No data". Donut + timeline show their "No data" empty states. Pill bar is fully functional — Snapshot pill is the natural next click. |
| Loading | `timelineLoading` / `distLoading` propagate to chart components' existing "Loading..." placeholders. Hero shows `€—` for total and hides the delta badge until loaded. |
| Single snapshot (`timeline.length === 1`) | Hero renders the total and sparkline (single dot — recharts handles this). Delta badge hidden (no prior month). |
| Missing distribution but present timeline | Total comes from distribution (= 0), but the hero still shows the sparkline from timeline data. This is a transient state and not worth special-casing. |

## Files to create / modify

**Create (5):**
- `apps/frontend/src/components/DistributionDonut.tsx`
- `apps/frontend/src/components/PortfolioTimelineChart.tsx`
- `apps/frontend/src/components/HeroSparkline.tsx`
- `apps/frontend/src/components/DashboardHero.tsx`
- `apps/frontend/src/components/QuickActions.tsx`

**Modify (2):**
- `apps/frontend/src/pages/DashboardPage.tsx` — full body rewrite
- `apps/frontend/src/pages/AnalyticsPage.tsx` — replace inline chart JSX with `<DistributionDonut />` + `<PortfolioTimelineChart />`

**Untouched (reused verbatim):**
- `apps/frontend/src/components/AnalyticsKpiStrip.tsx`
- `apps/frontend/src/components/ui/card.tsx`
- `apps/frontend/src/hooks/useAnalytics.ts`, `useAuth.ts`
- All backend / hook / API code

## Verification

1. **Type-check & build:** `cd apps/frontend && bun run build` — zero TS errors.
2. **Dashboard visual check (`/dashboard`):**
   - Time-aware greeting with user name renders.
   - Hero shows total + delta badge (when 2+ snapshots) + interactive sparkline (hover shows tooltip).
   - Pill bar: 4 equal-width pills, each links to the correct route (click each).
   - Meta chips: Services count + Largest name & percent.
   - Charts row: donut (latest-month distribution) + full timeline. Same visual language as `/analytics`.
   - No month picker visible.
3. **Analytics regression check (`/analytics`):** must look identical to the pre-refactor version. Month picker + KPI strip + same two charts.
4. **Responsive check:** at narrow width — pill bar becomes 2×2, hero stacks, charts stack.
5. **Empty-state check** (test with a zero-snapshot account if available): hero shows €0 + flat line, meta chips show "— No data", charts show "No data", pill bar still navigates correctly.

## Risks

- **Analytics regression:** the chart extraction is the main risk surface. Mitigation: verify pixel-identical output by navigating to `/analytics` after the refactor and comparing visually. The extracted components must receive identical props and render identical JSX.
- **Duplicate math in `DashboardHero` vs `AnalyticsKpiStrip`:** accepted trade-off. If this diverges in the future, extract to `lib/portfolio-stats.ts`.
- **Sparkline tooltip collisions with hero content:** the tooltip is positioned inside the hero card; if positioning is buggy, set `wrapperStyle={{ pointerEvents: 'none' }}` on the recharts `Tooltip`.
