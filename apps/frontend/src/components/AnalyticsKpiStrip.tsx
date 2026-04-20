import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import type { DistributionEntry, TimelineEntry } from "@/hooks/useAnalytics";
import { formatCurrency, sortByAmountDesc } from "@/lib/chart";

interface AnalyticsKpiStripProps {
  distribution: DistributionEntry[];
  timeline: TimelineEntry[];
  activeMonth: string | undefined;
}

export function AnalyticsKpiStrip({
  distribution,
  timeline,
  activeMonth,
}: AnalyticsKpiStripProps) {
  const { t } = useTranslation();
  const total = distribution.reduce((sum, d) => sum + Number(d.amount), 0);

  // MoM delta: compare this month's total against the previous month in timeline
  let delta: { pct: number; up: boolean } | null = null;
  if (timeline.length >= 2 && activeMonth) {
    const idx = timeline.findIndex((t) => t.month === activeMonth);
    if (idx > 0) {
      const prev = Number(timeline[idx - 1]?.total) || 0;
      const curr = Number(timeline[idx]?.total) || 0;
      if (prev > 0) {
        const pct = ((curr - prev) / prev) * 100;
        delta = { pct: Math.abs(pct), up: pct >= 0 };
      }
    } else if (idx === -1 && timeline.length >= 2) {
      // activeMonth not in timeline (e.g. distribution-only); fall back to last two points
      const last = Number(timeline[timeline.length - 1]?.total) || 0;
      const prior = Number(timeline[timeline.length - 2]?.total) || 0;
      if (prior > 0) {
        const pct = ((last - prior) / prior) * 100;
        delta = { pct: Math.abs(pct), up: pct >= 0 };
      }
    }
  }

  const servicesCount = distribution.length;

  const largest = sortByAmountDesc(distribution)[0];
  const largestPct =
    largest && total > 0
      ? Math.round((Number(largest.amount) / total) * 100)
      : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Total */}
      <Card>
        <CardContent>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("analytics.totalValue")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
            {formatCurrency(total)}
          </p>
          {delta ? (
            <p
              className={
                "mt-1.5 flex items-center gap-1 text-xs font-medium " +
                (delta.up ? "text-primary" : "text-destructive")
              }
            >
              {delta.up ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {delta.pct.toFixed(1)}% {t("analytics.vsPrevMonth")}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">&nbsp;</p>
          )}
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardContent>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("analytics.services")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
            {servicesCount}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("analytics.trackedThisMonth")}
          </p>
        </CardContent>
      </Card>

      {/* Largest */}
      <Card>
        <CardContent>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("analytics.largestHolding")}
          </p>
          <p className="mt-2 truncate text-2xl font-semibold text-foreground">
            {largest?.name ?? "—"}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {largestPct !== null ? `${largestPct}% ${t("analytics.ofPortfolio")}` : t("common.noData")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
