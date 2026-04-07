import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Pencil, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useServices } from "@/hooks/useServices";
import { useSnapshots, type SnapshotDetail } from "@/hooks/useSnapshots";
import { SnapshotForm } from "@/components/SnapshotForm";
import { ServiceManager } from "@/components/ServiceManager";

function formatMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatAmount(value: string | number): string {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function AssetsPage() {
  const { tree, addService, removeService, editService, refetch: refetchServices } = useServices();
  const { summaries, loading, getSnapshot, createSnapshot, updateSnapshot } = useSnapshots();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [detail, setDetail] = useState<SnapshotDetail | null>(null);
  const [, setPrevDetail] = useState<SnapshotDetail | null>(null);
  const [mode, setMode] = useState<"view" | "form" | "services">("view");
  const [editingSnapshot, setEditingSnapshot] = useState<SnapshotDetail | null>(null);

  const currentSummary = summaries[currentIndex];
  const prevSummary = summaries[currentIndex + 1];

  const loadDetail = useCallback(async () => {
    if (!currentSummary) {
      setDetail(null);
      return;
    }
    const d = await getSnapshot(currentSummary.id);
    setDetail(d);
  }, [currentSummary, getSnapshot]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  useEffect(() => {
    if (!prevSummary) {
      setPrevDetail(null);
      return;
    }
    getSnapshot(prevSummary.id).then(setPrevDetail);
  }, [prevSummary, getSnapshot]);

  const handleSave = async (month: string, entries: { service_id: string; amount: number }[]) => {
    if (editingSnapshot) {
      await updateSnapshot(editingSnapshot.id, entries);
    } else {
      await createSnapshot(month, entries);
    }
    setMode("view");
    setEditingSnapshot(null);
    setCurrentIndex(0);
    setTimeout(loadDetail, 100);
  };

  const handleNewSnapshot = () => {
    setEditingSnapshot(null);
    setMode("form");
  };

  const handleEditSnapshot = () => {
    setEditingSnapshot(detail);
    setMode("form");
  };

  const handleServicesClose = () => {
    setMode("view");
    refetchServices();
  };

  const change = currentSummary && prevSummary
    ? Number(currentSummary.total) - Number(prevSummary.total)
    : null;

  const newSnapshotMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  };

  if (mode === "services") {
    return (
      <div>
        <h1 className="text-xl font-bold text-foreground">Assets</h1>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Manage your services</p>
        <ServiceManager
          tree={tree}
          onAdd={async (name, parentId) => { await addService(name, parentId); }}
          onRemove={removeService}
          onEdit={async (id, name) => { await editService(id, name); }}
          onClose={handleServicesClose}
        />
      </div>
    );
  }

  if (mode === "form") {
    return (
      <div>
        <h1 className="text-xl font-bold text-foreground">Assets</h1>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          {editingSnapshot ? "Edit snapshot" : "Create new snapshot"}
        </p>
        <SnapshotForm
          month={editingSnapshot ? editingSnapshot.month : newSnapshotMonth()}
          prefill={detail}
          tree={tree}
          existing={editingSnapshot}
          onSave={handleSave}
          onCancel={() => { setMode("view"); setEditingSnapshot(null); }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track your investment portfolio</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMode("services")}>
            <Settings className="h-4 w-4" />
          </Button>
          {detail && (
            <Button variant="ghost" size="sm" onClick={handleEditSnapshot}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          )}
          <Button size="sm" onClick={handleNewSnapshot}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Snapshot
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground text-center">Loading...</p>
      ) : summaries.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-muted-foreground">No snapshots yet</p>
            <Button size="sm" onClick={handleNewSnapshot}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create First Snapshot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentIndex >= summaries.length - 1}
              onClick={() => setCurrentIndex((i) => i + 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                {formatMonth(currentSummary.month)}
              </p>
              <p className="text-sm text-muted-foreground">
                Total: €{formatAmount(currentSummary.total)}
                {change !== null && (
                  <span className={`ml-2 ${change >= 0 ? "text-green-600" : "text-red-500"}`}>
                    ({change >= 0 ? "+" : ""}€{formatAmount(Math.abs(change))})
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentIndex <= 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {detail && (
            <div className="mt-4 grid gap-3">
              {tree.map((group) => {
                const childEntries = group.children.length > 0
                  ? group.children.map((child) => ({
                      name: child.name,
                      amount: detail.entries.find((e) => e.service_id === child.id)?.amount ?? "0",
                    }))
                  : [];
                const standaloneAmount = group.children.length === 0
                  ? detail.entries.find((e) => e.service_id === group.service.id)?.amount ?? "0"
                  : null;
                const subtotal = group.children.length > 0
                  ? childEntries.reduce((sum, e) => sum + Number(e.amount), 0)
                  : Number(standaloneAmount);

                if (subtotal === 0 && !detail.entries.some((e) =>
                  e.service_id === group.service.id || group.children.some((c) => c.id === e.service_id)
                )) {
                  return null;
                }

                return (
                  <Card key={group.service.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-foreground">{group.service.name}</p>
                        <p className="text-sm font-semibold text-foreground">
                          €{formatAmount(subtotal)}
                        </p>
                      </div>
                      {childEntries.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {childEntries.map((entry) => (
                            <div key={entry.name} className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground pl-3">{entry.name}</p>
                              <p className="text-sm text-muted-foreground">€{formatAmount(entry.amount)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
