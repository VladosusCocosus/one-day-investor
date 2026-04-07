import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssetPocketCard } from "@/components/AssetPocketCard";
import { useServices } from "@/hooks/useServices";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { useSettings } from "@/hooks/useSettings";
import { useQueries } from "@tanstack/react-query";
import { marketApi } from "@/lib/market-api";
import type { PocketAsset } from "@/hooks/usePocketAssets";

function useAllPocketAssets(serviceIds: string[]): PocketAsset[] {
  const results = useQueries({
    queries: serviceIds.map((sid) => ({
      queryKey: ["pocket-assets", sid],
      queryFn: async () => {
        const res = await marketApi.get<PocketAsset[]>(`/api/pocket-assets/${sid}`);
        return res.data;
      },
    })),
  });
  return results.flatMap((r) => r.data ?? []);
}

export function AssetsPage() {
  const { services, loading } = useServices();
  const { settings } = useSettings();
  const { fetchPrices, loading: fetchingPrices } = useMarketPrices();
  const [prices, setPrices] = useState<Record<string, number>>({});

  const currency = settings?.currency ?? "EUR";

  const investPockets = services.filter(
    (s) => s.service_type === "crypto" || s.service_type === "invest"
  );

  const allAssets = useAllPocketAssets(investPockets.map((s) => s.id));

  const handleFetchPrices = async () => {
    if (allAssets.length === 0) return;
    const priceAssets = allAssets.map((a) => ({
      api_id: a.api_id ?? a.symbol,
      asset_type: a.asset_type,
    }));
    const result = await fetchPrices(priceAssets, currency);
    const newPrices: Record<string, number> = {};
    for (const asset of allAssets) {
      const apiId = asset.api_id ?? asset.symbol;
      const price = result[apiId];
      if (price != null) {
        newPrices[apiId] = price;
      }
    }
    setPrices((prev) => ({ ...prev, ...newPrices }));
  };

  // Auto-fetch prices on first load when assets are available
  const [autoFetched, setAutoFetched] = useState(false);
  useEffect(() => {
    if (allAssets.length > 0 && !autoFetched) {
      setAutoFetched(true);
      handleFetchPrices();
    }
  }, [allAssets.length, autoFetched]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your investment holdings
          </p>
        </div>
        {allAssets.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleFetchPrices} disabled={fetchingPrices}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${fetchingPrices ? "animate-spin" : ""}`} />
            {fetchingPrices ? "Fetching..." : "Refresh Prices"}
          </Button>
        )}
      </div>

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
        <div className="mt-6 space-y-3 max-w-2xl">
          {investPockets.map((service) => (
            <AssetPocketCard
              key={service.id}
              service={service}
              prices={prices}
              currency={currency}
            />
          ))}
          <p className="text-center text-xs text-muted-foreground pt-2">
            Only showing crypto &amp; invest pockets. Manage pockets on the Profile page.
          </p>
        </div>
      )}
    </div>
  );
}
