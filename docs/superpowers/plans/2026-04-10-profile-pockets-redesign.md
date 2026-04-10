# Profile — Pockets Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wrapped `PocketCard` grid on `/profile` with a dense hierarchical list (`PocketList`) and move editing into a right-side drawer (`PocketDrawer`) with two modes (`add` / `edit`) following the existing `AssetDrawer` / `SnapshotDrawer` pattern.

**Architecture:** Three new components in `apps/frontend/src/components/` — `PocketTypePill` (small type selector popover used inside the drawer), `PocketList` (header + flat hierarchical list with dot badges), and `PocketDrawer` (two-mode sheet that reuses the existing `AddServiceSearch` in add mode and shows the children editor in edit mode). `ProfilePage` is trimmed to own a single `DrawerMode | null` state and compose the new pieces. `PocketCard` is deleted.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, radix-ui (Dialog via `Sheet`, `Popover`), lucide-react, TanStack Query, existing `useServices` + `useCatalog` hooks. No new dependencies. Frontend has no test runner — verification is `bun run build` + `bun run lint` + a dev-server visual walkthrough.

**Spec:** `docs/superpowers/specs/2026-04-10-profile-pockets-redesign-design.md`

**Branch note:** You are on `main`. Confirm with the user before the first commit if that is acceptable, or create a feature branch first.

---

## Reference snippets

These blocks are the current source of truth for hook signatures, drawer primitives, and data shapes. Later tasks import or mirror them.

### `useServices` surface (from `apps/frontend/src/hooks/useServices.ts`)

```ts
export type ServiceType = "common" | "invest" | "crypto";

export interface Service {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  service_type: ServiceType;
  catalog_service_id: string | null;
}

export interface ServiceTree {
  service: Service;
  children: Service[];
}

// Hook return (abridged)
function useServices(): {
  services: Service[];
  tree: ServiceTree[];
  loading: boolean;
  addService: (name: string, parentId: string | null, serviceType?: ServiceType) => Promise<Service>;
  removeService: (id: string) => Promise<void>;
  editService: (id: string, params: { name?: string; service_type?: ServiceType }) => Promise<Service>;
};
```

### `useCatalog` subscribe/unsubscribe

```ts
// subscribe returns the created Service[] with the parent at index 0
//   verified in packages/database/services/index.ts (subscribeToService)
const subscribe: (catalogServiceId: string, childIds: string[]) => Promise<Service[]>;
const unsubscribe: (catalogServiceId: string) => Promise<unknown>;
```

### Sheet primitive (from `apps/frontend/src/components/ui/sheet.tsx`)

```tsx
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// Usage:
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent widthClass="w-full sm:max-w-[480px]">
    <SheetHeader>
      <SheetTitle>Title</SheetTitle>
      <SheetDescription>Subtitle</SheetDescription>
    </SheetHeader>
    <SheetBody>...</SheetBody>
    <SheetFooter>...</SheetFooter>
  </SheetContent>
</Sheet>
```

### Popover primitive (from `apps/frontend/src/components/ui/popover.tsx`)

```tsx
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
```

### Type-color mapping (new — will live in `PocketTypePill.tsx`)

```ts
// Emerald = invest, amber = crypto, slate = common
// Must stay consistent between PocketList (row dots) and PocketTypePill (pill + popover).
export const TYPE_COLORS: Record<ServiceType, { dotClass: string; label: string }> = {
  invest: { dotClass: "bg-emerald-500", label: "Invest" },
  crypto: { dotClass: "bg-amber-500", label: "Crypto" },
  common: { dotClass: "bg-slate-400", label: "Common" },
};
```

---

## Task 1: Create `PocketTypePill`

A small interactive pill that shows the current type (colored dot + label) and opens a three-option popover on click. Used inside `PocketDrawer` for both leaf-parent type and child-row type.

**Files:**
- Create: `apps/frontend/src/components/PocketTypePill.tsx`

- [ ] **Step 1: Create the new file with the full component**

Write `apps/frontend/src/components/PocketTypePill.tsx`:

```tsx
import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ServiceType } from "@/hooks/useCatalog";

// Emerald = invest, amber = crypto, slate = common.
// Keep in sync with PocketList row dots.
export const TYPE_COLORS: Record<ServiceType, { dotClass: string; label: string }> = {
  invest: { dotClass: "bg-emerald-500", label: "Invest" },
  crypto: { dotClass: "bg-amber-500", label: "Crypto" },
  common: { dotClass: "bg-slate-400", label: "Common" },
};

const TYPE_ORDER: ServiceType[] = ["common", "invest", "crypto"];

interface PocketTypePillProps {
  value: ServiceType;
  onChange: (value: ServiceType) => void;
  className?: string;
}

export function PocketTypePill({ value, onChange, className }: PocketTypePillProps) {
  const [open, setOpen] = useState(false);
  const current = TYPE_COLORS[value];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 cursor-pointer hover:bg-muted/80 transition-colors",
            open && "bg-primary/10 border-primary/35",
            className
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", current.dotClass)} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
            {current.label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto min-w-[140px] p-1">
        <div className="flex flex-col">
          {TYPE_ORDER.map((t) => {
            const info = TYPE_COLORS[t];
            const selected = t === value;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                  "hover:bg-muted",
                  selected && "bg-primary/10 text-primary font-semibold"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", info.dotClass)} />
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/frontend && bunx tsc -b --noEmit`
Expected: no errors related to `PocketTypePill.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/PocketTypePill.tsx
git commit -m "feat(profile): add PocketTypePill component"
```

---

## Task 2: Create `PocketList`

The dense hierarchical list. Pure presentational component — takes the tree and callbacks, renders the section header with the `+` button, and emits `onOpenAdd` / `onOpenEdit` events. Uses the same dot color mapping as `PocketTypePill` (duplicated locally — the pill's `TYPE_COLORS` export is intentionally not imported here to keep the list free of any drawer coupling; both must stay in sync).

**Files:**
- Create: `apps/frontend/src/components/PocketList.tsx`

- [ ] **Step 1: Create the new file with the full component**

Write `apps/frontend/src/components/PocketList.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/frontend && bunx tsc -b --noEmit`
Expected: no errors related to `PocketList.tsx`. (Unused-prop warnings for `onOpenAdd` are not expected because both props are consumed.)

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/PocketList.tsx
git commit -m "feat(profile): add PocketList component"
```

---

## Task 3: Create `PocketDrawer` — shell + add mode

The drawer shell with both modes declared but only `add` mode wired up. In add mode, renders the existing `AddServiceSearch` inline; on successful catalog / custom commit, transitions the same drawer to `edit` mode for the new parent. Edit mode is scaffolded with a placeholder body in this task so the type union and transition work end-to-end; the real edit UI lands in Task 4.

**Files:**
- Create: `apps/frontend/src/components/PocketDrawer.tsx`

- [ ] **Step 1: Create the file with the shell, add mode, and a placeholder edit body**

Write `apps/frontend/src/components/PocketDrawer.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/frontend && bunx tsc -b --noEmit`
Expected: no errors related to `PocketDrawer.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/PocketDrawer.tsx
git commit -m "feat(profile): scaffold PocketDrawer with add mode"
```

---

## Task 4: Implement `PocketDrawer` edit mode

Add the full edit-mode UI: editable parent name, `PocketTypePill` for leaf-parent type, children list with inline name edits + type pills + trash buttons, dashed "+ Add sub-pocket" row, and the Save / Delete footer actions. Cancel in edit mode discards field-edit drafts.

**Files:**
- Modify: `apps/frontend/src/components/PocketDrawer.tsx`

- [ ] **Step 1: Replace the placeholder edit body and extend the component**

Overwrite `apps/frontend/src/components/PocketDrawer.tsx` with the following full implementation:

```tsx
import { useEffect, useMemo, useState } from "react";
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
import type { CatalogService, ServiceType } from "@/hooks/useCatalog";
import { cn } from "@/lib/utils";

export type PocketDrawerMode =
  | { kind: "add" }
  | { kind: "edit"; parentId: string; focusChildId?: string };

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
  const [deleting, setDeleting] = useState(false);

  const parentId = mode?.kind === "edit" ? mode.parentId : null;

  useEffect(() => {
    if (!editingGroup) {
      setParentDraft(null);
      setChildDrafts(new Map());
      setNewChildName("");
      setNewChildType("common");
      return;
    }
    setParentDraft({
      name: editingGroup.service.name,
      service_type: editingGroup.service.service_type,
    });
    setChildDrafts(new Map());
    setNewChildName("");
    setNewChildType("common");
  }, [parentId, editingGroup]);

  // ---- Add-mode handlers -----------------------------------------------------
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
    setSaving(true);
    try {
      await addService(name, parentId, newChildType);
      setNewChildName("");
      setNewChildType("common");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveChild = async (childId: string) => {
    await removeService(childId);
    setChildDrafts((prev) => {
      if (!prev.has(childId)) return prev;
      const next = new Map(prev);
      next.delete(childId);
      return next;
    });
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
            /* Use SheetTitle for a11y (radix Dialog requires it), but render an editable input inside.
               pr-8 reserves space for the Sheet's absolute-positioned close button so text never bleeds
               behind the X. */
            <SheetTitle asChild>
              <input
                type="text"
                value={parentDraft?.name ?? ""}
                onChange={(e) =>
                  setParentDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
                className="mt-0.5 w-full border-none bg-transparent p-0 pr-8 text-base font-semibold text-foreground outline-none"
              />
            </SheetTitle>
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

              {/* Children list */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sub-pockets · {editingGroup.children.length}
                </div>
                <div className="mt-2 space-y-1.5">
                  {editingGroup.children.map((child) => {
                    const draft = childDrafts.get(child.id) ?? {
                      name: child.name,
                      service_type: child.service_type,
                    };
                    const highlighted = child.id === focusChildId;
                    return (
                      <ChildRow
                        key={child.id}
                        child={child}
                        draft={draft}
                        highlighted={highlighted}
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
                      className="flex-1 border-none bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <PocketTypePill value={newChildType} onChange={setNewChildType} />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={handleAddChild}
                      disabled={!newChildName.trim() || saving}
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
                disabled={deleting || saving}
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
              <Button size="sm" onClick={handleSave} disabled={saving || deleting}>
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
  child,
  draft,
  highlighted,
  onNameChange,
  onTypeChange,
  onRemove,
}: {
  child: Service;
  draft: ChildDraft;
  highlighted: boolean;
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
  }, [highlighted, child.id]);

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
        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
        aria-label="Remove sub-pocket"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/frontend && bunx tsc -b --noEmit`
Expected: no errors. If TypeScript complains that `SheetTitle asChild` is not assignable, re-check the `Sheet` import source — the radix `Dialog.Title` does accept `asChild` via radix-ui's primitive. If the local `SheetTitle` wrapper drops the prop, fall back to rendering `<SheetTitle className="sr-only">{titleText}</SheetTitle>` plus a visible `<input>` sibling, keeping accessibility intact.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/PocketDrawer.tsx
git commit -m "feat(profile): implement PocketDrawer edit mode"
```

---

## Task 5: Wire into `ProfilePage` and delete `PocketCard`

Remove the old card-grid rendering, the inline `AddServiceSearch`, and all the handler helpers; replace them with `<PocketList>` + `<PocketDrawer>` bound to a single `PocketDrawerMode | null` state. Delete the now-unused `PocketCard.tsx`.

**Files:**
- Modify: `apps/frontend/src/pages/ProfilePage.tsx`
- Delete: `apps/frontend/src/components/PocketCard.tsx`

- [ ] **Step 1: Rewrite `ProfilePage.tsx`**

Overwrite `apps/frontend/src/pages/ProfilePage.tsx` with:

```tsx
import { useState } from "react";
import { PocketList } from "@/components/PocketList";
import { PocketDrawer, type PocketDrawerMode } from "@/components/PocketDrawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useServices } from "@/hooks/useServices";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

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
  const { tree, loading } = useServices();
  const { settings, updateSettings } = useSettings();

  const [snapshotChipOpen, setSnapshotChipOpen] = useState(false);
  const [currencyChipOpen, setCurrencyChipOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<PocketDrawerMode | null>(null);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

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
      <PocketList
        tree={tree}
        loading={loading}
        onOpenAdd={() => setDrawerMode({ kind: "add" })}
        onOpenEdit={(parentId, focusChildId) =>
          setDrawerMode({ kind: "edit", parentId, focusChildId })
        }
      />

      <PocketDrawer mode={drawerMode} onModeChange={setDrawerMode} />
    </div>
  );
}
```

- [ ] **Step 2: Delete `PocketCard.tsx`**

```bash
git rm apps/frontend/src/components/PocketCard.tsx
```

- [ ] **Step 3: Verify no other file imports `PocketCard`**

Run: `grep -rn "PocketCard" /Users/pavel/Projects/one-day-investor/apps/frontend/src`
Expected: no matches. If any file still imports `PocketCard`, remove that import (there should be none — only `ProfilePage` used it, and we rewrote the page).

- [ ] **Step 4: Typecheck the whole frontend**

Run: `cd apps/frontend && bunx tsc -b --noEmit`
Expected: clean exit, no errors.

- [ ] **Step 5: Lint**

Run: `cd apps/frontend && bun run lint`
Expected: no new warnings beyond the existing baseline.

- [ ] **Step 6: Build**

Run: `cd apps/frontend && bun run build`
Expected: build succeeds with no errors.

- [ ] **Step 7: Manual visual walkthrough**

Run: `bun run --cwd apps/frontend dev`
Open the dev server URL, sign in, navigate to `/profile`, and verify:
- The Pockets section renders as a dense list, with parents bold and children indented under them with colored dots.
- The `+` button next to "Pockets · N" opens the drawer in add mode with `AddServiceSearch` inside.
- Picking a catalog result or creating a custom service transitions the same drawer into edit mode for the new pocket; children preselected via the catalog checkboxes appear.
- Clicking a parent row in the list opens the drawer with that parent's children listed.
- Clicking a child row in the list opens the drawer on the parent and that child's name input is focused, with a briefly visible emerald ring that fades out.
- Editing a child's name + type, pressing Save, flushes the changes and closes the drawer; the list reflects the update.
- Adding a sub-pocket via the dashed row persists and shows up in the list; removing via trash disappears it.
- Deleting a pocket from the drawer footer removes it from the list (catalog-backed pockets call unsubscribe, custom pockets call removeService).
- Cancel closes the drawer without flushing pending field edits (but does not undo already-fired child add/remove).

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/pages/ProfilePage.tsx apps/frontend/src/components/PocketCard.tsx
git commit -m "feat(profile): wire PocketList + PocketDrawer, remove PocketCard"
```

(The `git add` includes the deleted `PocketCard.tsx` because `git rm` in Step 2 only staged the deletion; re-adding keeps everything in a single commit.)

---

## Self-review notes

- **Spec coverage:** section-by-section check against `docs/superpowers/specs/2026-04-10-profile-pockets-redesign-design.md`:
  - List presentation (PocketList) → Task 2 ✓
  - PocketDrawer shell + add mode → Task 3 ✓
  - PocketDrawer edit mode (leaf type, children, add row, delete/save/cancel) → Task 4 ✓
  - State model (drafts re-seeded on parentId change) → Task 4 (the `useEffect` on `[parentId, editingGroup]`) ✓
  - Type pill popover (3 choices) → Task 1 ✓
  - Wiring + deletion of `PocketCard` → Task 5 ✓
- **Verification section of spec** → Task 5 steps 3–7 cover typecheck, lint, build, manual walkthrough, regression. `AssetsPage`, `DashboardPage`, and `AnalyticsPage` are not modified, so the regression check collapses to "do they still render?" which the manual walkthrough covers.
- **Type consistency:** the `ServiceType` import path is `@/hooks/useCatalog` in every task. `PocketDrawerMode` is exported from `PocketDrawer.tsx` and consumed by `ProfilePage`. `TYPE_COLORS` exists in `PocketTypePill.tsx`; `PocketList.tsx` duplicates the dot classes intentionally (documented in Task 2's opening paragraph).
- **Focus ring fade:** implemented via `useEffect` + `setTimeout(800)` + CSS `transition-shadow duration-700`, matching the spec's "emerald ring for ~800 ms, then fades".
- **No placeholders.** Every code block is complete.
