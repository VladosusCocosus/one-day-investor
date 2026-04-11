import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssetDrawer } from "@/components/AssetDrawer";
import { PocketDrawer, type PocketDrawerMode } from "@/components/PocketDrawer";
import {
  useServices,
  getLeafPockets,
  getLeafCommonPockets,
  getPocketLabels,
} from "@/hooks/useServices";
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

type AssetDrawerMode =
  | { kind: "add"; pocketId: string }
  | { kind: "edit"; asset: PocketAsset };

export function AssetsPage() {
  usePageMeta(pageMeta.assets);
  const { services, loading: servicesLoading } = useServices();
  const { settings } = useSettings();
  const currency = settings?.currency ?? "EUR";
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency;

  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);
  const [assetDrawerMode, setAssetDrawerMode] = useState<AssetDrawerMode>({
    kind: "add",
    pocketId: "",
  });
  const [pocketDrawerMode, setPocketDrawerMode] =
    useState<PocketDrawerMode | null>(null);

  const leafPockets = useMemo(() => getLeafPockets(services), [services]);
  const leafCommonPockets = useMemo(
    () => getLeafCommonPockets(services),
    [services]
  );
  const pocketLabels = useMemo(() => getPocketLabels(services), [services]);

  // All crypto/invest service IDs — parents + children — so legacy non-leaf
  // holders are also queried. Sub-pocket totals still attribute correctly.
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

  const rowValue = (a: PocketAsset) => {
    const price = prices[a.api_id ?? a.symbol] ?? 0;
    return (Number(a.quantity) || 0) * price;
  };

  // Group assets by service_id, sorted by value descending within each pocket.
  const assetsByService = useMemo(() => {
    const map = new Map<string, PocketAsset[]>();
    for (const a of allAssets) {
      const arr = map.get(a.service_id) ?? [];
      arr.push(a);
      map.set(a.service_id, arr);
    }
    for (const [id, arr] of map) {
      arr.sort((x, y) => {
        const vx = (Number(x.quantity) || 0) * (prices[x.api_id ?? x.symbol] ?? 0);
        const vy = (Number(y.quantity) || 0) * (prices[y.api_id ?? y.symbol] ?? 0);
        return vy - vx;
      });
      map.set(id, arr);
    }
    return map;
  }, [allAssets, prices]);

  const pocketTotal = (serviceId: string) =>
    (assetsByService.get(serviceId) ?? []).reduce(
      (s, a) => s + rowValue(a),
      0
    );

  const grandTotal = leafPockets.reduce(
    (s, p) => s + pocketTotal(p.id),
    0
  );
  const grandAssetCount = leafPockets.reduce(
    (s, p) => s + (assetsByService.get(p.id)?.length ?? 0),
    0
  );
  const grandPocketCount = leafPockets.length;

  const hasInvestmentPockets = leafPockets.length > 0;
  const hasCommonPockets = leafCommonPockets.length > 0;
  const hasNoPockets =
    !servicesLoading && !hasInvestmentPockets && !hasCommonPockets;

  const formatMoney = (v: number) =>
    `${currencySymbol}${Math.round(v).toLocaleString("en-US")}`;

  const openAddAsset = (pocketId: string) => {
    setAssetDrawerMode({ kind: "add", pocketId });
    setAssetDrawerOpen(true);
  };

  const openEditAsset = (asset: PocketAsset) => {
    setAssetDrawerMode({ kind: "edit", asset });
    setAssetDrawerOpen(true);
  };

  const openAddPocket = () => {
    setPocketDrawerMode({ kind: "add" });
  };

  const openEditPocket = (pocketId: string) => {
    // The drawer is parent-centric: if this leaf is a child, open its parent
    // and focus it; otherwise open it as its own root.
    const leaf = services.find((s) => s.id === pocketId);
    if (!leaf) return;
    if (leaf.parent_id) {
      setPocketDrawerMode({
        kind: "edit",
        parentId: leaf.parent_id,
        focusChildId: leaf.id,
      });
    } else {
      setPocketDrawerMode({ kind: "edit", parentId: leaf.id });
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your investment holdings
          </p>
        </div>
        {!servicesLoading && (
          <Button variant="outline" size="sm" onClick={openAddPocket}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add pocket
          </Button>
        )}
      </div>

      {!servicesLoading && !hasNoPockets && (
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
      ) : hasNoPockets ? (
        <Card className="mt-6">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No pockets yet. Click <span className="font-medium">Add pocket</span> to start.
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
                onHeaderClick={() => openEditPocket(pocket.id)}
                onAddAsset={() => openAddAsset(pocket.id)}
                onRowClick={openEditAsset}
              />
            );
          })}
          {leafCommonPockets.map((pocket) => (
            <CommonPocketRow
              key={pocket.id}
              label={pocketLabels.get(pocket.id) ?? pocket.name}
              onClick={() => openEditPocket(pocket.id)}
            />
          ))}
          {hasInvestmentPockets && (
            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {formatMoney(grandTotal)}
              </span>
            </div>
          )}
        </div>
      )}

      <AssetDrawer
        open={assetDrawerOpen}
        onOpenChange={setAssetDrawerOpen}
        mode={assetDrawerMode}
        services={services}
        prices={prices}
        currencySymbol={currencySymbol}
      />

      <PocketDrawer
        mode={pocketDrawerMode}
        onModeChange={setPocketDrawerMode}
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
  onHeaderClick: () => void;
  onAddAsset: () => void;
  onRowClick: (a: PocketAsset) => void;
}

function PocketSection({
  label,
  total,
  assets,
  rowValue,
  formatMoney,
  onHeaderClick,
  onAddAsset,
  onRowClick,
}: PocketSectionProps) {
  return (
    <div className="border-b last:border-b-0">
      {/* Section header — left button edits the pocket, right button adds an asset */}
      <div className="flex items-center bg-muted/30">
        <button
          type="button"
          onClick={onHeaderClick}
          className={cn(
            "flex flex-1 items-center px-4 py-2 text-left transition-colors",
            "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
          )}
          aria-label={`Edit pocket ${label}`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </button>
        <span className="px-2 text-xs font-medium text-foreground tabular-nums">
          {total}
        </span>
        <button
          type="button"
          onClick={onAddAsset}
          aria-label={`Add asset to ${label}`}
          className={cn(
            "mr-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors",
            "hover:bg-emerald-50 hover:text-emerald-700",
            "focus-visible:bg-emerald-50 focus-visible:text-emerald-700 focus-visible:outline-none"
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Asset rows */}
      {assets.length === 0 ? (
        <button
          type="button"
          onClick={onAddAsset}
          className="block w-full px-4 py-3 text-left text-xs italic text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
        >
          No assets — click <span className="font-medium">+</span> to add one
        </button>
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

function CommonPocketRow({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between border-b bg-muted/10 px-4 py-2 text-left transition-colors last:border-b-0",
        "hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none"
      )}
      aria-label={`Edit pocket ${label}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
    </button>
  );
}
