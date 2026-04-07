import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ServiceTree } from "@/hooks/useServices";
import type { SnapshotDetail } from "@/hooks/useSnapshots";

interface SnapshotFormProps {
  month: string;
  prefill: SnapshotDetail | null;
  tree: ServiceTree[];
  existing: SnapshotDetail | null;
  onSave: (month: string, entries: { service_id: string; amount: number }[]) => Promise<void>;
  onCancel: () => void;
}

export function SnapshotForm({ month, prefill, tree, existing, onSave, onCancel }: SnapshotFormProps) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial: Record<string, string> = {};
    if (prefill) {
      for (const entry of prefill.entries) {
        initial[entry.service_id] = entry.amount;
      }
    }
    if (existing) {
      for (const entry of existing.entries) {
        initial[entry.service_id] = entry.amount;
      }
    }
    setAmounts(initial);
  }, [prefill, existing]);

  const setAmount = (serviceId: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [serviceId]: value }));
  };

  const allServiceIds = tree.flatMap((g) =>
    g.children.length > 0
      ? g.children.map((c) => c.id)
      : [g.service.id]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = allServiceIds.map((id) => ({
        service_id: id,
        amount: parseFloat(amounts[id] || "0") || 0,
      }));
      await onSave(month, entries);
    } finally {
      setSaving(false);
    }
  };

  const formatMonth = new Date(month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            {existing ? "Edit" : "New"} Snapshot — {formatMonth}
          </h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {tree.map((group) => (
            <div key={group.service.id}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {group.service.name}
              </p>
              {group.children.length > 0 ? (
                <div className="space-y-2">
                  {group.children.map((child) => (
                    <div key={child.id} className="flex items-center gap-3">
                      <label className="w-32 text-sm text-foreground truncate">{child.name}</label>
                      <input
                        type="number"
                        className="flex-1 text-sm border rounded px-3 py-1.5 bg-background"
                        value={amounts[child.id] ?? ""}
                        onChange={(e) => setAmount(child.id, e.target.value)}
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="w-32 text-sm text-foreground truncate">{group.service.name}</label>
                  <input
                    type="number"
                    className="flex-1 text-sm border rounded px-3 py-1.5 bg-background"
                    value={amounts[group.service.id] ?? ""}
                    onChange={(e) => setAmount(group.service.id, e.target.value)}
                    placeholder="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
