# Asset Allocation Timeline Chart

## Overview

Add a 100% stacked area chart to the analytics page showing how asset allocation percentages shift across snapshots over time. Top 8 assets by value get their own band, the rest grouped into "Other".

## Chart Type

100% stacked area chart (Recharts AreaChart with stackId, normalized to 100%). Each band represents one asset's share of total portfolio value for that month.

## Data

### New Database Query

`findAssetTimeline(userId)` in `packages/database/modules/analytics/index.ts`:

- Joins `snapshot_entries` → `pocket_assets` to get asset symbol/name
- Entries without a `pocket_asset_id` are grouped by their service name instead (plain amount entries)
- Groups by `(month, asset_label)`, sums amounts
- Returns rows: `{ month: string, asset: string, amount: number }`
- Ordered by month ASC

### New API Endpoint

`GET /api/analytics/asset-timeline` in `apps/analytics/src/api/analytics.ts`:

- Requires authentication (same pattern as existing endpoints)
- Calls `findAssetTimeline(userId)`
- Transforms flat rows into: `[{ month: "2026-01", assets: { "VOO": 5000, "BTC": 3000, ... } }]`
- Returns the structured array

### Frontend Transformation

In the chart component or hook:

1. Find the most recent month's data
2. Sort assets by value descending in that month
3. Take top 8 as named assets
4. Collapse everything else into "Other"
5. For each month, convert absolute values to percentages: `asset_value / month_total * 100`

## UI

### Placement

Full-width card below the existing `grid` (donut + timeline) row on the analytics page. Not inside the grid — it spans the full content width.

### Card Structure

- Card with white background, border, rounded corners (matching existing chart cards)
- Title: "Asset Allocation Over Time" — `text-sm font-semibold text-foreground`
- Chart height: 340px (same as PortfolioTimelineChart)
- Recharts `AreaChart` with `stackId="1"` on each area, `type="monotone"`
- Y-axis: 0–100% with `tickFormatter` adding `%`
- X-axis: month labels (MMM YY format)
- Tooltip showing asset name + percentage for hovered month
- Legend below chart showing colored dots + asset names

### Color Palette

9 colors (8 named assets + Other):

```
["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#9ca3af"]
```

Last color (#9ca3af gray) is always "Other".

### Responsive

- Mobile: full width, same 340px height
- Legend wraps on narrow screens

## Files Modified

| File | Change |
|------|--------|
| `packages/database/modules/analytics/index.ts` | Add `findAssetTimeline()` query function |
| `apps/analytics/src/api/analytics.ts` | Add `GET /api/analytics/asset-timeline` endpoint |
| `apps/frontend/src/hooks/useAnalytics.ts` | Add `useAssetTimeline()` React Query hook |
| `apps/frontend/src/components/AssetAllocationChart.tsx` | New 100% stacked area chart component |
| `apps/frontend/src/pages/AnalyticsPage.tsx` | Import and render AssetAllocationChart below existing charts |

## Not in Scope

- Clicking on an asset band to drill down
- Custom date range filtering (uses all available snapshots)
- Export/download chart data
- Animating transitions between months
