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
                  formatter={(value, name) => [
                    `${(Number(value) * 100).toFixed(1)}%`,
                    String(name),
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
