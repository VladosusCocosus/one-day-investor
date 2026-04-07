import { useState, useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypeBadge } from "@/components/TypeBadge";
import { AssetSearch } from "@/components/AssetSearch";
import { useAssetCatalog } from "@/hooks/useAssetCatalog";
import { usePocketAssets } from "@/hooks/usePocketAssets";
import type { AssetCatalog, AssetType } from "@/hooks/useAssetCatalog";
import type { Service } from "@/hooks/useServices";

interface AssetPocketCardProps {
  service: Service;
}

function QuantityInput({
  value,
  onSave,
}: {
  value: string;
  onSave: (qty: number) => void;
}) {
  const [draft, setDraft] = useState(value === "0" ? "" : value);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (v: string) => {
    setDraft(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const num = parseFloat(v) || 0;
      if (String(num) !== value) {
        onSave(num);
      }
    }, 500);
  };

  return (
    <input
      type="number"
      className="w-20 text-xs border rounded px-1.5 py-1 bg-background text-right"
      value={draft}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="0"
      step="any"
    />
  );
}

export function AssetPocketCard({ service }: AssetPocketCardProps) {
  const { searchAssetCatalog } = useAssetCatalog();
  const { assets, addAsset, updateQuantity, removeAsset } = usePocketAssets(service.id);

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

  return (
    <div className="border rounded-lg p-3.5 min-w-[250px] flex-1 max-w-[320px]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-foreground">{service.name}</span>
        <TypeBadge type={service.service_type} />
      </div>

      {assets.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-center gap-1.5">
              <span className="text-xs font-medium w-14 shrink-0">{asset.symbol}</span>
              <QuantityInput
                value={asset.quantity}
                onSave={(qty) => updateQuantity(asset.id, qty)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground shrink-0"
                onClick={() => removeAsset(asset.id)}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AssetSearch
        assetType={service.service_type === "crypto" ? "crypto" : "invest"}
        searchAssetCatalog={searchAssetCatalog}
        onSelectCatalog={handleSelectCatalog}
        onCreateCustom={handleCreateCustom}
      />
    </div>
  );
}
