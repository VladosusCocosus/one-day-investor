import { Card, CardContent } from "@/components/ui/card";
import { AssetPocketCard } from "@/components/AssetPocketCard";
import { useServices } from "@/hooks/useServices";

export function AssetsPage() {
  const { services, loading } = useServices();

  // Only show crypto/invest pockets (not common)
  const investPockets = services.filter(
    (s) => s.service_type === "crypto" || s.service_type === "invest"
  );

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Assets</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure assets for your investment pockets
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground text-center">Loading...</p>
      ) : investPockets.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No crypto or invest pockets yet. Add them on the Profile page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          {investPockets.map((service) => (
            <AssetPocketCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
