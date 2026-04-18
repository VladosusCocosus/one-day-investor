import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
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
import { PocketTypePill } from "@/components/PocketTypePill";
import { useCatalog } from "@/hooks/useCatalog";
import { useServices, type Service, type ServiceTree } from "@/hooks/useServices";
import { useExchange } from "@/hooks/useExchange";
import type { CatalogService, ServiceType } from "@/hooks/useCatalog";
import { cn } from "@/lib/utils";

/**
 * Discriminated mode for the pocket drawer. `add` shows the catalog search;
 * `edit` shows the children editor for a given parent (optionally focusing a child).
 */
export type PocketDrawerMode =
  | { kind: "add" }
  | { kind: "edit"; parentId: string; focusChildId?: string };

/**
 * The drawer is controlled via a single `mode: PocketDrawerMode | null` prop.
 * Passing `null` closes the drawer; passing a value both opens it and selects
 * the mode. This is intentionally different from AssetDrawer/SnapshotDrawer
 * (which separate `open` + `mode`) because the add→edit transition must be
 * atomic — the unified prop avoids a split-second window where open/mode are
 * inconsistent.
 */
interface PocketDrawerProps {
  mode: PocketDrawerMode | null;
  onModeChange: (mode: PocketDrawerMode | null) => void;
}

interface ParentDraft {
  name: string;
  service_type: ServiceType;
}

type ChildDraft = { name: string; service_type: ServiceType };

export function PocketDrawer({ mode, onModeChange }: PocketDrawerProps) {
  const { tree, addService, removeService, editService } = useServices();
  const { searchCatalog, getChildren, subscribe, unsubscribe } = useCatalog();
  const { connections, disconnect, disconnecting } = useExchange();

  const open = mode !== null;
  const handleOpenChange = (next: boolean) => {
    if (!next) onModeChange(null);
  };

  // Currently-edited group resolved from live tree
  const editingGroup: ServiceTree | null = useMemo(() => {
    if (!mode || mode.kind !== "edit") return null;
    return tree.find((g) => g.service.id === mode.parentId) ?? null;
  }, [mode, tree]);

  // ---- Drafts ----------------------------------------------------------------
  // Drafts are re-seeded whenever the edited parent changes (including the
  // add → edit transition after a successful create).
  const [parentDraft, setParentDraft] = useState<ParentDraft | null>(null);
  const [childDrafts, setChildDrafts] = useState<Map<string, ChildDraft>>(new Map());
  const [newChildName, setNewChildName] = useState("");
  const [newChildType, setNewChildType] = useState<ServiceType>("common");
  const [saving, setSaving] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingChildId, setRemovingChildId] = useState<string | null>(null);

  const parentId = mode?.kind === "edit" ? mode.parentId : null;

  const exchangeConnection = parentId
    ? connections.find((c) => c.serviceId === parentId)
    : undefined;

  const seededForIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Leaving edit mode (add mode or closed): clear drafts and forget what we seeded.
    if (!mode || mode.kind !== "edit") {
      seededForIdRef.current = null;
      setParentDraft(null);
      setChildDrafts(new Map());
      setNewChildName("");
      setNewChildType("common");
      return;
    }

    // In edit mode but the tree hasn't caught up yet (e.g., the add→edit transition
    // fires before React Query has refetched). Wait for editingGroup to become non-null.
    if (!editingGroup) return;

    // Already seeded for this parent — don't re-seed on subsequent query invalidations,
    // which would wipe the user's in-progress field edits.
    if (seededForIdRef.current === mode.parentId) return;

    seededForIdRef.current = mode.parentId;
    setParentDraft({
      name: editingGroup.service.name,
      service_type: editingGroup.service.service_type,
    });
    setChildDrafts(new Map());
    setNewChildName("");
    setNewChildType("common");
  }, [mode, editingGroup]);

  // ---- Add-mode handlers -----------------------------------------------------
  const handleSelectCatalog = async (service: CatalogService, childIds: string[]) => {
    try {
      const created = await subscribe(service.id, childIds);
      const parent = created[0];
      if (parent) {
        onModeChange({ kind: "edit", parentId: parent.id });
      }
    } catch (err) {
      console.error("Failed to subscribe to catalog service", err);
      throw err;
    }
  };

  const handleCreateCustom = async (name: string, serviceType: ServiceType) => {
    try {
      const parent = await addService(name, null, serviceType);
      onModeChange({ kind: "edit", parentId: parent.id });
    } catch (err) {
      console.error("Failed to create custom pocket", err);
      throw err;
    }
  };

  // ---- Edit-mode handlers ----------------------------------------------------
  const updateChildDraft = (childId: string, patch: Partial<ChildDraft>, original: Service) => {
    setChildDrafts((prev) => {
      const next = new Map(prev);
      const base: ChildDraft = prev.get(childId) ?? {
        name: original.name,
        service_type: original.service_type,
      };
      next.set(childId, { ...base, ...patch });
      return next;
    });
  };

  const handleAddChild = async () => {
    if (!parentId) return;
    const name = newChildName.trim();
    if (!name) return;
    setAddingChild(true);
    try {
      await addService(name, parentId, newChildType);
      setNewChildName("");
      setNewChildType("common");
    } finally {
      setAddingChild(false);
    }
  };

  const handleRemoveChild = async (childId: string) => {
    if (removingChildId) return; // defense in depth against double-fire
    setRemovingChildId(childId);
    try {
      await removeService(childId);
      setChildDrafts((prev) => {
        if (!prev.has(childId)) return prev;
        const next = new Map(prev);
        next.delete(childId);
        return next;
      });
    } finally {
      setRemovingChildId(null);
    }
  };

  const handleSave = async () => {
    if (!editingGroup || !parentDraft) return;
    setSaving(true);
    try {
      const parent = editingGroup.service;
      // Flush parent draft
      if (
        parentDraft.name !== parent.name ||
        parentDraft.service_type !== parent.service_type
      ) {
        await editService(parent.id, {
          name: parentDraft.name,
          service_type: parentDraft.service_type,
        });
      }
      // Flush child drafts
      for (const [childId, draft] of childDrafts.entries()) {
        const original = editingGroup.children.find((c) => c.id === childId);
        if (!original) continue;
        if (draft.name !== original.name || draft.service_type !== original.service_type) {
          await editService(childId, {
            name: draft.name,
            service_type: draft.service_type,
          });
        }
      }
      onModeChange(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteParent = async () => {
    if (!editingGroup) return;
    setDeleting(true);
    try {
      const parent = editingGroup.service;
      if (parent.catalog_service_id) {
        await unsubscribe(parent.catalog_service_id);
      } else {
        await removeService(parent.id);
      }
      onModeChange(null);
    } finally {
      setDeleting(false);
    }
  };

  // ---- Header copy -----------------------------------------------------------
  const isAdd = mode?.kind === "add";
  const titleText = isAdd
    ? "New pocket"
    : parentDraft?.name ?? editingGroup?.service.name ?? "Editing pocket";
  const description = isAdd
    ? "Search the catalog, or create a custom one"
    : editingGroup
      ? editingGroup.children.length === 0
        ? "Leaf pocket"
        : `${editingGroup.children.length} sub-pocket${editingGroup.children.length === 1 ? "" : "s"}`
      : "";

  const isLeafParent = editingGroup?.children.length === 0;
  const focusChildId = mode?.kind === "edit" ? mode.focusChildId : undefined;

  // Every pocket must have at least one leaf — block save and surface a hint
  // until the user adds a sub-pocket. Applies regardless of service_type, and
  // covers freshly subscribed catalog pockets that arrived without children.
  const needsChild =
    !!editingGroup && editingGroup.children.length === 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent widthClass="w-full sm:max-w-[480px]">
        <SheetHeader>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isAdd ? "Add pocket" : "Editing pocket"}
          </div>
          {isAdd ? (
            <SheetTitle className="mt-0.5">{titleText}</SheetTitle>
          ) : (
            <>
              {/* Screen-reader-only title: radix Dialog requires SheetTitle for the aria-labelledby link.
                  The visible UI is the editable <input> below. */}
              <SheetTitle className="sr-only">{titleText}</SheetTitle>
              <input
                type="text"
                value={parentDraft?.name ?? ""}
                onChange={(e) =>
                  setParentDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
                aria-label="Pocket name"
                className="mt-0.5 w-full border-none bg-transparent p-0 pr-8 text-base font-semibold text-foreground outline-none"
              />
            </>
          )}
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
          ) : !editingGroup || !parentDraft ? (
            <div className="text-xs text-muted-foreground">Pocket not found.</div>
          ) : (
            <div className="space-y-5">
              {/* Leaf-parent type row */}
              {isLeafParent && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Type
                  </div>
                  <div className="mt-2">
                    <PocketTypePill
                      value={parentDraft.service_type}
                      onChange={(service_type) =>
                        setParentDraft((prev) => (prev ? { ...prev, service_type } : prev))
                      }
                    />
                  </div>
                </div>
              )}

              {/* Exchange connection badge */}
              {exchangeConnection && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium text-green-700">Connected</span>
                    <span className="text-xs text-green-600">
                      {exchangeConnection.exchange} · {exchangeConnection.label}
                    </span>
                  </div>
                  <button
                    onClick={() => disconnect(exchangeConnection.id)}
                    disabled={disconnecting}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </button>
                </div>
              )}

              {/* Children list */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sub-pockets · {editingGroup.children.length}
                </div>
                {needsChild && (
                  <p className="mt-1 text-[11px] text-destructive">
                    A pocket needs at least one sub-pocket before you can save.
                  </p>
                )}
                <div className="mt-2 space-y-1.5">
                  {editingGroup.children.map((child) => {
                    const draft = childDrafts.get(child.id) ?? {
                      name: child.name,
                      service_type: child.service_type,
                    };
                    const highlighted = child.id === focusChildId;
                    // Every pocket must keep at least one leaf — block removal
                    // of the only child regardless of service_type.
                    const isOnlyChild = editingGroup.children.length === 1;
                    return (
                      <ChildRow
                        key={child.id}
                        draft={draft}
                        highlighted={highlighted}
                        removing={removingChildId === child.id}
                        removeDisabled={isOnlyChild}
                        removeDisabledReason={
                          isOnlyChild
                            ? "A pocket must keep at least one sub-pocket."
                            : undefined
                        }
                        onNameChange={(name) => updateChildDraft(child.id, { name }, child)}
                        onTypeChange={(service_type) =>
                          updateChildDraft(child.id, { service_type }, child)
                        }
                        onRemove={() => handleRemoveChild(child.id)}
                      />
                    );
                  })}

                  {/* Add sub-pocket row */}
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-background p-2">
                    <input
                      type="text"
                      value={newChildName}
                      onChange={(e) => setNewChildName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddChild();
                        }
                      }}
                      placeholder="+ Add sub-pocket"
                      aria-label="New sub-pocket name"
                      className="flex-1 border-none bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <PocketTypePill value={newChildType} onChange={setNewChildType} />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={handleAddChild}
                      disabled={!newChildName.trim() || addingChild || saving || deleting}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          {/* Left slot */}
          <div>
            {!isAdd && editingGroup && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteParent}
                disabled={deleting || saving || addingChild}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete pocket
              </Button>
            )}
          </div>
          {/* Right slot */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onModeChange(null)}>
              Cancel
            </Button>
            {!isAdd && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || deleting || addingChild || needsChild}
                title={
                  needsChild
                    ? "Add at least one sub-pocket first"
                    : undefined
                }
              >
                {saving ? "..." : "Save"}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---- Child row ---------------------------------------------------------------

function ChildRow({
  draft,
  highlighted,
  removing,
  removeDisabled,
  removeDisabledReason,
  onNameChange,
  onTypeChange,
  onRemove,
}: {
  draft: ChildDraft;
  highlighted: boolean;
  removing: boolean;
  removeDisabled?: boolean;
  removeDisabledReason?: string;
  onNameChange: (name: string) => void;
  onTypeChange: (value: ServiceType) => void;
  onRemove: () => void;
}) {
  // Fade the focus ring ~800ms after mount when this row is the focused child.
  const [ringVisible, setRingVisible] = useState(highlighted);
  useEffect(() => {
    if (!highlighted) return;
    const t = setTimeout(() => setRingVisible(false), 800);
    return () => clearTimeout(t);
  }, [highlighted]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-background p-2 transition-shadow duration-700",
        ringVisible && "ring-2 ring-primary/40"
      )}
    >
      <input
        type="text"
        value={draft.name}
        onChange={(e) => onNameChange(e.target.value)}
        autoFocus={highlighted}
        className="flex-1 border-none bg-transparent text-[13px] text-foreground outline-none"
      />
      <PocketTypePill value={draft.service_type} onChange={onTypeChange} />
      <button
        type="button"
        onClick={onRemove}
        disabled={removing || removeDisabled}
        title={removeDisabled ? removeDisabledReason : undefined}
        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        aria-label="Remove sub-pocket"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
