import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypeBadge } from "@/components/TypeBadge";
import { AssetSearch } from "@/components/AssetSearch";
import { useAssetCatalog } from "@/hooks/useAssetCatalog";
import { usePocketAssets, type PocketAsset } from "@/hooks/usePocketAssets";
import type { AssetCatalog, AssetType } from "@/hooks/useAssetCatalog";
import type { Service } from "@/hooks/useServices";

interface AssetPocketCardProps {
  service: Service;
  prices: Record<string, number>;
  currency: string;
}

function ClickToEditQuantity({
  asset,
  onSave,
}: {
  asset: PocketAsset;
  onSave: (id: string, qty: number) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(asset.quantity);
  const [displayQty, setDisplayQty] = useState(asset.quantity);

  // Sync display when prop updates from server
  if (asset.quantity !== displayQty && !editing) {
    setDisplayQty(asset.quantity);
  }

  const commit = async () => {
    const num = parseFloat(draft) || 0;
    setEditing(false);
    setDisplayQty(String(num));
    if (num !== Number(asset.quantity)) {
      await onSave(asset.id, num);
    }
  };

  if (editing) {
    return (
      <input
        type="number"
        className="w-20 text-[13px] font-medium text-right border-2 border-primary rounded-md px-2 py-1 bg-background outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        step="any"
        autoFocus
      />
    );
  }

  const num = Number(displayQty) || 0;

  return (
    <span
      className="text-[13px] font-medium text-foreground cursor-pointer px-2 py-1 rounded-md bg-muted min-w-[50px] text-right inline-block hover:bg-muted/80"
      onClick={() => {
        setDraft(num === 0 ? "" : String(num));
        setEditing(true);
      }}
    >
      {num}
    </span>
  );
}

function formatValue(qty: number, price: number | undefined, symbol: string): string {
  if (!price || qty === 0) return "—";
  const value = qty * price;
  return `${symbol}${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function AssetPocketCard({ service, prices, currency }: AssetPocketCardProps) {
  const { searchAssetCatalog } = useAssetCatalog();
  const { assets, addAsset, updateQuantity, removeAsset } = usePocketAssets(service.id);

  const currencySymbol: Record<string, string> = { EUR: "\u20ac", USD: "$", GBP: "\u00a3" };
  const sym = currencySymbol[currency] ?? currency;

  const handleSelectCatalog = async (asset: AssetCatalog) => {
    await addAsset({
      service_id: service.id,
      asset_catalog_id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      asset_type: asset.asset_type,
    });
  };

  const handleCreateCustom = async (symbol: string, name: string, assetType: AssetType) => {
    await addAsset({
      service_id: service.id,
      symbol,
      name,
      asset_type: assetType,
    });
  };

  const total = assets.reduce((sum, a) => {
    const qty = Number(a.quantity) || 0;
    const price = prices[a.api_id ?? a.symbol] ?? 0;
    return sum + qty * price;
  }, 0);

  return (
    <div className="bg-background border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-foreground">{service.name}</span>
          <TypeBadge type={service.service_type} />
        </div>
        <AssetSearch
          assetType={service.service_type === "crypto" ? "crypto" : "invest"}
          searchAssetCatalog={searchAssetCatalog}
          onSelectCatalog={handleSelectCatalog}
          onCreateCustom={handleCreateCustom}
        />
      </div>

      {/* Asset rows */}
      {assets.length > 0 && (
        <div>
          {assets.map((asset, i) => {
            const qty = Number(asset.quantity) || 0;
            const price = prices[asset.api_id ?? asset.symbol];
            return (
              <div
                key={asset.id}
                className={`flex items-center gap-2.5 px-4 py-2.5 ${i > 0 ? "border-t border-muted/50" : ""}`}
              >
                <span className="text-[13px] font-semibold text-foreground w-[50px] shrink-0">
                  {asset.symbol}
                </span>
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  {asset.name}
                </span>
                <ClickToEditQuantity
                  asset={asset}
                  onSave={updateQuantity}
                />
                <span className="text-[13px] font-medium text-muted-foreground w-[70px] text-right shrink-0">
                  {formatValue(qty, price, sym)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground shrink-0"
                  onClick={() => removeAsset(asset.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Total */}
      {assets.length > 0 && (
        <div className="flex justify-end px-4 py-2.5 border-t">
          <span className="text-[13px] font-semibold text-foreground">
            Total: {sym}{total.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
        </div>
      )}

      {/* Empty state */}
      {assets.length === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">No assets yet. Search above to add.</p>
        </div>
      )}
    </div>
  );
}
