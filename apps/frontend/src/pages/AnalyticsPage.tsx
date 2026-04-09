import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useDistribution, useTimeline } from "@/hooks/useAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { MonthPicker } from "@/components/MonthPicker";
import { AnalyticsKpiStrip } from "@/components/AnalyticsKpiStrip";

// Emerald Fintech chart palette — mirrors --chart-1..6 in index.css
const CHART_COLORS = [
  "hsl(160, 84%, 25%)", // --chart-1 emerald deep
  "hsl(160, 70%, 40%)", // --chart-2 emerald mid
  "hsl(150, 60%, 55%)", // --chart-3 green
  "hsl(170, 55%, 55%)", // --chart-4 teal
  "hsl(145, 45%, 65%)", // --chart-5 sage
  "hsl(175, 40%, 45%)", // --chart-6 deep teal
];

function formatMonthLong(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatAmount(value: number): string {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatCompact(value: number): string {
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(1)}K`;
  }
  return `€${Math.round(value)}`;
}

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

  const chartTimeline = timeline.map((t) => ({
    month: formatMonthLong(t.month),
    total: Number(t.total),
  }));

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
        {/* Donut — Distribution */}
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

            {distLoading ? (
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

        {/* Area — Timeline */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Portfolio value over time
            </p>
            {timelineLoading ? (
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
      </div>
    </div>
  );
}
