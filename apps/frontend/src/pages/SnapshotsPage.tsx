import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useServices } from "@/hooks/useServices";
import { useSnapshots, useSnapshotDetail } from "@/hooks/useSnapshots";
import { useSettings } from "@/hooks/useSettings";
import { SnapshotListRail } from "@/components/SnapshotListRail";
import { SnapshotDetail } from "@/components/SnapshotDetail";
import {
  SnapshotDrawer,
  type SnapshotDrawerMode,
} from "@/components/SnapshotDrawer";
import { usePageMeta } from "@/lib/use-page-meta";
import { pageMeta } from "@/lib/metadata";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
};

export function SnapshotsPage() {
  usePageMeta(pageMeta.snapshots);
  const { tree } = useServices();
  const { summaries, loading, removeSnapshot } = useSnapshots();
  const { settings } = useSettings();
  const currency = settings?.currency ?? "EUR";
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency;

  // Selection is id-based so it survives create/delete without reindexing.
  const [selectedId, setSelectedId] = useState<string | undefined>();

  // Default selection + recovery after delete: jump to the newest snapshot.
  useEffect(() => {
    if (loading) return;
    const present = summaries.some((s) => s.id === selectedId);
    if (!present) {
      setSelectedId(summaries[0]?.id);
    }
  }, [summaries, loading, selectedId]);

  const selectedIndex = summaries.findIndex((s) => s.id === selectedId);
  const selectedSummary = selectedIndex >= 0 ? summaries[selectedIndex] : undefined;
  const prevSummary =
    selectedIndex >= 0 ? summaries[selectedIndex + 1] : undefined;

  const { data: detail, isLoading: detailLoading } = useSnapshotDetail(
    selectedSummary?.id
  );
  const { data: prevDetail } = useSnapshotDetail(prevSummary?.id);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<SnapshotDrawerMode>({
    kind: "create",
  });

  const openCreate = () => {
    setDrawerMode({ kind: "create" });
    setDrawerOpen(true);
  };

  const openEdit = () => {
    if (!detail) return;
    setDrawerMode({ kind: "edit", snapshot: detail });
    setDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedSummary) return;
    const ok = window.confirm("Delete this snapshot? This can't be undone.");
    if (!ok) return;
    try {
      await removeSnapshot(selectedSummary.id);
      // Selection recovery runs via the effect above once summaries refresh.
    } catch (e) {
      // Surface via alert — this is a rare failure path. The drawer and
      // detail view don't show a persistent error banner here because
      // the delete button lives on the detail header.
      alert(
        e instanceof Error ? `Delete failed: ${e.message}` : "Delete failed"
      );
    }
  };

  const hasNoSnapshots = !loading && summaries.length === 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Snapshots</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your portfolio snapshots
          </p>
        </div>
        {!hasNoSnapshots && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New snapshot
          </Button>
        )}
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md bg-muted/50"
              />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
        </div>
      ) : hasNoSnapshots ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
            <p className="text-sm text-muted-foreground">No snapshots yet</p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create first snapshot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <SnapshotListRail
            summaries={summaries}
            selectedId={selectedId}
            currencySymbol={currencySymbol}
            onSelect={setSelectedId}
          />
          <SnapshotDetail
            detail={detail}
            prevDetail={prevDetail}
            tree={tree}
            currencySymbol={currencySymbol}
            loading={detailLoading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      <SnapshotDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        tree={tree}
        currency={currency}
        currencySymbol={currencySymbol}
        onCreated={(id) => setSelectedId(id)}
        onDeleted={() => {
          // Nothing to do — the summaries refetch + effect fallback handle it.
        }}
      />
    </div>
  );
}
