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

interface PocketAssetWithApiId {
  id: string;
  service_id: string;
  asset_catalog_id: string | null;
  symbol: string;
  name: string;
  asset_type: "crypto" | "invest";
  sort_order: number;
  api_id: string | null;
}

function useAllPocketAssets(serviceIds: string[]): PocketAssetWithApiId[] {
  const results = useQueries({
    queries: serviceIds.map((sid) => ({
      queryKey: ["pocket-assets", sid],
      queryFn: async () => {
        const res = await marketApi.get<PocketAssetWithApiId[]>(`/api/pocket-assets/${sid}`);
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
  const [assetQuantities, setAssetQuantities] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const source = existing ?? prefill;
    if (source) {
      for (const entry of source.entries) {
        if (entry.pocket_asset_id && entry.quantity) {
          initial[entry.pocket_asset_id] = entry.quantity;
        }
      }
    }
    return initial;
  });
  const [assetPrices, setAssetPrices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const source = existing ?? prefill;
    if (source) {
      for (const entry of source.entries) {
        if (entry.pocket_asset_id && entry.price) {
          initial[entry.pocket_asset_id] = entry.price;
        }
      }
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const { settings } = useSettings();
  const { fetchPrices, loading: fetchingPrices } = useMarketPrices();

  // Collect all service IDs that are crypto/invest
  const investServiceIds = tree.flatMap((g) => {
    const ids: string[] = [];
    if (g.service.service_type !== "common") ids.push(g.service.id);
    for (const c of g.children) {
      if (c.service_type !== "common") ids.push(c.id);
    }
    return ids;
  });

  const allPocketAssets = useAllPocketAssets(investServiceIds);

  const setAmount = (serviceId: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [serviceId]: value }));
  };

  const setQuantity = (pocketAssetId: string, value: string) => {
    setAssetQuantities((prev) => ({ ...prev, [pocketAssetId]: value }));
  };

  const setPrice = (pocketAssetId: string, value: string) => {
    setAssetPrices((prev) => ({ ...prev, [pocketAssetId]: value }));
  };

  const handleFetchPrices = async () => {
    const priceAssets = allPocketAssets.map((a) => ({
      api_id: a.api_id ?? a.symbol,
      asset_type: a.asset_type,
    }));
    const currency = settings?.currency ?? "EUR";
    const prices = await fetchPrices(priceAssets, currency);
    const newPrices: Record<string, string> = {};
    for (const asset of allPocketAssets) {
      const apiId = asset.api_id ?? asset.symbol;
      const price = prices[apiId];
      if (price != null) {
        newPrices[asset.id] = String(price);
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
            for (const asset of serviceAssets) {
              const qty = parseFloat(assetQuantities[asset.id] || "0") || 0;
              const prc = parseFloat(assetPrices[asset.id] || "0") || 0;
              entries.push({
                service_id: service.id,
                amount: qty * prc,
                pocket_asset_id: asset.id,
                quantity: qty,
                price: prc,
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

  const monthInputValue = selectedMonth.slice(0, 7);
  const formatMonthLabel = new Date(selectedMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const hasAssets = allPocketAssets.length > 0;

  function renderAssetRows(assets: PocketAssetWithApiId[], indent: string) {
    return assets.map((asset) => {
      const qty = parseFloat(assetQuantities[asset.id] || "0") || 0;
      const prc = parseFloat(assetPrices[asset.id] || "0") || 0;
      const total = qty * prc;
      return (
        <div key={asset.id} className={`flex items-center gap-2 ${indent} mb-1`}>
          <span className="w-16 text-xs font-medium shrink-0">{asset.symbol}</span>
          <input
            type="number"
            className="w-24 text-xs border rounded px-2 py-1 bg-background"
            value={assetQuantities[asset.id] ?? ""}
            onChange={(e) => setQuantity(asset.id, e.target.value)}
            placeholder="Qty"
            step="any"
          />
          <span className="text-xs text-muted-foreground">x</span>
          <input
            type="number"
            className="w-24 text-xs border rounded px-2 py-1 bg-background"
            value={assetPrices[asset.id] ?? ""}
            onChange={(e) => setPrice(asset.id, e.target.value)}
            placeholder="Price"
            step="any"
          />
          <span className="text-xs text-muted-foreground">=</span>
          <span className="text-xs font-medium w-20 text-right">
            {total > 0 ? total.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}
          </span>
        </div>
      );
    });
  }

  function renderAmountInput(serviceId: string, label: string) {
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
                  {group.children.map((child) => {
                    const childAssets = allPocketAssets.filter((a) => a.service_id === child.id);
                    if (childAssets.length > 0 && child.service_type !== "common") {
                      return (
                        <div key={child.id}>
                          <p className="text-xs font-medium text-foreground pl-3 mb-1">{child.name}</p>
                          {renderAssetRows(childAssets, "pl-6")}
                        </div>
                      );
                    }
                    return <div key={child.id}>{renderAmountInput(child.id, child.name)}</div>;
                  })}
                </div>
              ) : (() => {
                const serviceAssets = allPocketAssets.filter((a) => a.service_id === group.service.id);
                if (serviceAssets.length > 0 && group.service.service_type !== "common") {
                  return <div className="space-y-1">{renderAssetRows(serviceAssets, "pl-3")}</div>;
                }
                return renderAmountInput(group.service.id, group.service.name);
              })()}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
