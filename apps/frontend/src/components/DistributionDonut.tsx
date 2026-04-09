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
