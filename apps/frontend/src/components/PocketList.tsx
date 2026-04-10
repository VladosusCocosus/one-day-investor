import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceTree } from "@/hooks/useServices";
import type { ServiceType } from "@/hooks/useCatalog";

// Must stay in sync with TYPE_COLORS in PocketTypePill.tsx
const DOT_CLASS: Record<ServiceType, string> = {
  invest: "bg-emerald-500",
  crypto: "bg-amber-500",
  common: "bg-slate-400",
};

interface PocketListProps {
  tree: ServiceTree[];
  loading: boolean;
  onOpenAdd: () => void;
  onOpenEdit: (parentId: string, focusChildId?: string) => void;
}

export function PocketList({ tree, loading, onOpenAdd, onOpenEdit }: PocketListProps) {
  return (
    <div>
      {/* Section header */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Pockets · {tree.length}
        </div>
        <button
          type="button"
          onClick={onOpenAdd}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition-colors hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
          aria-label="Add pocket"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <p className="mt-3 py-6 text-center text-sm text-muted-foreground">Loading...</p>
      ) : tree.length === 0 ? (
        <p className="mt-3 py-6 text-center text-sm text-muted-foreground">
          No pockets yet. Add one to start tracking.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {tree.map((group) => (
            <PocketGroup key={group.service.id} group={group} onOpenEdit={onOpenEdit} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PocketGroup({
  group,
  onOpenEdit,
}: {
  group: ServiceTree;
  onOpenEdit: (parentId: string, focusChildId?: string) => void;
}) {
  const isLeaf = group.children.length === 0;
  const parent = group.service;

  return (
    <>
      {/* Parent row */}
      <li>
        <button
          type="button"
          onClick={() => onOpenEdit(parent.id)}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
        >
          {isLeaf && (
            <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_CLASS[parent.service_type])} />
          )}
          <span className="flex-1 truncate">{parent.name}</span>
          {!isLeaf && (
            <span className="text-[11px] font-medium text-muted-foreground">
              {group.children.length}
            </span>
          )}
        </button>
      </li>

      {/* Child rows */}
      {group.children.map((child) => (
        <li key={child.id}>
          <button
            type="button"
            onClick={() => onOpenEdit(parent.id, child.id)}
            className="flex w-full items-center gap-2 rounded-md py-1.5 pl-8 pr-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
          >
            <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_CLASS[child.service_type])} />
            <span className="flex-1 truncate">{child.name}</span>
          </button>
        </li>
      ))}
    </>
  );
}
