# Asset Allocation Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 100% stacked area chart to the analytics page showing asset allocation percentages across snapshots over time, with top 8 assets + "Other".

**Architecture:** New SQL query aggregates snapshot entries by asset across months. New API endpoint serves the data. Frontend hook fetches it and a new Recharts component transforms it into a 100% stacked area chart with top-8 bucketing.

**Tech Stack:** PostgreSQL, Elysia, React, Recharts, TanStack Query, Axios

---

## File Structure

| File | Responsibility |
|------|---------------|
| `packages/database/modules/analytics/index.ts` | `findAssetTimeline()` SQL query |
| `apps/analytics/src/api/analytics.ts` | `GET /api/analytics/asset-timeline` endpoint |
| `apps/frontend/src/hooks/useAnalytics.ts` | `useAssetTimeline()` React Query hook |
| `apps/frontend/src/components/AssetAllocationChart.tsx` | 100% stacked area chart component |
| `apps/frontend/src/pages/AnalyticsPage.tsx` | Integrate chart below existing charts |

---

### Task 1: Database — findAssetTimeline query

**Files:**
- Modify: `packages/database/modules/analytics/index.ts`

- [ ] **Step 1: Add the `findAssetTimeline` function**

Add at the end of `packages/database/modules/analytics/index.ts`:

```typescript
export async function findAssetTimeline(userId: string) {
  const { rows } = await pool.query(
    `SELECT
       s.month,
       COALESCE(pa.symbol, trim(concat(s3.name, ' ', s2.name))) AS asset,
       SUM(e.amount) AS amount
     FROM snapshot_entries e
     JOIN snapshots s ON s.id = e.snapshot_id
     JOIN services s2 ON s2.id = e.service_id
     LEFT JOIN services s3 ON s2.parent_id = s3.id
     LEFT JOIN pocket_assets pa ON pa.id = e.pocket_asset_id
     WHERE s.user_id = $1
     GROUP BY s.month, asset
     ORDER BY s.month ASC, amount DESC`,
    [userId]
  );
  return rows as { month: string; asset: string; amount: number }[];
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/database/modules/analytics/index.ts
git commit -m "feat(analytics): add findAssetTimeline query"
```

---

### Task 2: API — asset-timeline endpoint

**Files:**
- Modify: `apps/analytics/src/api/analytics.ts`

- [ ] **Step 1: Add the import**

In `apps/analytics/src/api/analytics.ts`, update the import from `"@database"` (line 2) to include the new function:

```typescript
import { findCurrentTotal, findDistribution, findTimeline, findAssetTimeline } from "@database";
```

- [ ] **Step 2: Add the endpoint**

Add this route after the existing `.get("/current", ...)` route (after line 35, before the closing semicolon):

```typescript
  .get("/asset-timeline", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const rows = await findAssetTimeline(user.id);

    // Group flat rows into { month, assets: { [name]: amount } }
    const grouped: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      if (!grouped[row.month]) grouped[row.month] = {};
      grouped[row.month][row.asset] = Number(row.amount);
    }

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, assets]) => ({ month, assets }));
  })
```

- [ ] **Step 3: Commit**

```bash
git add apps/analytics/src/api/analytics.ts
git commit -m "feat(analytics): add asset-timeline API endpoint"
```

---

### Task 3: Frontend hook — useAssetTimeline

**Files:**
- Modify: `apps/frontend/src/hooks/useAnalytics.ts`

- [ ] **Step 1: Add the type and hook**

Add at the end of `apps/frontend/src/hooks/useAnalytics.ts`:

```typescript
export interface AssetTimelineEntry {
  month: string;
  assets: Record<string, number>;
}

export function useAssetTimeline() {
  return useQuery({
    queryKey: ["analytics", "asset-timeline"],
    queryFn: async () => {
      const res = await analyticsApi.get<AssetTimelineEntry[]>(
        "/api/analytics/asset-timeline"
      );
      return res.data;
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/hooks/useAnalytics.ts
git commit -m "feat(analytics): add useAssetTimeline hook"
```

---

### Task 4: Chart component — AssetAllocationChart

**Files:**
- Create: `apps/frontend/src/components/AssetAllocationChart.tsx`

- [ ] **Step 1: Create the component**

Create `apps/frontend/src/components/AssetAllocationChart.tsx`:

```typescript
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { AssetTimelineEntry } from "@/hooks/useAnalytics";
import { formatMonthLong } from "@/lib/chart";

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#9ca3af",
];

const MAX_ASSETS = 8;

interface AssetAllocationChartProps {
  data: AssetTimelineEntry[];
  loading: boolean;
}

function buildChartData(data: AssetTimelineEntry[]) {
  if (data.length === 0) return { chartData: [], assetKeys: [] };

  // Determine top 8 assets by value in the most recent month
  const latest = data[data.length - 1].assets;
  const sorted = Object.entries(latest).sort(([, a], [, b]) => b - a);
  const topAssets = sorted.slice(0, MAX_ASSETS).map(([name]) => name);
  const hasOther = sorted.length > MAX_ASSETS;
  const assetKeys = hasOther ? [...topAssets, "Other"] : topAssets;

  // Build percentage data for each month
  const chartData = data.map((entry) => {
    const total = Object.values(entry.assets).reduce((sum, v) => sum + v, 0);
    if (total === 0) {
      const row: Record<string, string | number> = { month: formatMonthLong(entry.month) };
      for (const key of assetKeys) row[key] = 0;
      return row;
    }

    const row: Record<string, string | number> = { month: formatMonthLong(entry.month) };
    let otherTotal = 0;

    for (const [asset, amount] of Object.entries(entry.assets)) {
      if (topAssets.includes(asset)) {
        row[asset] = Math.round((amount / total) * 10000) / 100;
      } else {
        otherTotal += amount;
      }
    }

    // Fill missing top assets with 0
    for (const key of topAssets) {
      if (!(key in row)) row[key] = 0;
    }

    if (hasOther) {
      row["Other"] = Math.round((otherTotal / total) * 10000) / 100;
    }

    return row;
  });

  return { chartData, assetKeys };
}

export function AssetAllocationChart({ data, loading }: AssetAllocationChartProps) {
  const { chartData, assetKeys } = buildChartData(data);

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Asset allocation over time
        </p>
        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Loading...
          </p>
        ) : chartData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No data yet
          </p>
        ) : (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart
                data={chartData}
                stackOffset="expand"
                margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
              >
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
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}%`,
                    name,
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
                {assetKeys.map((key, i) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={COLORS[i]}
                    fill={COLORS[i]}
                    fillOpacity={0.7}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/AssetAllocationChart.tsx
git commit -m "feat(analytics): add AssetAllocationChart component"
```

---

### Task 5: Integration — add chart to AnalyticsPage

**Files:**
- Modify: `apps/frontend/src/pages/AnalyticsPage.tsx`

- [ ] **Step 1: Add imports**

In `apps/frontend/src/pages/AnalyticsPage.tsx`, update the imports:

```typescript
import { useDistribution, useTimeline, useAssetTimeline } from "@/hooks/useAnalytics";
```

Add a new import for the chart component:

```typescript
import { AssetAllocationChart } from "@/components/AssetAllocationChart";
```

- [ ] **Step 2: Add the hook call and chart**

Inside `AnalyticsPage()`, after the existing `useDistribution` call (around line 22), add:

```typescript
  const { data: assetTimeline = [], isLoading: assetTimelineLoading } = useAssetTimeline();
```

After the closing `</div>` of the grid (after line 63, before the closing `</div>` of the page), add:

```typescript
      {/* Asset allocation over time */}
      <div className="mt-6">
        <AssetAllocationChart
          data={assetTimeline}
          loading={assetTimelineLoading}
        />
      </div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/AnalyticsPage.tsx
git commit -m "feat(analytics): integrate asset allocation chart into analytics page"
```
