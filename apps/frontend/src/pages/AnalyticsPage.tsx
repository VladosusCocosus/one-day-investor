import { useMemo, useState } from "react";
import { useDistribution, useTimeline } from "@/hooks/useAnalytics";
import { MonthPicker } from "@/components/MonthPicker";
import { AnalyticsKpiStrip } from "@/components/AnalyticsKpiStrip";
import { DistributionDonut } from "@/components/DistributionDonut";
import { PortfolioTimelineChart } from "@/components/PortfolioTimelineChart";
import { usePageMeta } from "@/lib/use-page-meta";
import { pageMeta } from "@/lib/metadata";

export function AnalyticsPage() {
  usePageMeta(pageMeta.analytics);
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
