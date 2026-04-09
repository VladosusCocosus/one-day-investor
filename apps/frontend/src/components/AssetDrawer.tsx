import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Trash2, AlertTriangle } from "lucide-react";
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
import { useAssetCatalog } from "@/hooks/useAssetCatalog";
import { usePocketAssets, type PocketAsset } from "@/hooks/usePocketAssets";
import { getLeafPockets, getPocketLabels, type Service } from "@/hooks/useServices";
import type { AssetCatalog, AssetType } from "@/hooks/useAssetCatalog";
import { cn } from "@/lib/utils";

const LAST_POCKET_KEY = "assets:lastPocketId";

type Mode =
  | { kind: "add" }
  | { kind: "edit"; asset: PocketAsset };

interface AssetDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  services: Service[];
  prices: Record<string, number>;
  currencySymbol: string;
}

interface AssetSelection {
  asset_catalog_id: string | null;
  symbol: string;
  name: string;
  asset_type: AssetType;
  api_id: string | null;
}

function formatMoney(value: number, sym: string): string {
  return `${sym}${Math.round(value).toLocaleString("en-US")}`;
}

export function AssetDrawer({
  open,
  onOpenChange,
  mode,
  services,
  prices,
  currencySymbol,
}: AssetDrawerProps) {
  const { searchAssetCatalog } = useAssetCatalog();
  // usePocketAssets is called without a serviceId — we only use its mutations here.
  const { addAsset, updateAsset, removeAsset } = usePocketAssets(undefined);

  const leafPockets = useMemo(() => getLeafPockets(services), [services]);
  const pocketLabels = useMemo(() => getPocketLabels(services), [services]);

  // Form state
  const [selection, setSelection] = useState<AssetSelection | null>(null);
  const [pocketId, setPocketId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state (add mode only)
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssetCatalog[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);
  const mountedRef = useRef(true);
  const searchSeqRef = useRef(0);

  useEffect(() => {
    // Reset to true on mount — React Strict Mode double-invokes effects
    // in dev, so an earlier cleanup may have set this to false before the
    // real mount completes.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const modeKind = mode.kind;
  const editingId = mode.kind === "edit" ? mode.asset.id : null;

  // Reset form whenever the drawer opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    if (mode.kind === "edit") {
      const a = mode.asset;
      setSelection({
        asset_catalog_id: a.asset_catalog_id,
        symbol: a.symbol,
        name: a.name,
        asset_type: a.asset_type,
        api_id: a.api_id,
      });
      // If the asset lives on a non-leaf pocket, leave the selector empty
      // so the user is forced to pick a leaf.
      const isLeaf = leafPockets.some((p) => p.id === a.service_id);
      setPocketId(isLeaf ? a.service_id : "");
      setQuantity(String(Number(a.quantity) || 0));
      setQuery("");
      setResults([]);
      setSearched(false);
      setSearchOpen(false);
    } else {
      setSelection(null);
      const lastId = localStorage.getItem(LAST_POCKET_KEY);
      const lastIsValid = lastId && leafPockets.some((p) => p.id === lastId);
      setPocketId(lastIsValid ? lastId : leafPockets[0]?.id ?? "");
      setQuantity("");
      setQuery("");
      setResults([]);
      setSearched(false);
      setSearchOpen(false);
      setActiveIndex(-1);
    }
  }, [open, modeKind, editingId, leafPockets]);

  // Keep the keyboard-highlighted row scrolled into view
  useEffect(() => {
    if (activeIndex >= 0 && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Asset search (add mode)
  const handleSearchChange = (value: string) => {
    setQuery(value);
    setSearched(false);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setSearchOpen(false);
      return;
    }
    const seq = ++searchSeqRef.current;
    debounceRef.current = setTimeout(async () => {
      const res = await searchAssetCatalog(value);
      // Ignore result if component unmounted OR a newer search superseded this one.
      if (!mountedRef.current || seq !== searchSeqRef.current) return;
      setResults(res);
      setSearched(true);
      setSearchOpen(true);
      setActiveIndex(res.length > 0 ? 0 : -1);
    }, 200);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Escape: close the dropdown, keep the drawer open
    if (e.key === "Escape" && searchOpen) {
      e.preventDefault();
      e.stopPropagation();
      setSearchOpen(false);
      return;
    }
    if (!searchOpen || results.length === 0) {
      // With no open dropdown, Enter on an empty-result search creates a custom asset
      if (
        e.key === "Enter" &&
        searched &&
        results.length === 0 &&
        query.trim()
      ) {
        e.preventDefault();
        handleCreateCustom();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(results.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[activeIndex >= 0 ? activeIndex : 0];
      if (pick) handlePickCatalog(pick);
    }
  };

  const handlePickCatalog = (asset: AssetCatalog) => {
    setSelection({
      asset_catalog_id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      asset_type: asset.asset_type,
      api_id: asset.api_id,
    });
    setQuery("");
    setResults([]);
    setSearchOpen(false);
  };

  const handleCreateCustom = () => {
    const q = query.trim();
    if (!q) return;
    setSelection({
      asset_catalog_id: null,
      symbol: q.toUpperCase(),
      name: q,
      // Default custom assets to crypto — user can always fix in catalog later.
      asset_type: "crypto",
      api_id: null,
    });
    setQuery("");
    setResults([]);
    setSearchOpen(false);
  };

  const qtyNum = Number(quantity) || 0;
  const previewKey = selection?.api_id ?? selection?.symbol ?? "";
  const previewPrice = previewKey ? prices[previewKey] : undefined;
  const previewValue =
    previewPrice != null && qtyNum > 0 ? qtyNum * previewPrice : null;

  const canSave =
    !!selection &&
    !!pocketId &&
    leafPockets.some((p) => p.id === pocketId) &&
    qtyNum > 0 &&
    !saving;

  const handleSave = async () => {
    if (!selection || !pocketId) return;
    setSaving(true);
    setError(null);
    try {
      if (mode.kind === "add") {
        const created = await addAsset({
          service_id: pocketId,
          asset_catalog_id: selection.asset_catalog_id,
          symbol: selection.symbol,
          name: selection.name,
          asset_type: selection.asset_type,
        });
        if (qtyNum > 0) {
          await updateAsset(created.id, { quantity: qtyNum });
        }
        localStorage.setItem(LAST_POCKET_KEY, pocketId);
      } else {
        const a = mode.asset;
        const patch: { service_id?: string; quantity?: number } = {};
        if (pocketId !== a.service_id) patch.service_id = pocketId;
        if (qtyNum !== Number(a.quantity)) patch.quantity = qtyNum;
        if (Object.keys(patch).length > 0) {
          await updateAsset(a.id, patch);
        }
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
    setSaving(true);
    setError(null);
    try {
      await removeAsset(mode.asset.id);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const onLeafPocket =
    mode.kind === "edit" &&
    !leafPockets.some((p) => p.id === mode.asset.service_id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {mode.kind === "add" ? "Add asset" : "Edit asset"}
          </SheetTitle>
          <SheetDescription>
            {mode.kind === "add"
              ? "Search for an asset, pick a pocket, and enter the quantity."
              : "Update quantity, move to a different pocket, or delete."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <div className="space-y-5">
            {/* Asset field */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Asset
              </label>
              {mode.kind === "edit" ? (
                <div className="mt-1.5 rounded-md border bg-muted/40 px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {mode.asset.symbol}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {mode.asset.name}
                    </span>
                  </div>
                </div>
              ) : selection ? (
                <div className="mt-1.5 flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {selection.symbol}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selection.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelection(null)}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative mt-1.5">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    role="combobox"
                    aria-expanded={searchOpen && results.length > 0}
                    aria-controls="asset-search-listbox"
                    aria-autocomplete="list"
                    aria-activedescendant={
                      activeIndex >= 0 && results[activeIndex]
                        ? `asset-search-option-${results[activeIndex].id}`
                        : undefined
                    }
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-md border bg-background px-3 py-2 pl-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Search assets..."
                    value={query}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                  {searchOpen && results.length > 0 && (
                    <div
                      id="asset-search-listbox"
                      role="listbox"
                      className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-background shadow-md"
                    >
                      {results.map((asset, i) => {
                        const active = i === activeIndex;
                        return (
                          <button
                            type="button"
                            key={asset.id}
                            id={`asset-search-option-${asset.id}`}
                            role="option"
                            aria-selected={active}
                            ref={active ? activeItemRef : null}
                            className={cn(
                              "flex w-full items-baseline gap-2 px-3 py-2 text-left text-xs",
                              active ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                            )}
                            onMouseEnter={() => setActiveIndex(i)}
                            onClick={() => handlePickCatalog(asset)}
                          >
                            <span
                              className={cn(
                                "font-mono font-semibold",
                                active && "text-primary"
                              )}
                            >
                              {asset.symbol}
                            </span>
                            <span className="text-muted-foreground">
                              {asset.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {searchOpen &&
                    searched &&
                    results.length === 0 &&
                    query.trim() && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border bg-background p-3 shadow-md">
                        <p className="text-xs text-muted-foreground">
                          No match for "{query.trim().toUpperCase()}".
                        </p>
                        <Button
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={handleCreateCustom}
                        >
                          Add as custom
                        </Button>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Pocket field */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Pocket
              </label>
              <select
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={pocketId}
                onChange={(e) => setPocketId(e.target.value)}
              >
                <option value="" disabled>
                  Select a pocket
                </option>
                {leafPockets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pocketLabels.get(p.id) ?? p.name}
                  </option>
                ))}
              </select>
              {onLeafPocket && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-destructive">
                  <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" />
                  This asset is on a non-leaf pocket — pick a sub-pocket to
                  save.
                </p>
              )}
            </div>

            {/* Quantity field */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Quantity
              </label>
              <input
                type="number"
                step="any"
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSave) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
            </div>

            {/* Live preview */}
            {selection && qtyNum > 0 && (
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Preview
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {selection.symbol}
                  </span>
                  <span className="text-sm text-foreground tabular-nums">
                    {qtyNum.toLocaleString("en-US", {
                      maximumFractionDigits: 8,
                    })}
                  </span>
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {previewValue != null
                      ? `≈ ${formatMoney(previewValue, currencySymbol)}`
                      : "—"}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        </SheetBody>

        <SheetFooter>
          {mode.kind === "edit" ? (
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
          <Button
            size="sm"
            className={cn(!canSave && "opacity-60")}
            onClick={handleSave}
            disabled={!canSave}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
