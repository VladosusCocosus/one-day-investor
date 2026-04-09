# Dashboard Redesign (Hero Sparkline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `DashboardPage` as an emerald-fintech "home base" with a hero card (greeting + total + interactive sparkline), a 4-pill quick-actions bar, meta chips, and the analytics donut + timeline charts — while extracting the donut and area chart out of `AnalyticsPage` into reusable components.

**Architecture:** Five new components in `apps/frontend/src/components/`: three reusable chart components (`DistributionDonut`, `PortfolioTimelineChart`, `HeroSparkline`) extracted from `AnalyticsPage`, plus two dashboard-specific components (`DashboardHero`, `QuickActions`). `AnalyticsPage` is refactored to consume the extracted chart components unchanged. `DashboardPage` is rewritten to compose the new pieces.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, recharts v3, lucide-react, react-router v7, TanStack Query, shadcn Card primitive. No new dependencies. Frontend has no test runner; verification is `bun run build` + `bun run lint` + dev-server visual check.

**Spec:** `docs/superpowers/specs/2026-04-09-dashboard-redesign-design.md`

**Branch note:** You are on `main`. Confirm with the user before the first commit if that is acceptable, or create a feature branch first.

---

## Reference snippets

These blocks are lifted verbatim from `AnalyticsPage.tsx` (the current source of truth for the emerald chart visual language). Later tasks will paste them into the new component files and then delete them from `AnalyticsPage.tsx`.

### CHART_COLORS constant

```ts
// Emerald Fintech chart palette — mirrors --chart-1..6 in index.css
export const CHART_COLORS = [
  "hsl(160, 84%, 25%)", // --chart-1 emerald deep
  "hsl(160, 70%, 40%)", // --chart-2 emerald mid
  "hsl(150, 60%, 55%)", // --chart-3 green
  "hsl(170, 55%, 55%)", // --chart-4 teal
  "hsl(145, 45%, 65%)", // --chart-5 sage
  "hsl(175, 40%, 45%)", // --chart-6 deep teal
];
```

### Format helpers (used by DistributionDonut)

```ts
export function formatMonthLong(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatAmount(value: number): string {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatCompact(value: number): string {
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(1)}K`;
  }
  return `€${Math.round(value)}`;
}
```

---

## Task 1: Extract `DistributionDonut` component

**Files:**
- Create: `apps/frontend/src/components/DistributionDonut.tsx`

- [ ] **Step 1: Create the new file with the full component**

Write `apps/frontend/src/components/DistributionDonut.tsx`:

```tsx
import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { DistributionEntry } from "@/hooks/useAnalytics";

// Emerald Fintech chart palette — mirrors --chart-1..6 in index.css
export const CHART_COLORS = [
  "hsl(160, 84%, 25%)", // --chart-1 emerald deep
  "hsl(160, 70%, 40%)", // --chart-2 emerald mid
  "hsl(150, 60%, 55%)", // --chart-3 green
  "hsl(170, 55%, 55%)", // --chart-4 teal
  "hsl(145, 45%, 65%)", // --chart-5 sage
  "hsl(175, 40%, 45%)", // --chart-6 deep teal
];

export function formatMonthLong(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatAmount(value: number): string {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatCompact(value: number): string {
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(1)}K`;
  }
  return `€${Math.round(value)}`;
}

interface DistributionDonutProps {
  distribution: DistributionEntry[];
  activeMonth: string | undefined;
  loading: boolean;
}

export function DistributionDonut({
  distribution,
  activeMonth,
  loading,
}: DistributionDonutProps) {
  const sortedDistribution = useMemo(
    () =>
      [...distribution].sort((a, b) => Number(b.amount) - Number(a.amount)),
    [distribution]
  );

  const chartDistribution = sortedDistribution.map((d) => ({
    name: d.name,
    value: Number(d.amount),
  }));

  const monthTotal = chartDistribution.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Distribution
          </p>
          {activeMonth && (
            <p className="text-[11px] text-muted-foreground">
              {formatMonthLong(activeMonth)}
            </p>
          )}
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Loading...
          </p>
        ) : chartDistribution.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No data for this month
          </p>
        ) : (
          <>
            <div className="relative mt-3">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={chartDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={108}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {chartDistribution.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `€${formatAmount(Number(value))}`}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label overlay */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Total
                </span>
                <span className="mt-0.5 text-xl font-semibold text-foreground tabular-nums">
                  {formatCompact(monthTotal)}
                </span>
              </div>
            </div>

            {/* Custom legend */}
            <ul className="mt-4 space-y-2">
              {chartDistribution.map((d, i) => {
                const pct =
                  monthTotal > 0
                    ? Math.round((d.value / monthTotal) * 100)
                    : 0;
                return (
                  <li
                    key={d.name}
                    className="flex items-center gap-2.5 text-[13px]"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{
                        backgroundColor:
                          CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                    <span className="flex-1 truncate text-foreground">
                      {d.name}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {pct}%
                    </span>
                    <span className="w-20 text-right font-medium text-foreground tabular-nums">
                      €{formatAmount(d.value)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify the new file type-checks**

Run: `cd apps/frontend && bun run build`
Expected: PASS — no TypeScript errors. The file is not yet imported anywhere, so the build should still succeed (tsc `-b` only type-checks files reachable from the project, and unused exports in `src/` are still type-checked since the project includes `src/**/*.tsx`).

If you see "DistributionDonut is declared but never used" or similar unused warning, that's fine — we wire it up in Task 4.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/DistributionDonut.tsx
git commit -m "feat(frontend): extract DistributionDonut component"
```

---

## Task 2: Extract `PortfolioTimelineChart` component

**Files:**
- Create: `apps/frontend/src/components/PortfolioTimelineChart.tsx`

- [ ] **Step 1: Create the new file**

Write `apps/frontend/src/components/PortfolioTimelineChart.tsx`:

```tsx
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { TimelineEntry } from "@/hooks/useAnalytics";
import {
  CHART_COLORS,
  formatAmount,
  formatMonthLong,
} from "@/components/DistributionDonut";

interface PortfolioTimelineChartProps {
  timeline: TimelineEntry[];
  loading: boolean;
}

export function PortfolioTimelineChart({
  timeline,
  loading,
}: PortfolioTimelineChartProps) {
  const chartTimeline = timeline.map((t) => ({
    month: formatMonthLong(t.month),
    total: Number(t.total),
  }));

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Portfolio value over time
        </p>
        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Loading...
          </p>
        ) : chartTimeline.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No data yet
          </p>
        ) : (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart
                data={chartTimeline}
                margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="emeraldFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={CHART_COLORS[0]}
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="100%"
                      stopColor={CHART_COLORS[0]}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  stroke="var(--color-border)"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  stroke="var(--color-border)"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `€${formatAmount(v)}`}
                />
                <Tooltip
                  formatter={(value) => [
                    `€${formatAmount(Number(value))}`,
                    "Total",
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2.5}
                  fill="url(#emeraldFill)"
                  dot={{ fill: CHART_COLORS[0], r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && bun run build`
Expected: PASS — no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/PortfolioTimelineChart.tsx
git commit -m "feat(frontend): extract PortfolioTimelineChart component"
```

---

## Task 3: Refactor `AnalyticsPage` to use the new chart components

This is a **visual-identity-preserving refactor**: after this task, `/analytics` must look pixel-identical to before.

**Files:**
- Modify: `apps/frontend/src/pages/AnalyticsPage.tsx`

- [ ] **Step 1: Rewrite AnalyticsPage.tsx**

Replace the entire contents of `apps/frontend/src/pages/AnalyticsPage.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { useDistribution, useTimeline } from "@/hooks/useAnalytics";
import { MonthPicker } from "@/components/MonthPicker";
import { AnalyticsKpiStrip } from "@/components/AnalyticsKpiStrip";
import { DistributionDonut } from "@/components/DistributionDonut";
import { PortfolioTimelineChart } from "@/components/PortfolioTimelineChart";

export function AnalyticsPage() {
  const { data: timeline = [], isLoading: timelineLoading } = useTimeline();
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>();

  // timeline arrives oldest-first; derive newest-first list for the picker
  const monthsDesc = useMemo(
    () => [...timeline].map((t) => t.month).reverse(),
    [timeline]
  );

  const activeMonth = selectedMonth ?? monthsDesc[0];
  const { data: distribution = [], isLoading: distLoading } = useDistribution(
    activeMonth ? activeMonth.slice(0, 7) : undefined
  );

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Portfolio performance and distribution
      </p>

      {/* Month selector */}
      {monthsDesc.length > 0 && (
        <div className="mt-5">
          <MonthPicker
            months={monthsDesc}
            value={activeMonth}
            onChange={setSelectedMonth}
          />
        </div>
      )}

      {/* KPI strip */}
      <div className="mt-6">
        <AnalyticsKpiStrip
          distribution={distribution}
          timeline={timeline}
          activeMonth={activeMonth}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1.8fr]">
        <DistributionDonut
          distribution={distribution}
          activeMonth={activeMonth}
          loading={distLoading}
        />
        <PortfolioTimelineChart
          timeline={timeline}
          loading={timelineLoading}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd apps/frontend && bun run build`
Expected: PASS — no TypeScript errors. `AnalyticsPage.tsx` should shrink from ~305 lines to ~65 lines.

Run: `cd apps/frontend && bun run lint`
Expected: PASS — no new lint errors. (If `bun run lint` reports pre-existing warnings in unrelated files, that's fine — only new ones from your changes should fail.)

- [ ] **Step 3: Visual regression check**

Run: `cd apps/frontend && bun run dev` (in background or separate shell)

In a browser, navigate to `http://localhost:5173/analytics` (or whatever port vite prints).

Verify:
- Month picker still visible at the top
- KPI strip (Total / Services / Largest) still rendered identically
- Donut chart renders with center "Total" label and custom legend
- Area timeline chart renders with emerald gradient fill
- Hover over donut slices → tooltip shows `€amount`
- Hover over area chart → tooltip shows `€amount`, Total
- Pick a different month in the picker → donut updates

If anything looks different from before, the refactor missed something. Diff the new file against git HEAD and compare to your copy in Tasks 1 and 2.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/pages/AnalyticsPage.tsx
git commit -m "refactor(frontend): use DistributionDonut and PortfolioTimelineChart on AnalyticsPage"
```

---

## Task 4: Create `HeroSparkline` component

This is a new, compact interactive area chart for embedding inside the dashboard hero card. No axes, no gridlines, minimal tooltip, flat gray line when empty.

**Files:**
- Create: `apps/frontend/src/components/HeroSparkline.tsx`

- [ ] **Step 1: Create the new file**

Write `apps/frontend/src/components/HeroSparkline.tsx`:

```tsx
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import type { TimelineEntry } from "@/hooks/useAnalytics";
import {
  CHART_COLORS,
  formatAmount,
  formatMonthLong,
} from "@/components/DistributionDonut";

interface HeroSparklineProps {
  timeline: TimelineEntry[];
  loading: boolean;
}

export function HeroSparkline({ timeline, loading }: HeroSparklineProps) {
  // Empty state: show a flat gray line across the width
  if (loading) {
    return <div className="h-[70px]" aria-hidden />;
  }

  if (timeline.length === 0) {
    // Flat gray line placeholder
    const flatData = [
      { month: "", total: 1 },
      { month: "", total: 1 },
    ];
    return (
      <div className="h-[70px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={flatData}
            margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
          >
            <YAxis hide domain={[0, 2]} />
            <Area
              type="linear"
              dataKey="total"
              stroke="var(--color-border)"
              strokeWidth={1.5}
              fill="transparent"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const chartData = timeline.map((t) => ({
    month: formatMonthLong(t.month),
    total: Number(t.total),
  }));

  return (
    <div className="h-[70px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id="heroSparklineFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={CHART_COLORS[0]}
                stopOpacity={0.32}
              />
              <stop
                offset="100%"
                stopColor={CHART_COLORS[0]}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            formatter={(value) => [`€${formatAmount(Number(value))}`, "Total"]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              fontSize: 12,
              padding: "4px 8px",
            }}
            wrapperStyle={{ outline: "none" }}
            cursor={{ stroke: CHART_COLORS[0], strokeOpacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={CHART_COLORS[0]}
            strokeWidth={2}
            fill="url(#heroSparklineFill)"
            dot={false}
            activeDot={{ r: 4, fill: CHART_COLORS[0], strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

Notes:
- The hidden `<YAxis>` is required for recharts to scale the area vertically. Without it, the line may clip.
- `domain={["dataMin", "dataMax"]}` makes the sparkline fill the full 70px even for small variations, which is what you want in a sparkline (shape matters more than absolute scale).
- The empty-state `flatData` uses two identical points to render a flat horizontal line at the vertical midpoint of the 0–2 domain.

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && bun run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/HeroSparkline.tsx
git commit -m "feat(frontend): add HeroSparkline component"
```

---

## Task 5: Create `DashboardHero` component

The hero card that sits at the top of the dashboard. Composes greeting + total + delta + sparkline.

**Files:**
- Create: `apps/frontend/src/components/DashboardHero.tsx`

- [ ] **Step 1: Create the file**

Write `apps/frontend/src/components/DashboardHero.tsx`:

```tsx
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HeroSparkline } from "@/components/HeroSparkline";
import type {
  DistributionEntry,
  TimelineEntry,
} from "@/hooks/useAnalytics";
import type { User } from "@/hooks/AuthContext";

interface DashboardHeroProps {
  timeline: TimelineEntry[];
  distribution: DistributionEntry[];
  timelineLoading: boolean;
  user: User | null;
}

function formatCurrency(value: number): string {
  return `€${Math.round(value).toLocaleString("en-US")}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHero({
  timeline,
  distribution,
  timelineLoading,
  user,
}: DashboardHeroProps) {
  const total = distribution.reduce((s, d) => s + Number(d.amount), 0);
  const hasData = timeline.length > 0;

  // MoM delta: compare the last two timeline entries
  let delta: { pct: number; up: boolean } | null = null;
  if (timeline.length >= 2) {
    const last = Number(timeline[timeline.length - 1]?.total) || 0;
    const prior = Number(timeline[timeline.length - 2]?.total) || 0;
    if (prior > 0) {
      const pct = ((last - prior) / prior) * 100;
      delta = { pct: Math.abs(pct), up: pct >= 0 };
    }
  }

  const greeting = `${getGreeting()}, ${user?.name ?? "there"}`;
  const totalDisplay = hasData ? formatCurrency(total) : "€0";

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[1fr_1.1fr]">
          {/* Left: greeting + total + delta */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {greeting}
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums sm:text-4xl">
              {totalDisplay}
            </p>
            {delta ? (
              <p
                className={
                  "mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium " +
                  (delta.up ? "text-primary" : "text-destructive")
                }
              >
                {delta.up ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {delta.pct.toFixed(1)}% vs prev month
              </p>
            ) : (
              <p className="mt-2 h-[26px]" aria-hidden />
            )}
          </div>

          {/* Right: interactive sparkline */}
          <div>
            <HeroSparkline timeline={timeline} loading={timelineLoading} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

Notes:
- Reuses `ArrowUpRight` / `ArrowDownRight` from `lucide-react` (same pattern as `AnalyticsKpiStrip`).
- Delta pill styling matches the emerald theme: `bg-primary/10` for the soft background, `text-primary` for up, `text-destructive` for down.
- When there's no delta, a 26px-tall empty `<p>` reserves the vertical space so the hero's height stays stable regardless of data state.
- The `User` type is imported from `AuthContext`, which already exports it.

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && bun run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/DashboardHero.tsx
git commit -m "feat(frontend): add DashboardHero component"
```

---

## Task 6: Create `QuickActions` component

Equal-width pill bar with 4 navigation pills.

**Files:**
- Create: `apps/frontend/src/components/QuickActions.tsx`

- [ ] **Step 1: Create the file**

Write `apps/frontend/src/components/QuickActions.tsx`:

```tsx
import { Link } from "react-router";
import { BarChart3, Camera, Coins, Wallet } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface QuickAction {
  label: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const ACTIONS: QuickAction[] = [
  { label: "Add asset", to: "/assets", icon: Coins },
  { label: "Add pocket", to: "/profile", icon: Wallet },
  { label: "Snapshot", to: "/snapshots", icon: Camera },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
];

export function QuickActions() {
  return (
    <nav
      aria-label="Quick actions"
      className="flex gap-1 rounded-full border bg-card p-1.5 shadow-sm max-sm:grid max-sm:grid-cols-2 max-sm:gap-1.5 max-sm:rounded-xl"
    >
      {ACTIONS.map(({ label, to, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
```

Notes:
- Uses `Link` from `react-router` (not `react-router-dom` — this codebase is on react-router v7; see other files like `Sidebar.tsx` and `LoginPage.tsx` for the import pattern).
- `max-sm:` prefixes give the mobile override (< `sm` breakpoint): flex-row pill bar becomes a 2-column grid with a rounded-xl container. `flex-1` still applies to each pill inside the grid cells, so they fill their cells evenly.
- `lucide-react` icons are typed as `ComponentType<SVGProps<SVGSVGElement>>` — the same shape the other lucide icons use in this codebase.

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && bun run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/QuickActions.tsx
git commit -m "feat(frontend): add QuickActions pill bar"
```

---

## Task 7: Rewrite `DashboardPage`

Full body rewrite of the dashboard page. Composes: `DashboardHero`, `QuickActions`, meta chips (Services + Largest), and the two chart cards.

**Files:**
- Modify: `apps/frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Replace the entire file**

Write `apps/frontend/src/pages/DashboardPage.tsx`:

```tsx
import { useAuth } from "@/hooks/useAuth";
import { useDistribution, useTimeline } from "@/hooks/useAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHero } from "@/components/DashboardHero";
import { QuickActions } from "@/components/QuickActions";
import { DistributionDonut } from "@/components/DistributionDonut";
import { PortfolioTimelineChart } from "@/components/PortfolioTimelineChart";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: timeline = [], isLoading: timelineLoading } = useTimeline();

  // timeline is oldest-first → last entry is the latest month
  const latestMonth = timeline[timeline.length - 1]?.month;

  const { data: distribution = [], isLoading: distLoading } = useDistribution(
    latestMonth ? latestMonth.slice(0, 7) : undefined
  );

  // Derived meta chip values
  const servicesCount = distribution.length;
  const total = distribution.reduce((s, d) => s + Number(d.amount), 0);
  const sorted = [...distribution].sort(
    (a, b) => Number(b.amount) - Number(a.amount)
  );
  const largest = sorted[0];
  const largestPct =
    largest && total > 0
      ? Math.round((Number(largest.amount) / total) * 100)
      : null;

  return (
    <div>
      <DashboardHero
        timeline={timeline}
        distribution={distribution}
        timelineLoading={timelineLoading}
        user={user}
      />

      <div className="mt-6">
        <QuickActions />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Services
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
              {servicesCount}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Largest holding
            </p>
            <p className="mt-2 truncate text-2xl font-semibold text-foreground">
              {largest?.name ?? "—"}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {largestPct !== null ? `${largestPct}% of portfolio` : "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1.8fr]">
        <DistributionDonut
          distribution={distribution}
          activeMonth={latestMonth}
          loading={distLoading}
        />
        <PortfolioTimelineChart
          timeline={timeline}
          loading={timelineLoading}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd apps/frontend && bun run build`
Expected: PASS. No TypeScript errors.

Run: `cd apps/frontend && bun run lint`
Expected: PASS (or only pre-existing warnings in unrelated files).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/DashboardPage.tsx
git commit -m "feat(frontend): redesign dashboard with hero, quick actions, and charts"
```

---

## Task 8: Visual verification

No code changes in this task — just manual verification that everything works together.

- [ ] **Step 1: Run the dev server**

Run: `cd apps/frontend && bun run dev`

Note the port vite prints (typically `5173`).

- [ ] **Step 2: Dashboard page check (`/dashboard`)**

Navigate to `http://localhost:5173/dashboard` and verify:

- Hero card renders at the top with:
  - Time-aware greeting: "Good morning/afternoon/evening, {name}" (check the hour against your computer clock)
  - Large total value (€ amount)
  - Delta badge below the total (if you have 2+ snapshots) — emerald pill with up/down arrow and percent
  - Interactive sparkline on the right — hover over it and verify a tooltip appears with `€amount Total`
- Quick actions pill bar renders below the hero with 4 equal-width pills, each with an icon + label
- Click each pill and verify the correct route opens:
  - Add asset → `/assets`
  - Add pocket → `/profile`
  - Snapshot → `/snapshots`
  - Analytics → `/analytics`
  - Use browser back after each to return to the dashboard
- Meta chips row: 2 small cards side by side — Services count and Largest holding
- Charts row: distribution donut on the left (~40% width), portfolio timeline on the right (~60% width) — same visual language as `/analytics`
- **No** month picker anywhere on the dashboard

- [ ] **Step 3: Analytics page regression check (`/analytics`)**

Navigate to `http://localhost:5173/analytics` and verify:

- Looks pixel-identical to how it looked before this change
- Month picker still at top
- KPI strip still below picker (3 cards: Total / Services / Largest)
- Donut + area chart still rendered correctly
- Picking a different month updates the donut

If anything regressed here, Task 3 introduced a bug.

- [ ] **Step 4: Responsive check**

Resize the browser window to < 640px (narrow mobile width, below Tailwind's `sm` breakpoint). Verify:

- Hero card stacks vertically (greeting + total on top, sparkline below)
- Quick actions pill bar becomes a 2×2 grid (rounded-xl container, 4 pills in a 2-col grid)
- Meta chips stack to a single column
- Charts stack (donut above timeline)

Resize back to desktop width and verify everything returns to the horizontal layout.

- [ ] **Step 5: Empty state check (optional but recommended)**

If you have a way to test with a zero-snapshot user (e.g., a second account, or temporarily clear the `snapshots` table), verify:

- Dashboard hero shows "€0" and a flat gray line where the sparkline goes
- Delta badge is hidden (no "vs prev month" pill)
- Meta chips show "Services: 0 tracked" and "Largest: — No data"
- Donut shows "No data for this month"
- Timeline shows "No data yet"
- Quick actions pill bar is still fully functional — clicking Snapshot takes you to `/snapshots`
- Nothing crashes, nothing logs errors in the console

If you can't test empty state directly, at minimum verify the dashboard doesn't crash with no data by temporarily commenting out the `timeline` and `distribution` results in your browser DevTools (not in code).

- [ ] **Step 6: Stop the dev server**

Kill the `bun run dev` process (Ctrl+C).

No commit in this task (verification only).

---

## Task 9: Final build check

- [ ] **Step 1: Clean build**

Run: `cd apps/frontend && bun run build`
Expected: PASS — full TypeScript type-check + Vite production build completes with no errors.

- [ ] **Step 2: Lint**

Run: `cd apps/frontend && bun run lint`
Expected: PASS (or only pre-existing warnings in files this plan did not touch).

- [ ] **Step 3: Confirm git state**

Run: `git log --oneline -10`
Expected: You should see your 7 commits from Tasks 1, 2, 3, 4, 5, 6, 7 (in that order), plus the spec commit and whatever was there before.

Run: `git status`
Expected: clean working tree (no uncommitted changes).

If the working tree isn't clean, either commit or stash whatever's left before handing off.

---

## Self-Review Notes (for the plan author)

**Spec coverage:**
- ✅ DistributionDonut extraction → Task 1
- ✅ PortfolioTimelineChart extraction → Task 2
- ✅ AnalyticsPage refactor → Task 3
- ✅ HeroSparkline new component → Task 4
- ✅ DashboardHero new component → Task 5
- ✅ QuickActions new component → Task 6
- ✅ DashboardPage rewrite → Task 7
- ✅ All 5 edge cases (no data, loading, single snapshot, visual regression, responsive) → Task 8

**Placeholders:** None. Every file has its full content inline.

**Type consistency:**
- `CHART_COLORS`, `formatMonthLong`, `formatAmount`, `formatCompact` are all exported from `DistributionDonut.tsx` and imported consistently by `PortfolioTimelineChart.tsx` and `HeroSparkline.tsx`.
- `DistributionEntry` and `TimelineEntry` come from `@/hooks/useAnalytics` (verified in the reference snippets).
- `User` type comes from `@/hooks/AuthContext` (already exported there).
- `react-router` (not `react-router-dom`) — verified against existing `Sidebar.tsx` / `LoginPage.tsx` imports.
- All 4 routes (`/assets`, `/profile`, `/snapshots`, `/analytics`) exist in `main.tsx`.
