import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { DistributionEntry } from "@/hooks/useAnalytics";
import {
  CHART_COLORS,
  formatAmount,
  formatCompact,
  formatMonthLong,
  sortByAmountDesc,
} from "@/lib/chart";

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
  const { t } = useTranslation();
  const sortedDistribution = useMemo(
    () => sortByAmountDesc(distribution),
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
            {t("analytics.distribution")}
          </p>
          {activeMonth && (
            <p className="text-[11px] text-muted-foreground">
              {formatMonthLong(activeMonth)}
            </p>
          )}
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.loading")}
          </p>
        ) : chartDistribution.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("analytics.noDataForMonth")}
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
                  {t("common.total")}
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
