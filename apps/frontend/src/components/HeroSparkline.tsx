import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import type { TimelineEntry } from "@/hooks/useAnalytics";
import { CHART_COLORS, formatAmount, formatMonthLong } from "@/lib/chart";

interface HeroSparklineProps {
  timeline: TimelineEntry[];
  loading: boolean;
}

export function HeroSparkline({ timeline, loading }: HeroSparklineProps) {
  // Empty state: show a flat gray line across the width
  if (loading) {
    return <div className="h-[70px]" aria-hidden />;
  }

  if (timeline.length === 0) {
    // Flat gray line placeholder
    const flatData = [
      { month: "", total: 1 },
      { month: "", total: 1 },
    ];
    return (
      <div className="h-[70px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={flatData}
            margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
          >
            <YAxis hide domain={[0, 2]} />
            <Area
              type="linear"
              dataKey="total"
              stroke="var(--color-border)"
              strokeWidth={1.5}
              fill="transparent"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const chartData = timeline.map((t) => ({
    month: formatMonthLong(t.month),
    total: Number(t.total),
  }));

  return (
    <div className="h-[70px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id="heroSparklineFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={CHART_COLORS[0]}
                stopOpacity={0.32}
              />
              <stop
                offset="100%"
                stopColor={CHART_COLORS[0]}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            formatter={(value) => [`€${formatAmount(Number(value))}`, "Total"]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              fontSize: 12,
              padding: "4px 8px",
            }}
            wrapperStyle={{ outline: "none" }}
            cursor={{ stroke: CHART_COLORS[0], strokeOpacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={CHART_COLORS[0]}
            strokeWidth={2}
            fill="url(#heroSparklineFill)"
            dot={false}
            activeDot={{ r: 4, fill: CHART_COLORS[0], strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
