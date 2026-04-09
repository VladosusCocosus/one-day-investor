import { useState } from "react";
import { AddServiceSearch } from "@/components/AddServiceSearch";
import { PocketCard } from "@/components/PocketCard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCatalog } from "@/hooks/useCatalog";
import { useServices } from "@/hooks/useServices";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import type { CatalogService, ServiceType } from "@/hooks/useCatalog";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function SettingsChip({
  label,
  displayValue,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  displayValue: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 cursor-pointer hover:bg-muted/80 transition-colors",
            open && "bg-primary/10 border-primary/35"
          )}
        >
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            {label}
          </span>
          <span className="text-xs font-semibold text-foreground">
            {displayValue}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-[220px] p-3">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function SnapshotDayEditor({
  value,
  onSave,
  onClose,
}: {
  value: number;
  onSave: (value: number) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(String(value));

  const save = () => {
    const n = Math.min(28, Math.max(1, Number(draft) || 1));
    if (n !== value) onSave(n);
    onClose();
  };

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Snapshot day
      </div>
      <input
        type="number"
        min={1}
        max={28}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onClose();
        }}
        autoFocus
        className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function CurrencyEditor({
  value,
  onSave,
  onClose,
}: {
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);

  const save = () => {
    if (draft !== value) onSave(draft);
    onClose();
  };

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Currency
      </div>
      <select
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <option value="EUR">EUR</option>
        <option value="USD">USD</option>
        <option value="GBP">GBP</option>
      </select>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const { searchCatalog, getChildren, subscribe, unsubscribe } = useCatalog();
  const { services, tree, loading, addService, removeService, editService } =
    useServices();
  const { settings, updateSettings } = useSettings();

  const [snapshotChipOpen, setSnapshotChipOpen] = useState(false);
  const [currencyChipOpen, setCurrencyChipOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const handleSelectCatalog = async (
    service: CatalogService,
    childIds: string[]
  ) => {
    await subscribe(service.id, childIds);
  };

  const handleCreateCustom = async (name: string, serviceType: ServiceType) => {
    await addService(name, null, serviceType);
  };

  const handleRemove = async (id: string) => {
    const service = services.find((s) => s.id === id);
    if (service?.catalog_service_id && !service.parent_id) {
      await unsubscribe(service.catalog_service_id);
    } else {
      await removeService(id);
    }
  };

  const snapshotDay = settings?.snapshot_day ?? 1;
  const currency = settings?.currency ?? "EUR";

  return (
    <div>
      {/* Page header */}
      <h1 className="text-xl font-bold text-foreground">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your account, preferences and pockets
      </p>

      {/* Identity strip */}
      <div className="mt-5 flex items-center gap-3">
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name ?? "Avatar"}
            className="h-10 w-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">
            {user?.name ?? "User"}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {user?.email}
          </div>
        </div>
      </div>

      {/* Settings chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        <SettingsChip
          label="Snapshot"
          displayValue={`${snapshotDay}${ordinal(snapshotDay)} of month`}
          open={snapshotChipOpen}
          onOpenChange={setSnapshotChipOpen}
        >
          <SnapshotDayEditor
            value={snapshotDay}
            onSave={(snapshot_day) => updateSettings({ snapshot_day })}
            onClose={() => setSnapshotChipOpen(false)}
          />
        </SettingsChip>
        <SettingsChip
          label="Currency"
          displayValue={currency}
          open={currencyChipOpen}
          onOpenChange={setCurrencyChipOpen}
        >
          <CurrencyEditor
            value={currency}
            onSave={(newCurrency) => updateSettings({ currency: newCurrency })}
            onClose={() => setCurrencyChipOpen(false)}
          />
        </SettingsChip>
      </div>

      {/* Pockets */}
      <div className="mt-6 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Pockets · {tree.length}
      </div>
      <div className="mt-2">
        <AddServiceSearch
          searchCatalog={searchCatalog}
          getChildren={getChildren}
          onSelectCatalog={handleSelectCatalog}
          onCreateCustom={handleCreateCustom}
        />
      </div>
      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground text-center py-6">
          Loading...
        </p>
      ) : tree.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground text-center py-6">
          No pockets yet. Search above to add one.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-3">
          {tree.map((group) => (
            <PocketCard
              key={group.service.id}
              group={group}
              onEdit={editService}
              onRemove={handleRemove}
              onAddChild={async (name, parentId, serviceType) => {
                await addService(name, parentId, serviceType);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
