import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useDistribution, useTimeline } from "@/hooks/useAnalytics";
import { Card, CardContent } from "@/components/ui/card";

const COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c084fc",
  "#e879f9", "#f472b6", "#fb7185", "#f87171",
  "#fb923c", "#fbbf24", "#a3e635", "#34d399",
];

function formatMonth(dateStr: string): string {
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

export function AnalyticsPage() {
  const { data: timeline = [], isLoading: timelineLoading } = useTimeline();
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>();

  const activeMonth = selectedMonth ?? timeline[timeline.length - 1]?.month;
  const { data: distribution = [], isLoading: distLoading } =
    useDistribution(activeMonth);

  const chartTimeline = timeline.map((t) => ({
    month: formatMonth(t.month),
    total: Number(t.total),
  }));

  const chartDistribution = distribution.map((d) => ({
    name: d.name,
    value: Number(d.amount),
  }));

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Portfolio performance and distribution
      </p>

      {/* Month selector */}
      {timeline.length > 0 && (
        <div className="mt-4">
          <select
            value={activeMonth ?? ""}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground shadow-sm"
          >
            {timeline.map((t) => (
              <option key={t.month} value={t.month}>
                {formatMonth(t.month)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pie Chart — Distribution */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-4">
              Service Distribution
              {activeMonth ? ` — ${formatMonth(activeMonth)}` : ""}
            </p>
            {distLoading ? (
              <p className="text-sm text-muted-foreground py-16 text-center">
                Loading...
              </p>
            ) : chartDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">
                No data for this month
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={chartDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    innerRadius={60}
                    paddingAngle={2}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {chartDistribution.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `€${formatAmount(Number(value))}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Line Chart — Timeline */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-4">
              Portfolio Value Over Time
            </p>
            {timelineLoading ? (
              <p className="text-sm text-muted-foreground py-16 text-center">
                Loading...
              </p>
            ) : chartTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">
                No data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                    tickFormatter={(v) => `€${formatAmount(v)}`}
                  />
                  <Tooltip
                    formatter={(value) => [`€${formatAmount(Number(value))}`, "Total"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: "#6366f1", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
