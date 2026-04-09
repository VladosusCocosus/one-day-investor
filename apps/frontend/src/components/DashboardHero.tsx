import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HeroSparkline } from "@/components/HeroSparkline";
import type {
  DistributionEntry,
  TimelineEntry,
} from "@/hooks/useAnalytics";
import type { User } from "@/hooks/AuthContext";
import { formatCurrency } from "@/lib/chart";

interface DashboardHeroProps {
  timeline: TimelineEntry[];
  distribution: DistributionEntry[];
  timelineLoading: boolean;
  user: User | null;
  total: number
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHero({
  timeline,
    total,
  timelineLoading,
  user,
}: DashboardHeroProps) {
  const hasData = timeline.length > 0;

  // MoM delta: compare the last two timeline entries
  let delta: { pct: number; up: boolean } | null = null;
  if (timeline.length >= 2) {
    const last = Number(timeline[timeline.length - 1]?.total) || 0;
    const prior = Number(timeline[timeline.length - 2]?.total) || 0;
    if (prior > 0) {
      const pct = ((last - prior) / prior) * 100;
      delta = { pct: Math.abs(pct), up: pct >= 0 };
    }
  }

  const greeting = `${getGreeting()}, ${user?.name ?? "there"}`;
  const totalDisplay = hasData ? formatCurrency(total) : "€0";

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[1fr_1.1fr]">
          {/* Left: greeting + total + delta */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {greeting}
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums sm:text-4xl">
              {totalDisplay}
            </p>
            {delta ? (
              <p
                className={
                  "mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium " +
                  (delta.up ? "text-primary" : "text-destructive")
                }
              >
                {delta.up ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {delta.pct.toFixed(1)}% vs prev month
              </p>
            ) : (
              <p className="mt-2 h-[26px]" aria-hidden />
            )}
          </div>

          {/* Right: interactive sparkline */}
          <div>
            <HeroSparkline timeline={timeline} loading={timelineLoading} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
