import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AddServiceSearch } from "@/components/AddServiceSearch";
import { useCatalog } from "@/hooks/useCatalog";
import { useServices, type ServiceTree } from "@/hooks/useServices";
import type { CatalogService, ServiceType } from "@/hooks/useCatalog";

export type PocketDrawerMode =
  | { kind: "add" }
  | { kind: "edit"; parentId: string; focusChildId?: string };

interface PocketDrawerProps {
  mode: PocketDrawerMode | null;
  onModeChange: (mode: PocketDrawerMode | null) => void;
}

export function PocketDrawer({ mode, onModeChange }: PocketDrawerProps) {
  const { tree, addService } = useServices();
  const { searchCatalog, getChildren, subscribe } = useCatalog();

  const open = mode !== null;
  const handleOpenChange = (next: boolean) => {
    if (!next) onModeChange(null);
  };

  // Find the currently-edited parent group, if any.
  const editingGroup: ServiceTree | null = useMemo(() => {
    if (!mode || mode.kind !== "edit") return null;
    return tree.find((g) => g.service.id === mode.parentId) ?? null;
  }, [mode, tree]);

  const handleSelectCatalog = async (service: CatalogService, childIds: string[]) => {
    const created = await subscribe(service.id, childIds);
    const parent = created[0];
    if (parent) {
      onModeChange({ kind: "edit", parentId: parent.id });
    }
  };

  const handleCreateCustom = async (name: string, serviceType: ServiceType) => {
    const parent = await addService(name, null, serviceType);
    onModeChange({ kind: "edit", parentId: parent.id });
  };

  // Header copy
  const isAdd = mode?.kind === "add";
  const title = isAdd ? "New pocket" : editingGroup?.service.name ?? "Editing pocket";
  const description = isAdd
    ? "Search the catalog, or create a custom one"
    : editingGroup
      ? editingGroup.children.length === 0
        ? "Leaf pocket"
        : `${editingGroup.children.length} sub-pocket${editingGroup.children.length === 1 ? "" : "s"}`
      : "";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent widthClass="w-full sm:max-w-[480px]">
        <SheetHeader>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isAdd ? "Add pocket" : "Editing pocket"}
          </div>
          <SheetTitle className="mt-0.5">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <SheetBody>
          {isAdd ? (
            <AddServiceSearch
              searchCatalog={searchCatalog}
              getChildren={getChildren}
              onSelectCatalog={handleSelectCatalog}
              onCreateCustom={handleCreateCustom}
            />
          ) : editingGroup ? (
            <div className="text-xs text-muted-foreground">
              Edit UI arrives in the next task.
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Pocket not found.</div>
          )}
        </SheetBody>

        <SheetFooter>
          {/* Left slot: destructive action in edit mode only (wired in Task 4) */}
          <div />
          {/* Right slot */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onModeChange(null)}>
              Cancel
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
