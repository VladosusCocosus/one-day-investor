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

export function AssetPocketCard({ service }: AssetPocketCardProps) {
  const { searchAssetCatalog } = useAssetCatalog();
  const { assets, addAsset, removeAsset } = usePocketAssets(service.id);

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
    <div className="border rounded-lg p-3.5 min-w-[220px] flex-1 max-w-[300px]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-foreground">{service.name}</span>
        <TypeBadge type={service.service_type} />
      </div>

      {assets.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium">{asset.symbol}</span>
                <span className="text-xs text-muted-foreground">{asset.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground"
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
