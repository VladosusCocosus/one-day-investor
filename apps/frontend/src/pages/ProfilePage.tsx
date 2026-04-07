import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AddServiceSearch } from "@/components/AddServiceSearch";
import { PocketCard } from "@/components/PocketCard";
import { useAuth } from "@/hooks/useAuth";
import { useCatalog } from "@/hooks/useCatalog";
import { useServices } from "@/hooks/useServices";
import { useSettings } from "@/hooks/useSettings";
import type { CatalogService, ServiceType } from "@/hooks/useCatalog";

function EditableField({
  label,
  value,
  displayValue,
  type = "text",
  onSave,
}: {
  label: string;
  value: string | number;
  displayValue: string;
  type?: "text" | "number" | "select";
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    if (draft !== String(value)) onSave(draft);
    setEditing(false);
  };

  if (editing) {
    if (type === "select") {
      return (
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{label}</span>
          <select
            className="text-xs font-medium border rounded px-2 py-1 bg-background"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); }}
            onBlur={commit}
            autoFocus
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      );
    }
    return (
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <input
          className="text-xs font-medium border rounded px-2 py-1 bg-background w-24 text-right"
          type={type}
          value={draft}
          min={type === "number" ? 1 : undefined}
          max={label === "Snapshot day" ? 28 : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      className="flex justify-between items-center cursor-pointer hover:bg-muted/50 -mx-1 px-1 rounded"
      onClick={() => { setDraft(String(value)); setEditing(true); }}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{displayValue}</span>
    </div>
  );
}

const currencySymbols: Record<string, string> = { EUR: "\u20ac", USD: "$", GBP: "\u00a3" };

export function ProfilePage() {
  const { user } = useAuth();
  const { searchCatalog, getChildren, subscribe, unsubscribe } = useCatalog();
  const { services, tree, loading, addService, removeService, editService } = useServices();
  const { settings, updateSettings } = useSettings();

  const handleSelectCatalog = async (service: CatalogService, childIds: string[]) => {
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

  const symbol = currencySymbols[settings?.currency ?? "EUR"] ?? "\u20ac";

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Profile</h1>

      {/* Row 1: User info + Settings */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* User info card */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-4">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name ?? "Avatar"}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-lg font-semibold shrink-0">
                  {initials}
                </div>
              )}
              <div>
                <div className="text-base font-semibold text-foreground">{user?.name ?? "User"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{user?.email}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings card */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="text-xs font-semibold text-foreground mb-3">Settings</div>
            <div className="space-y-2.5">
              <EditableField
                label="Snapshot day"
                value={settings?.snapshot_day ?? 1}
                displayValue={`${settings?.snapshot_day ?? 1}${ordinal(settings?.snapshot_day ?? 1)} of month`}
                type="number"
                onSave={(v) => updateSettings({ snapshot_day: Math.min(28, Math.max(1, Number(v))) })}
              />
              <EditableField
                label="Goal"
                value={settings?.goal ?? "0"}
                displayValue={`${symbol}${Number(settings?.goal ?? 0).toLocaleString()}`}
                type="number"
                onSave={(v) => updateSettings({ goal: Number(v) })}
              />
              <EditableField
                label="Currency"
                value={settings?.currency ?? "EUR"}
                displayValue={`${settings?.currency ?? "EUR"} (${symbol})`}
                type="select"
                onSave={(v) => updateSettings({ currency: v })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Pockets */}
      <Card className="mt-4">
        <CardContent className="pt-5 pb-5">
          <div className="text-base font-semibold text-foreground mb-4">Pockets</div>

          {/* Search */}
          <div className="mb-5">
            <AddServiceSearch
              searchCatalog={searchCatalog}
              getChildren={getChildren}
              onSelectCatalog={handleSelectCatalog}
              onCreateCustom={handleCreateCustom}
            />
          </div>

          {/* Pocket grid */}
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : tree.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No pockets yet. Search above to add one.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
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
        </CardContent>
      </Card>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
