import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  { label: "Total Assets", value: "\u2014" },
  { label: "Return", value: "\u2014" },
  { label: "Positions", value: "\u2014" },
];

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back, {user?.name ?? "there"}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Content will go here</p>
        </CardContent>
      </Card>
    </div>
  );
}
