import { useState } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypeBadge } from "@/components/TypeBadge";
import type { ServiceTree, Service } from "@/hooks/useServices";
import type { ServiceType } from "@/hooks/useCatalog";

interface PocketCardProps {
  group: ServiceTree;
  onEdit: (id: string, params: { name?: string; service_type?: ServiceType }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onAddChild: (name: string, parentId: string, serviceType: ServiceType) => Promise<void>;
}

function TypeSelect({
  value,
  onChange,
  className = "",
}: {
  value: ServiceType;
  onChange: (v: ServiceType) => void;
  className?: string;
}) {
  return (
    <select
      className={`text-xs border rounded px-1.5 py-1 bg-background ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value as ServiceType)}
    >
      <option value="common">common</option>
      <option value="invest">invest</option>
      <option value="crypto">crypto</option>
    </select>
  );
}

export function PocketCard({ group, onEdit, onRemove, onAddChild }: PocketCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.service.name);
  const [type, setType] = useState<ServiceType>(group.service.service_type);
  const [children, setChildren] = useState(
    group.children.map((c) => ({ id: c.id, name: c.name, service_type: c.service_type }))
  );
  const [newChildName, setNewChildName] = useState("");
  const [newChildType, setNewChildType] = useState<ServiceType>("common");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setName(group.service.name);
    setType(group.service.service_type);
    setChildren(group.children.map((c) => ({ id: c.id, name: c.name, service_type: c.service_type })));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setNewChildName("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save parent changes
      if (name !== group.service.name || type !== group.service.service_type) {
        await onEdit(group.service.id, { name, service_type: type });
      }
      // Save child changes
      for (const child of children) {
        const original = group.children.find((c) => c.id === child.id);
        if (original && (child.name !== original.name || child.service_type !== original.service_type)) {
          await onEdit(child.id, { name: child.name, service_type: child.service_type });
        }
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddChild = async () => {
    if (!newChildName.trim()) return;
    setSaving(true);
    try {
      await onAddChild(newChildName.trim(), group.service.id, newChildType);
      setNewChildName("");
      setNewChildType("common");
    } finally {
      setSaving(false);
    }
  };

  const updateChild = (id: string, field: "name" | "service_type", value: string) => {
    setChildren((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  if (editing) {
    return (
      <div className="border-2 border-primary rounded-lg p-3.5 min-w-[200px] flex-1 max-w-[280px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <input
              className="text-sm font-semibold border rounded px-2 py-1 bg-background w-[110px]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TypeSelect value={type} onChange={setType} />
          </div>
          <div className="flex gap-1.5">
            <Button variant="default" size="sm" className="h-7 text-xs px-2.5" onClick={handleSave} disabled={saving}>
              {saving ? "..." : "Save"}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </div>

        {children.length > 0 && (
          <div className="space-y-1.5 pl-1">
            {children.map((child) => (
              <div key={child.id} className="flex items-center gap-1.5">
                <input
                  className="text-xs border rounded px-1.5 py-1 bg-background w-[90px]"
                  value={child.name}
                  onChange={(e) => updateChild(child.id, "name", e.target.value)}
                />
                <TypeSelect
                  value={child.service_type}
                  onChange={(v) => updateChild(child.id, "service_type", v)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive"
                  onClick={() => onRemove(child.id)}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-2 pl-1">
          <input
            className="text-xs border border-dashed rounded px-1.5 py-1 bg-background w-[90px]"
            placeholder="New sub-pocket"
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddChild()}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleAddChild}
            disabled={!newChildName.trim() || saving}
          >
            <Plus className="h-2.5 w-2.5 mr-0.5" />
            Add
          </Button>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className="border rounded-lg p-3.5 min-w-[200px] flex-1 max-w-[280px]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">{group.service.name}</div>
          {group.children.length === 0 && (
            <div className="mt-1">
              <TypeBadge type={group.service.service_type} />
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <button
            className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"
            onClick={startEdit}
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"
            onClick={() => onRemove(group.service.id)}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
      {group.children.length > 0 && (
        <div className="mt-2.5 space-y-1.5">
          {group.children.map((child) => (
            <div key={child.id} className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{child.name}</span>
              <TypeBadge type={child.service_type} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
