import { useState, useRef, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypeBadge } from "@/components/TypeBadge";
import type { CatalogService, ServiceType } from "@/hooks/useCatalog";
import { ExchangeConnect } from "./ExchangeConnect";

interface AddServiceSearchProps {
  onSelectCatalog: (service: CatalogService, childIds: string[]) => Promise<void>;
  onCreateCustom: (name: string, serviceType: ServiceType) => Promise<void>;
  searchCatalog: (query: string) => Promise<CatalogService[]>;
  getChildren: (parentId: string) => CatalogService[];
}

export function AddServiceSearch({
  onSelectCatalog,
  onCreateCustom,
  searchCatalog,
  getChildren,
}: AddServiceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogService[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<CatalogService | null>(null);
  const [exchangeConnect, setExchangeConnect] = useState<string | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set());
  const [customType, setCustomType] = useState<ServiceType>("common");
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

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
    setSelected(null);
    setSearched(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const res = await searchCatalog(value);
      setResults(res);
      setSearched(true);
      setShowDropdown(true);
    }, 200);
  };

  const handleSelectCatalog = (service: CatalogService) => {
    const exchangeNames = ["binance", "bybit", "kraken", "coinbase", "okx", "kucoin", "bitfinex", "crypto.com"];
    const serviceName = service.name.toLowerCase();
    if (exchangeNames.includes(serviceName)) {
      setExchangeConnect(serviceName);
      setShowDropdown(false);
      return;
    }
    const children = getChildren(service.id);
    setSelected(service);
    setSelectedChildren(new Set(children.map((c) => c.id)));
    setShowDropdown(false);
    setQuery(service.name);
  };

  const toggleChild = (id: string) => {
    setSelectedChildren((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (selected) {
        await onSelectCatalog(selected, Array.from(selectedChildren));
      } else if (query.trim()) {
        await onCreateCustom(query.trim(), customType);
      }
      setQuery("");
      setSelected(null);
      setResults([]);
      setSelectedChildren(new Set());
    } finally {
      setLoading(false);
    }
  };

  const children = selected ? getChildren(selected.id) : [];
  const noResults = searched && results.length === 0 && query.trim().length > 0;

  if (exchangeConnect) {
    return (
      <ExchangeConnect
        exchange={exchangeConnect}
        onSuccess={() => {
          setExchangeConnect(null);
        }}
        onCancel={() => setExchangeConnect(null)}
      />
    );
  }

  return (
    <div>
      <div>
        <div ref={wrapperRef} className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="w-full text-sm border rounded px-2 py-1.5 pl-8 bg-background"
                placeholder="Search services or type a name..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
              />
            </div>
            {/* Show type selector only for custom (no catalog match) */}
            {!selected && noResults && (
              <select
                className="text-sm border rounded px-2 py-1.5 bg-background"
                value={customType}
                onChange={(e) => setCustomType(e.target.value as ServiceType)}
              >
                <option value="common">Common</option>
                <option value="invest">Invest</option>
                <option value="crypto">Crypto</option>
              </select>
            )}
            {(selected || noResults) && query.trim() && (
              <Button size="sm" onClick={handleConfirm} disabled={loading}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {loading ? "..." : "Add"}
              </Button>
            )}
          </div>

          {/* Search results dropdown */}
          {showDropdown && results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-background border rounded shadow-md max-h-48 overflow-auto">
              {results.map((service) => (
                <button
                  key={service.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => handleSelectCatalog(service)}
                >
                  <span>{service.name}</span>
                  <TypeBadge type={service.service_type} />
                </button>
              ))}
            </div>
          )}

          {/* No results — offer custom creation */}
          {showDropdown && noResults && (
            <div className="absolute z-10 mt-1 w-full bg-background border rounded shadow-md">
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No match found. Press <strong>Add</strong> to create "{query.trim()}" as a custom service.
              </div>
            </div>
          )}
        </div>

        {/* Sub-service selection for catalog match */}
        {selected && children.length > 0 && (
          <div className="mt-3 space-y-2 pl-2">
            <p className="text-xs text-muted-foreground">Select sub-services:</p>
            {children.map((child) => (
              <label
                key={child.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedChildren.has(child.id)}
                  onChange={() => toggleChild(child.id)}
                  className="rounded"
                />
                <span className="text-muted-foreground">{child.name}</span>
                <TypeBadge type={child.service_type} />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
