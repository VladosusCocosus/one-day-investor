import { useState, useRef, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssetCatalog, AssetType } from "@/hooks/useAssetCatalog";

interface AssetSearchProps {
  assetType?: AssetType;
  searchAssetCatalog: (query: string, assetType?: AssetType) => Promise<AssetCatalog[]>;
  onSelectCatalog: (asset: AssetCatalog) => Promise<void>;
  onCreateCustom: (symbol: string, name: string, assetType: AssetType) => Promise<void>;
}

export function AssetSearch({
  assetType,
  searchAssetCatalog,
  onSelectCatalog,
  onCreateCustom,
}: AssetSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssetCatalog[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    setSearched(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await searchAssetCatalog(value, assetType);
      setResults(res);
      setSearched(true);
      setShowDropdown(true);
    }, 200);
  };

  const handleSelect = async (asset: AssetCatalog) => {
    setLoading(true);
    try {
      await onSelectCatalog(asset);
      setQuery("");
      setResults([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCustom = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      await onCreateCustom(query.trim().toUpperCase(), query.trim(), assetType ?? "crypto");
      setQuery("");
      setResults([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  };

  const noResults = searched && results.length === 0 && query.trim().length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            className="w-full text-xs border rounded px-2 py-1.5 pl-7 bg-background"
            placeholder="Search assets..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
          />
        </div>
        {noResults && (
          <Button size="sm" className="h-7 text-xs" onClick={handleCustom} disabled={loading}>
            <Plus className="h-3 w-3 mr-0.5" />
            Add
          </Button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-background border rounded shadow-md max-h-40 overflow-auto">
          {results.map((asset) => (
            <button
              key={asset.id}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2"
              onClick={() => handleSelect(asset)}
              disabled={loading}
            >
              <span className="font-medium">{asset.symbol}</span>
              <span className="text-muted-foreground">{asset.name}</span>
            </button>
          ))}
        </div>
      )}

      {showDropdown && noResults && (
        <div className="absolute z-10 mt-1 w-full bg-background border rounded shadow-md">
          <div className="px-3 py-1.5 text-xs text-muted-foreground">
            No match. Press <strong>Add</strong> to create "{query.trim().toUpperCase()}" as custom.
          </div>
        </div>
      )}
    </div>
  );
}
