import { useMemo } from "react";
import type { SnapshotSummary } from "@/hooks/useSnapshots";
import { cn } from "@/lib/utils";

interface SnapshotListRailProps {
  summaries: SnapshotSummary[]; // sorted newest-first (API order)
  selectedId: string | undefined;
  currencySymbol: string;
  onSelect: (id: string) => void;
}

function formatTotal(value: string | number, sym: string): string {
  return `${sym}${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
}

function formatMonthLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    timeZone: "UTC",
  });
}

interface DeltaView {
  up: boolean;
  pct: number;
}

function computeDelta(
  current: SnapshotSummary,
  previous: SnapshotSummary | undefined
): DeltaView | null {
  if (!previous) return null;
  const cur = Number(current.total) || 0;
  const prev = Number(previous.total) || 0;
  if (prev === 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  return { up: pct >= 0, pct: Math.abs(pct) };
}

export function SnapshotListRail({
  summaries,
  selectedId,
  currencySymbol,
  onSelect,
}: SnapshotListRailProps) {
  // Group rows by year while preserving the newest-first order.
  const sections = useMemo(() => {
    const out: { year: string; items: { summary: SnapshotSummary; delta: DeltaView | null }[] }[] = [];
    for (let i = 0; i < summaries.length; i++) {
      const summary = summaries[i];
      const previous = summaries[i + 1]; // older neighbor
      const year = getYear(summary.month);
      const delta = computeDelta(summary, previous);
      const tail = out[out.length - 1];
      if (!tail || tail.year !== year) {
        out.push({ year, items: [{ summary, delta }] });
      } else {
        tail.items.push({ summary, delta });
      }
    }
    return out;
  }, [summaries]);

  return (
    <div className="overflow-hidden rounded-xl border bg-card h-fit">
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
        {sections.map((section) => (
          <div key={section.year}>
            <div className="sticky top-0 z-[1] border-b bg-muted/40 px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {section.year}
              </span>
            </div>
            {section.items.map(({ summary, delta }) => {
              const active = summary.id === selectedId;
              return (
                <button
                  key={summary.id}
                  type="button"
                  onClick={() => onSelect(summary.id)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "text-[13px] font-medium",
                        active && "text-[11px] font-semibold uppercase tracking-wider"
                      )}
                    >
                      {formatMonthLong(summary.month)}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums">
                      {formatTotal(summary.total, currencySymbol)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex min-h-[14px] items-center justify-end gap-1 text-[11px] tabular-nums",
                      active
                        ? "text-primary-foreground/85"
                        : delta
                          ? delta.up
                            ? "text-primary"
                            : "text-destructive"
                          : "text-muted-foreground"
                    )}
                  >
                    {delta ? (
                      <>
                        <span>{delta.up ? "▲" : "▼"}</span>
                        <span>{delta.pct.toFixed(1)}%</span>
                      </>
                    ) : (
                      <span>&nbsp;</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
