import { useAuth } from "@/hooks/useAuth";
import {
  useCurrentTotal,
  useDistribution,
  useTimeline,
} from "@/hooks/useAnalytics";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHero } from "@/components/DashboardHero";
import { GoalHero } from "@/components/GoalHero";
import { QuickActions } from "@/components/QuickActions";
import { DistributionDonut } from "@/components/DistributionDonut";
import { PortfolioTimelineChart } from "@/components/PortfolioTimelineChart";
import { sortByAmountDesc } from "@/lib/chart";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
};

export function DashboardPage() {
  const { user } = useAuth();
  const { data: timeline = [], isLoading: timelineLoading } = useTimeline();
  const { data: current = null } = useCurrentTotal();
  const { settings, updateSettings } = useSettings();

  // "Current" = the most recently created snapshot, not the highest month.
  // Back-filled months still surface correctly because the endpoint sorts
  // by created_at DESC, LIMIT 1.
  const latestMonth = current?.month;

  const { data: distribution = [], isLoading: distLoading } = useDistribution(
    latestMonth ? latestMonth.slice(0, 7) : undefined
  );

  // Derived meta chip values
  const servicesCount = distribution.length;
  const total = distribution.reduce((s, d) => s + Number(d.amount), 0);
  const largest = sortByAmountDesc(distribution)[0];
  const largestPct =
    largest && total > 0
      ? Math.round((Number(largest.amount) / total) * 100)
      : null;

  // Goal hero values
  const symbol = CURRENCY_SYMBOLS[settings?.currency ?? "EUR"] ?? "\u20ac";
  const goal = Number(settings?.goal ?? 0);
  const currentTotal = current ? Number(current.total) : null;

  return (
    <div>
      <DashboardHero
        timeline={timeline}
        distribution={distribution}
        timelineLoading={timelineLoading}
        user={user}
      />

      <div className="mt-4">
        <GoalHero
          goal={goal}
          currentTotal={currentTotal}
          symbol={symbol}
          onSave={(newGoal) => updateSettings({ goal: newGoal })}
        />
      </div>

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
