import { useId } from "react";
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
import { CHART_COLORS, formatAmount, formatMonthLong } from "@/lib/chart";

interface PortfolioTimelineChartProps {
  timeline: TimelineEntry[];
  loading: boolean;
}

export function PortfolioTimelineChart({
  timeline,
  loading,
}: PortfolioTimelineChartProps) {
  const gradientId = `portfolio-timeline-${useId()}`;
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
                    id={gradientId}
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
                  fill={`url(#${gradientId})`}
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
