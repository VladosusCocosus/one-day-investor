import { useAuth } from "@/hooks/useAuth";
import { useSnapshots } from "@/hooks/useSnapshots";
import { Card, CardContent } from "@/components/ui/card";

function formatMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function formatAmount(value: string | number): string {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function DashboardPage() {
  const { user } = useAuth();
  const { summaries, loading } = useSnapshots();

  const latest = summaries[0];
  const previous = summaries[1];
  const change = latest && previous
    ? Number(latest.total) - Number(previous.total)
    : null;
  const changePercent = change !== null && previous
    ? (change / Number(previous.total)) * 100
    : null;

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back, {user?.name ?? "there"}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Total Assets
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {latest ? `€${formatAmount(latest.total)}` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Monthly Change
            </p>
            <p className={`mt-1 text-2xl font-bold ${change !== null ? (change >= 0 ? "text-green-600" : "text-red-500") : "text-foreground"}`}>
              {change !== null
                ? `${change >= 0 ? "+" : ""}€${formatAmount(Math.abs(change))}`
                : "—"}
            </p>
            {changePercent !== null && (
              <p className={`text-xs ${changePercent >= 0 ? "text-green-600" : "text-red-500"}`}>
                {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Months Tracked
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {summaries.length || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No snapshots yet. Go to Assets to create your first snapshot.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Month</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Total</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((snapshot, i) => {
                  const prev = summaries[i + 1];
                  const diff = prev ? Number(snapshot.total) - Number(prev.total) : null;
                  return (
                    <tr key={snapshot.id} className="border-b last:border-0">
                      <td className="py-2.5">{formatMonth(snapshot.month)}</td>
                      <td className="py-2.5 text-right font-medium">
                        €{formatAmount(snapshot.total)}
                      </td>
                      <td className={`py-2.5 text-right ${diff !== null ? (diff >= 0 ? "text-green-600" : "text-red-500") : ""}`}>
                        {diff !== null
                          ? `${diff >= 0 ? "+" : ""}€${formatAmount(Math.abs(diff))}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
