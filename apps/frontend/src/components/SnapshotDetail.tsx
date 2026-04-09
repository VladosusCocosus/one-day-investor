import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceTree } from "@/hooks/useServices";
import type { SnapshotDetail as SnapshotDetailData } from "@/hooks/useSnapshots";

interface SnapshotDetailProps {
  detail: SnapshotDetailData | undefined;
  prevDetail: SnapshotDetailData | undefined;
  tree: ServiceTree[];
  currencySymbol: string;
  loading: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function formatMoney(value: number, sym: string): string {
  return `${sym}${Math.round(value).toLocaleString("en-US")}`;
}

function formatMonthLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMonthShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatQty(value: string | number): string {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 8,
  });
}

interface PocketRow {
  serviceId: string;
  label: string;
  subtotal: number;
  prevSubtotal: number | null;
  assetRows: AssetRow[];
}

interface AssetRow {
  pocketAssetId: string;
  symbol: string;
  quantity: string | null;
  value: number;
  prevValue: number | null;
}

function buildRows(
  detail: SnapshotDetailData,
  prevDetail: SnapshotDetailData | undefined,
  tree: ServiceTree[]
): PocketRow[] {
  const rows: PocketRow[] = [];

  const entriesByService = new Map<string, typeof detail.entries>();
  for (const e of detail.entries) {
    const arr = entriesByService.get(e.service_id) ?? [];
    arr.push(e);
    entriesByService.set(e.service_id, arr);
  }

  const prevEntriesByService = new Map<string, typeof detail.entries>();
  if (prevDetail) {
    for (const e of prevDetail.entries) {
      const arr = prevEntriesByService.get(e.service_id) ?? [];
      arr.push(e);
      prevEntriesByService.set(e.service_id, arr);
    }
  }

  const pushRow = (serviceId: string, label: string) => {
    const entries = entriesByService.get(serviceId) ?? [];
    const prevEntries = prevEntriesByService.get(serviceId) ?? [];
    if (entries.length === 0) return;

    const subtotal = entries.reduce((s, e) => s + Number(e.amount || 0), 0);
    const prevSubtotal =
      prevEntries.length > 0
        ? prevEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
        : null;

    const assetRows: AssetRow[] = [];
    for (const e of entries) {
      if (!e.pocket_asset_id) continue;
      const prev = prevEntries.find(
        (pe) => pe.pocket_asset_id === e.pocket_asset_id
      );
      assetRows.push({
        pocketAssetId: e.pocket_asset_id,
        symbol: e.pocket_asset_id, // placeholder — replaced below when catalog is available
        quantity: e.quantity,
        value: Number(e.amount || 0),
        prevValue: prev ? Number(prev.amount || 0) : null,
      });
    }

    if (subtotal === 0 && assetRows.length === 0) return;
    rows.push({ serviceId, label, subtotal, prevSubtotal, assetRows });
  };

  for (const group of tree) {
    if (group.children.length > 0) {
      for (const child of group.children) {
        pushRow(child.id, `${group.service.name} · ${child.name}`);
      }
    } else {
      pushRow(group.service.id, group.service.name);
    }
  }

  return rows;
}

function DeltaLine({
  current,
  previous,
  sym,
}: {
  current: number;
  previous: number | null;
  sym: string;
}) {
  if (previous === null) return null;
  const diff = current - previous;
  if (diff === 0) return null;
  const up = diff > 0;
  return (
    <p
      className={
        "text-[11px] font-medium tabular-nums " +
        (up ? "text-primary" : "text-destructive")
      }
    >
      {up ? "▲" : "▼"} {formatMoney(Math.abs(diff), sym)}
    </p>
  );
}

export function SnapshotDetail({
  detail,
  prevDetail,
  tree,
  currencySymbol,
  loading,
  onEdit,
  onDelete,
}: SnapshotDetailProps) {
  if (loading && !detail) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card p-5">
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-muted/60" />
        <div className="mb-2 h-8 w-40 animate-pulse rounded bg-muted/60" />
        <div className="mb-6 h-3 w-44 animate-pulse rounded bg-muted/50" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">Could not load snapshot</p>
      </div>
    );
  }

  const total = detail.entries.reduce((s, e) => s + Number(e.amount || 0), 0);
  const prevTotal =
    prevDetail != null
      ? prevDetail.entries.reduce((s, e) => s + Number(e.amount || 0), 0)
      : null;
  const diff = prevTotal != null ? total - prevTotal : null;
  const diffPct =
    prevTotal != null && prevTotal !== 0
      ? (((total - prevTotal) / prevTotal) * 100)
      : null;

  const rows = buildRows(detail, prevDetail, tree);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {formatMonthLong(detail.month)}
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
            {formatMoney(total, currencySymbol)}
          </p>
          {diff != null && diffPct != null && diff !== 0 && (
            <p
              className={
                "mt-1 text-xs font-medium tabular-nums " +
                (diff > 0 ? "text-primary" : "text-destructive")
              }
            >
              {diff > 0 ? "▲" : "▼"} {formatMoney(Math.abs(diff), currencySymbol)}
              {" "}
              ({diffPct.toFixed(1)}%)
              {prevDetail ? ` vs ${formatMonthShort(prevDetail.month)}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Pocket list */}
      {rows.length === 0 ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">
          No entries in this snapshot.
        </div>
      ) : (
        <div>
          {rows.map((row) => (
            <div key={row.serviceId} className="border-b last:border-b-0">
              <div className="flex items-center justify-between bg-muted/30 px-5 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {row.label}
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatMoney(row.subtotal, currencySymbol)}
                  </span>
                  <DeltaLine
                    current={row.subtotal}
                    previous={row.prevSubtotal}
                    sym={currencySymbol}
                  />
                </div>
              </div>
              {row.assetRows.length > 0 && (
                <div className="divide-y divide-border/50">
                  {row.assetRows.map((ar) => (
                    <div
                      key={ar.pocketAssetId}
                      className="flex items-center gap-3 px-5 py-2"
                    >
                      <span className="w-[90px] text-xs tabular-nums text-muted-foreground">
                        {ar.quantity ? formatQty(ar.quantity) : ""}
                      </span>
                      <span className="flex-1 truncate text-xs text-muted-foreground">
                        {/* quantity is shown; label is omitted because snapshot entries don't carry symbol text */}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="text-[13px] font-medium tabular-nums text-foreground">
                          {formatMoney(ar.value, currencySymbol)}
                        </span>
                        <DeltaLine
                          current={ar.value}
                          previous={ar.prevValue}
                          sym={currencySymbol}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
