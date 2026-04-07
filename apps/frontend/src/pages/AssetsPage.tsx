import { Card, CardContent } from "@/components/ui/card";

export function AssetsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Assets</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track your investment portfolio
      </p>

      <Card className="mt-6">
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Asset management will go here</p>
        </CardContent>
      </Card>
    </div>
  );
}
