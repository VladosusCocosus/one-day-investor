import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAssets } from "@/hooks/useAssets";
import { useSnapshots, type SnapshotDetail } from "@/hooks/useSnapshots";
import type { ServiceTree } from "@/hooks/useServices";

export type SnapshotDrawerMode =
  | { kind: "create" }
  | { kind: "edit"; snapshot: SnapshotDetail };

interface SnapshotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SnapshotDrawerMode;
  tree: ServiceTree[];
  currencySymbol: string;
  onCreated?: (snapshotId: string) => void;
  onDeleted?: () => void;
}

interface SnapshotEntryInput {
  service_id: string;
  amount: number;
  pocket_asset_id?: string | null;
  quantity?: number | null;
  price?: number | null;
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

function currentMonthString(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function SnapshotDrawer({
  open,
  onOpenChange,
  mode,
  tree,
  currencySymbol,
  onCreated,
  onDeleted,
}: SnapshotDrawerProps) {
  const { summaries, createSnapshot, updateSnapshot, removeSnapshot } =
    useSnapshots();

  // Stable primitives for the reset effect — mode is a new object each render.
  const modeKind = mode.kind;
  const editingId = mode.kind === "edit" ? mode.snapshot.id : null;

  // Service classification from the tree.
  //
  // Common pockets are containers — money lives only on a leaf child. We never
  // treat a common parent as its own leaf, even if it happens to be childless.
  // Invest/crypto pockets keep the legacy "parent-as-leaf when childless"
  // behavior because their balances are derived from pocket_assets, not direct
  // snapshot entries.
  const { investServiceIds, commonServices, allLeafServices } = useMemo(() => {
    const invest: string[] = [];
    const commons: { id: string; label: string }[] = [];
    const leaves: { id: string; label: string; type: string }[] = [];
    for (const group of tree) {
      const isCommonParent = group.service.service_type === "common";
      const iterate =
        group.children.length > 0
          ? group.children.map((c) => ({
              id: c.id,
              label:
                c.name === group.service.name
                  ? group.service.name
                  : `${group.service.name} · ${c.name}`,
              type: c.service_type,
            }))
          : isCommonParent
            ? [] // Common parent without children — invisible in snapshot UI.
            : [
                {
                  id: group.service.id,
                  label: group.service.name,
                  type: group.service.service_type,
                },
              ];
      for (const leaf of iterate) {
        leaves.push(leaf);
        if (leaf.type === "common") {
          commons.push({ id: leaf.id, label: leaf.label });
        } else {
          invest.push(leaf.id);
        }
      }
    }
    return {
      investServiceIds: invest,
      commonServices: commons,
      allLeafServices: leaves,
    };
  }, [tree]);

  // Pocket assets for invest/crypto services (only used in create mode)
  const { assets: allAssetsFromApi } = useAssets();
  // Filter to only invest/crypto services when in create mode
  const allAssets = useMemo(
    () =>
      modeKind === "create"
        ? allAssetsFromApi.filter((a) => investServiceIds.includes(a.service_id))
        : [],
    [allAssetsFromApi, investServiceIds, modeKind]
  );
  const prices = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of allAssets) {
      if (a.price != null) {
        map[a.api_id ?? a.symbol] = a.price;
      }
    }
    return map;
  }, [allAssets]);
  const pricesLoading = false; // prices come with assets, no separate loading state

  // Form state
  const [month, setMonth] = useState(currentMonthString());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstCommonInputRef = useRef<HTMLInputElement | null>(null);

  // Ref so the reset effect can read the current mode without
  // including it in deps (parent re-renders produce a fresh mode
  // object each time, which would otherwise cause spurious resets).
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Reset form whenever the drawer opens or the identity of the
  // edited snapshot changes. Stable primitive deps only.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    const currentMode = modeRef.current;
    if (currentMode.kind === "edit") {
      setMonth(currentMode.snapshot.month);
      const next: Record<string, string> = {};
      for (const e of currentMode.snapshot.entries) {
        // Only common-pocket entries (no pocket_asset_id) go into the
        // editable state; asset entries are passed through on save as-is.
        if (!e.pocket_asset_id) {
          next[e.service_id] = e.amount;
        }
      }
      setAmounts(next);
    } else {
      setMonth(currentMonthString());
      setAmounts({});
    }
  }, [open, modeKind, editingId]);

  // Auto-focus first common-pocket input when opening
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      firstCommonInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  // Derived values
  const assetTotalByService = useMemo(() => {
    const map = new Map<string, number>();
    for (const asset of allAssets) {
      const qty = Number(asset.quantity) || 0;
      const key = asset.api_id ?? asset.symbol;
      const price = prices[key] ?? 0;
      map.set(
        asset.service_id,
        (map.get(asset.service_id) ?? 0) + qty * price
      );
    }
    return map;
  }, [allAssets, prices]);

  // Stable reference to edit-mode stored entries — keeps runningTotal's
  // dep array primitive-stable (mode is a fresh object each parent render).
  const editEntries =
    mode.kind === "edit" ? mode.snapshot.entries : null;

  const runningTotal = useMemo(() => {
    if (modeKind === "create") {
      let t = 0;
      for (const id of investServiceIds) t += assetTotalByService.get(id) ?? 0;
      for (const c of commonServices)
        t += Number(amounts[c.id] || 0) || 0;
      return t;
    }
    // Edit mode: asset amounts come from stored entries; common amounts come from state
    if (!editEntries) return 0;
    let t = 0;
    for (const e of editEntries) {
      if (e.pocket_asset_id) t += Number(e.amount) || 0;
    }
    for (const c of commonServices) {
      t += Number(amounts[c.id] || 0) || 0;
    }
    return t;
  }, [
    modeKind,
    investServiceIds,
    assetTotalByService,
    commonServices,
    amounts,
    editEntries,
  ]);

  const monthInputValue = month.slice(0, 7);

  const conflictingExisting = useMemo(() => {
    if (modeKind !== "create") return null;
    return summaries.find((s) => s.month.slice(0, 7) === monthInputValue) ?? null;
  }, [modeKind, summaries, monthInputValue]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const entries: SnapshotEntryInput[] = [];

      if (modeKind === "create") {
        // Asset entries — one row per pocket_asset
        for (const asset of allAssets) {
          const qty = Number(asset.quantity) || 0;
          const key = asset.api_id ?? asset.symbol;
          const price = prices[key] ?? 0;
          entries.push({
            service_id: asset.service_id,
            amount: qty * price,
            pocket_asset_id: asset.id,
            quantity: qty,
            price,
          });
        }
        // Common entries — one per manual input
        for (const c of commonServices) {
          const amount = parseFloat(amounts[c.id] || "0") || 0;
          entries.push({ service_id: c.id, amount });
        }
        const created = await createSnapshot(month, entries);
        if (onCreated) onCreated(created.id);
      } else if (mode.kind === "edit") {
        // Pass asset entries through unchanged
        for (const e of mode.snapshot.entries) {
          if (e.pocket_asset_id) {
            entries.push({
              service_id: e.service_id,
              amount: Number(e.amount) || 0,
              pocket_asset_id: e.pocket_asset_id,
              quantity: e.quantity != null ? Number(e.quantity) : null,
              price: e.price != null ? Number(e.price) : null,
            });
          }
        }
        // Rewrite common entries from form state
        for (const c of commonServices) {
          const amount = parseFloat(amounts[c.id] || "0") || 0;
          entries.push({ service_id: c.id, amount });
        }
        await updateSnapshot(mode.snapshot.id, entries);
      }
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (mode.kind !== "edit") return;
    const ok = window.confirm("Delete this snapshot? This can't be undone.");
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await removeSnapshot(mode.snapshot.id);
      if (onDeleted) onDeleted();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const setAmount = (id: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [id]: value }));
  };

  const canSave = !saving;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent widthClass="w-full sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>
            {modeKind === "create" ? "New snapshot" : "Edit snapshot"}
          </SheetTitle>
          <SheetDescription>
            {modeKind === "create"
              ? "Pick a month, confirm values, and save."
              : "Update common-pocket amounts or delete this snapshot."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <div className="space-y-5">
            {/* Month field */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Month
              </label>
              {modeKind === "create" ? (
                <>
                  <input
                    type="month"
                    className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={monthInputValue}
                    onChange={(e) => setMonth(`${e.target.value}-01`)}
                  />
                  {conflictingExisting && (
                    <p className="mt-1.5 text-[11px] text-destructive">
                      A snapshot already exists for this month. Saving will overwrite it.
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-1.5 rounded-md border bg-muted/40 px-3 py-2">
                  <span className="text-sm font-medium text-foreground">
                    {mode.kind === "edit"
                      ? formatMonthLong(mode.snapshot.month)
                      : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Asset pocket rows (create mode only — shows live totals) */}
            {modeKind === "create" && investServiceIds.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Holdings
                </p>
                {pricesLoading && (
                  <p className="mb-2 text-[11px] italic text-muted-foreground">
                    Fetching prices…
                  </p>
                )}
                <div className="overflow-hidden rounded-md border">
                  {allLeafServices
                    .filter((s) => s.type !== "common")
                    .map((svc) => {
                      const total = assetTotalByService.get(svc.id) ?? 0;
                      return (
                        <div
                          key={svc.id}
                          className="flex items-center justify-between border-b bg-muted/20 px-3 py-2 last:border-b-0"
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {svc.label}
                          </span>
                          <span className="text-sm font-medium tabular-nums text-foreground">
                            {total > 0
                              ? formatMoney(total, currencySymbol)
                              : "—"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Asset pocket rows (edit mode — stored subtotals) */}
            {modeKind === "edit" && mode.kind === "edit" && (
              (() => {
                const storedAssetTotals = new Map<string, number>();
                for (const e of mode.snapshot.entries) {
                  if (e.pocket_asset_id) {
                    storedAssetTotals.set(
                      e.service_id,
                      (storedAssetTotals.get(e.service_id) ?? 0) +
                        (Number(e.amount) || 0)
                    );
                  }
                }
                const rows = allLeafServices
                  .filter((s) => s.type !== "common" && storedAssetTotals.has(s.id));
                if (rows.length === 0) return null;
                return (
                  <div>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Holdings (stored)
                    </p>
                    <div className="overflow-hidden rounded-md border">
                      {rows.map((svc) => (
                        <div
                          key={svc.id}
                          className="flex items-center justify-between border-b bg-muted/20 px-3 py-2 last:border-b-0"
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {svc.label}
                          </span>
                          <span className="text-sm font-medium tabular-nums text-foreground">
                            {formatMoney(
                              storedAssetTotals.get(svc.id) ?? 0,
                              currencySymbol
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Common pocket rows — editable in both modes */}
            {commonServices.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Other pockets
                </p>
                <div className="space-y-2">
                  {commonServices.map((svc, i) => (
                    <div
                      key={svc.id}
                      className="flex items-center gap-3"
                    >
                      <label className="flex-1 truncate text-sm text-foreground">
                        {svc.label}
                      </label>
                      <input
                        ref={i === 0 ? firstCommonInputRef : null}
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        className="w-32 rounded-md border bg-background px-3 py-1.5 text-right text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="0"
                        value={amounts[svc.id] ?? ""}
                        onChange={(e) => setAmount(svc.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (i < commonServices.length - 1) {
                              const next = document.querySelectorAll<HTMLInputElement>(
                                'input[type="number"][data-snapshot-common]'
                              )[i + 1];
                              next?.focus();
                            } else if (canSave) {
                              handleSave();
                            }
                          }
                        }}
                        data-snapshot-common
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Running total */}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </span>
              <span className="text-base font-semibold tabular-nums text-foreground">
                {formatMoney(runningTotal, currencySymbol)}
              </span>
            </div>

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        </SheetBody>

        <SheetFooter>
          {modeKind === "edit" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
