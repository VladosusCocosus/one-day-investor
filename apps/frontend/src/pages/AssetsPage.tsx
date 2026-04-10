import { useMemo, useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssetDrawer } from "@/components/AssetDrawer";
import { useServices, getLeafPockets, getPocketLabels } from "@/hooks/useServices";
import { useSettings } from "@/hooks/useSettings";
import { useAllPocketAssets } from "@/hooks/useAllPocketAssets";
import { usePriceLookup } from "@/hooks/useMarketPriceLookup";
import type { PocketAsset } from "@/hooks/usePocketAssets";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/lib/use-page-meta";
import { pageMeta } from "@/lib/metadata";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
};

type DrawerMode =
  | { kind: "add" }
  | { kind: "edit"; asset: PocketAsset };

export function AssetsPage() {
  usePageMeta(pageMeta.assets);
  const { services, loading: servicesLoading } = useServices();
  const { settings } = useSettings();
  const currency = settings?.currency ?? "EUR";
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>({ kind: "add" });

  // All crypto/invest services (parents + children) so findPocketAssetsByServiceId
  // is queried for every potential holder, including legacy non-leaf holders.
  const allInvestableIds = useMemo(
    () =>
      services
        .filter(
          (s) => s.service_type === "crypto" || s.service_type === "invest"
        )
        .map((s) => s.id),
    [services]
  );

  const allAssets = useAllPocketAssets(allInvestableIds);
  const { prices } = usePriceLookup(allAssets, currency);

  const leafPockets = useMemo(() => getLeafPockets(services), [services]);
  const pocketLabels = useMemo(() => getPocketLabels(services), [services]);

  // Group assets by service_id. A "non-leaf" service_id may appear too — we
  // render those at the bottom with a warning icon.
  const assetsByService = useMemo(() => {
    const map = new Map<string, PocketAsset[]>();
    for (const a of allAssets) {
      const arr = map.get(a.service_id) ?? [];
      arr.push(a);
      map.set(a.service_id, arr);
    }
    return map;
  }, [allAssets]);

  const rowValue = (a: PocketAsset) => {
    const price = prices[a.api_id ?? a.symbol] ?? 0;
    return (Number(a.quantity) || 0) * price;
  };

  const pocketTotal = (serviceId: string) =>
    (assetsByService.get(serviceId) ?? []).reduce(
      (s, a) => s + rowValue(a),
      0
    );

  const grandTotal = allAssets.reduce((s, a) => s + rowValue(a), 0);
  const grandAssetCount = allAssets.length;
  const grandPocketCount = leafPockets.length;

  // Non-leaf pockets that still contain assets (legacy data)
  const orphanServices = useMemo(() => {
    const leafIds = new Set(leafPockets.map((p) => p.id));
    const byId = new Map(services.map((s) => [s.id, s]));
    const orphanIds = Array.from(assetsByService.keys()).filter(
      (id) => !leafIds.has(id)
    );
    return orphanIds
      .map((id) => byId.get(id))
      .filter((s): s is NonNullable<typeof s> => !!s);
  }, [assetsByService, leafPockets, services]);

  const formatMoney = (v: number) =>
    `${currencySymbol}${Math.round(v).toLocaleString("en-US")}`;

  const openAdd = () => {
    setDrawerMode({ kind: "add" });
    setDrawerOpen(true);
  };

  const openEdit = (asset: PocketAsset) => {
    setDrawerMode({ kind: "edit", asset });
    setDrawerOpen(true);
  };

  const hasNoInvestables = !servicesLoading && leafPockets.length === 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your investment holdings
          </p>
        </div>
        {!hasNoInvestables && (
          <Button onClick={openAdd} size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add asset
          </Button>
        )}
      </div>

      {!hasNoInvestables && (
        <div className="mt-5">
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {formatMoney(grandTotal)}
          </p>
          <p className="text-xs text-muted-foreground">
            across {grandAssetCount}{" "}
            {grandAssetCount === 1 ? "asset" : "assets"} in {grandPocketCount}{" "}
            {grandPocketCount === 1 ? "pocket" : "pockets"}
          </p>
        </div>
      )}

      {servicesLoading ? (
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-md bg-muted/50"
            />
          ))}
        </div>
      ) : hasNoInvestables ? (
        <Card className="mt-6">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No crypto or invest pockets yet. Add them on the Profile page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border bg-card">
          {leafPockets.map((pocket) => {
            const assets = assetsByService.get(pocket.id) ?? [];
            const total = pocketTotal(pocket.id);
            return (
              <PocketSection
                key={pocket.id}
                label={pocketLabels.get(pocket.id) ?? pocket.name}
                total={formatMoney(total)}
                assets={assets}
                rowValue={rowValue}
                formatMoney={formatMoney}
                onRowClick={openEdit}
              />
            );
          })}
          {orphanServices.map((svc) => {
            const assets = assetsByService.get(svc.id) ?? [];
            const total = pocketTotal(svc.id);
            return (
              <PocketSection
                key={svc.id}
                label={svc.name}
                total={formatMoney(total)}
                assets={assets}
                rowValue={rowValue}
                formatMoney={formatMoney}
                onRowClick={openEdit}
                warning="Non-leaf pocket — edit each asset to move it to a sub-pocket"
              />
            );
          })}
          <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </span>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {formatMoney(grandTotal)}
            </span>
          </div>
        </div>
      )}

      <AssetDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        services={services}
        prices={prices}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}

interface PocketSectionProps {
  label: string;
  total: string;
  assets: PocketAsset[];
  rowValue: (a: PocketAsset) => number;
  formatMoney: (v: number) => string;
  onRowClick: (a: PocketAsset) => void;
  warning?: string;
}

function PocketSection({
  label,
  total,
  assets,
  rowValue,
  formatMoney,
  onRowClick,
  warning,
}: PocketSectionProps) {
  return (
    <div className="border-b last:border-b-0">
      {/* Section header */}
      <div className="flex items-center justify-between bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-1.5">
          {warning && (
            <span title={warning}>
              <AlertTriangle className="h-3 w-3 text-destructive" />
            </span>
          )}
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <span className="text-xs font-medium text-foreground tabular-nums">
          {total}
        </span>
      </div>

      {/* Asset rows */}
      {assets.length === 0 ? (
        <div className="px-4 py-3 text-xs italic text-muted-foreground">
          No assets — click <span className="font-medium">Add asset</span> to
          create one
        </div>
      ) : (
        assets.map((a) => {
          const qty = Number(a.quantity) || 0;
          const value = rowValue(a);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onRowClick(a)}
              className={cn(
                "group flex w-full items-center gap-3 border-l-2 border-transparent px-4 py-2.5 text-left transition-colors",
                "hover:border-primary hover:bg-muted/40",
                "focus-visible:border-primary focus-visible:bg-muted/40 focus-visible:outline-none"
              )}
            >
              <span className="w-[60px] shrink-0 font-mono text-[13px] font-semibold text-primary">
                {a.symbol}
              </span>
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {a.name}
              </span>
              <span className="w-[90px] text-right text-[13px] tabular-nums text-foreground">
                {qty.toLocaleString("en-US", { maximumFractionDigits: 8 })}
              </span>
              <span className="w-[90px] text-right text-[13px] font-medium tabular-nums text-foreground">
                {value > 0 ? formatMoney(value) : "—"}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
