import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { marketApi } from "@/lib/market-api";
import { useMarketPrices } from "@/hooks/useMarketPrices";
import { useSettings } from "@/hooks/useSettings";
import type { ServiceTree } from "@/hooks/useServices";
import type { SnapshotDetail } from "@/hooks/useSnapshots";

interface PocketAssetData {
  id: string;
  service_id: string;
  symbol: string;
  name: string;
  asset_type: "crypto" | "invest";
  quantity: string;
  api_id: string | null;
}

function useAllPocketAssets(serviceIds: string[]): PocketAssetData[] {
  const results = useQueries({
    queries: serviceIds.map((sid) => ({
      queryKey: ["pocket-assets", sid],
      queryFn: async () => {
        const res = await marketApi.get<PocketAssetData[]>(`/api/pocket-assets/${sid}`);
        return res.data;
      },
    })),
  });
  return results.flatMap((r) => r.data ?? []);
}

interface SnapshotFormProps {
  month: string;
  prefill: SnapshotDetail | null;
  tree: ServiceTree[];
  existing: SnapshotDetail | null;
  onSave: (month: string, entries: {
    service_id: string;
    amount: number;
    pocket_asset_id?: string | null;
    quantity?: number | null;
    price?: number | null;
  }[]) => Promise<void>;
  onCancel: () => void;
}

export function SnapshotForm({ month: initialMonth, prefill, tree, existing, onSave, onCancel }: SnapshotFormProps) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  // For common pockets: manual amount entry
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const source = existing ?? prefill;
    if (source) {
      for (const entry of source.entries) {
        if (!entry.pocket_asset_id) {
          initial[entry.service_id] = entry.amount;
        }
      }
    }
    return initial;
  });
  // For asset pockets: prices fetched from market, keyed by pocket_asset_id
  const [assetPrices, setAssetPrices] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    const source = existing ?? prefill;
    if (source) {
      for (const entry of source.entries) {
        if (entry.pocket_asset_id && entry.price) {
          initial[entry.pocket_asset_id] = Number(entry.price);
        }
      }
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const { settings } = useSettings();
  const { fetchPrices, loading: fetchingPrices } = useMarketPrices();

  // Collect crypto/invest service IDs
  const investServiceIds = tree.flatMap((g) => {
    const ids: string[] = [];
    if (g.service.service_type !== "common") ids.push(g.service.id);
    for (const c of g.children) {
      if (c.service_type !== "common") ids.push(c.id);
    }
    return ids;
  });

  const allPocketAssets = useAllPocketAssets(investServiceIds);
  const hasAssets = allPocketAssets.length > 0;

  // Calculate total for a service from its assets
  const getAssetTotal = (serviceId: string): number => {
    const serviceAssets = allPocketAssets.filter((a) => a.service_id === serviceId);
    return serviceAssets.reduce((sum, asset) => {
      const qty = Number(asset.quantity) || 0;
      const price = assetPrices[asset.id] ?? 0;
      return sum + qty * price;
    }, 0);
  };

  const handleFetchPrices = async () => {
    const priceAssets = allPocketAssets.map((a) => ({
      api_id: a.api_id ?? a.symbol,
      asset_type: a.asset_type,
    }));
    const currency = settings?.currency ?? "EUR";
    const prices = await fetchPrices(priceAssets, currency);
    const newPrices: Record<string, number> = {};
    for (const asset of allPocketAssets) {
      const apiId = asset.api_id ?? asset.symbol;
      const price = prices[apiId];
      if (price != null) {
        newPrices[asset.id] = price;
      }
    }
    setAssetPrices((prev) => ({ ...prev, ...newPrices }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries: {
        service_id: string;
        amount: number;
        pocket_asset_id?: string | null;
        quantity?: number | null;
        price?: number | null;
      }[] = [];

      for (const group of tree) {
        const serviceNodes = group.children.length > 0 ? group.children : [group.service];
        for (const service of serviceNodes) {
          const serviceAssets = allPocketAssets.filter((a) => a.service_id === service.id);
          if (serviceAssets.length > 0 && service.service_type !== "common") {
            // Store per-asset entries with qty from pocket_assets and fetched price
            for (const asset of serviceAssets) {
              const qty = Number(asset.quantity) || 0;
              const price = assetPrices[asset.id] ?? 0;
              entries.push({
                service_id: service.id,
                amount: qty * price,
                pocket_asset_id: asset.id,
                quantity: qty,
                price,
              });
            }
          } else {
            entries.push({
              service_id: service.id,
              amount: parseFloat(amounts[service.id] || "0") || 0,
            });
          }
        }
      }

      await onSave(selectedMonth, entries);
    } finally {
      setSaving(false);
    }
  };

  const setAmount = (serviceId: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [serviceId]: value }));
  };

  const monthInputValue = selectedMonth.slice(0, 7);
  const formatMonthLabel = new Date(selectedMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const pricesFetched = Object.keys(assetPrices).length > 0;

  function renderServiceRow(serviceId: string, label: string, serviceType: string) {
    const serviceAssets = allPocketAssets.filter((a) => a.service_id === serviceId);
    if (serviceAssets.length > 0 && serviceType !== "common") {
      // Asset-based pocket: show auto-calculated total
      const total = getAssetTotal(serviceId);
      return (
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm text-foreground truncate">{label}</label>
          <div className="flex-1 text-sm px-3 py-1.5 text-right text-muted-foreground">
            {pricesFetched
              ? total.toLocaleString("en-US", { maximumFractionDigits: 0 })
              : <span className="text-xs italic">Fetch prices to calculate</span>
            }
          </div>
        </div>
      );
    }
    // Common pocket: manual amount input
    return (
      <div className="flex items-center gap-3">
        <label className="w-32 text-sm text-foreground truncate">{label}</label>
        <input
          type="number"
          className="flex-1 text-sm border rounded px-3 py-1.5 bg-background"
          value={amounts[serviceId] ?? ""}
          onChange={(e) => setAmount(serviceId, e.target.value)}
          placeholder="0"
          step="0.01"
        />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              {existing ? "Edit" : "New"} Snapshot
            </h3>
            {existing ? (
              <span className="text-sm text-muted-foreground">— {formatMonthLabel}</span>
            ) : (
              <input
                type="month"
                className="text-sm border rounded px-2 py-1 bg-background"
                value={monthInputValue}
                onChange={(e) => setSelectedMonth(`${e.target.value}-01`)}
              />
            )}
          </div>
          <div className="flex gap-2">
            {hasAssets && (
              <Button variant="outline" size="sm" onClick={handleFetchPrices} disabled={fetchingPrices}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${fetchingPrices ? "animate-spin" : ""}`} />
                {fetchingPrices ? "Fetching..." : "Fetch Prices"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {tree.map((group) => (
            <div key={group.service.id}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {group.service.name}
              </p>
              {group.children.length > 0 ? (
                <div className="space-y-2">
                  {group.children.map((child) => (
                    <div key={child.id}>
                      {renderServiceRow(child.id, child.name, child.service_type)}
                    </div>
                  ))}
                </div>
              ) : (
                renderServiceRow(group.service.id, group.service.name, group.service.service_type)
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
