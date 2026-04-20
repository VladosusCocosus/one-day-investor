import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TypeBadge } from "@/components/TypeBadge";
import type { ServiceTree } from "@/hooks/useServices";

interface ServiceManagerProps {
  tree: ServiceTree[];
  onAdd: (name: string, parentId: string | null) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onEdit: (id: string, params: { name?: string }) => Promise<void>;
  onClose: () => void;
}

export function ServiceManager({ tree, onAdd, onRemove, onEdit, onClose }: ServiceManagerProps) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await onAdd(newName.trim(), newParentId);
    setNewName("");
    setNewParentId(null);
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    await onEdit(id, { name: editName.trim() });
    setEditingId(null);
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">{t("serviceManager.title")}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>{t("common.done")}</Button>
        </div>

        {/* Existing services */}
        <div className="space-y-1 mb-4">
          {tree.map((group) => (
            <div key={group.service.id}>
              {/* Top-level service */}
              <div className="flex items-center gap-2 py-1.5">
                {editingId === group.service.id ? (
                  <>
                    <input
                      className="flex-1 text-sm border rounded px-2 py-1 bg-background"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEdit(group.service.id)}
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(group.service.id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{group.service.name}</span>
                    <TypeBadge type={group.service.service_type} />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => startEdit(group.service.id, group.service.name)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => onRemove(group.service.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
              {/* Children */}
              {group.children.map((child) => (
                <div key={child.id} className="flex items-center gap-2 py-1.5 pl-6">
                  {editingId === child.id ? (
                    <>
                      <input
                        className="flex-1 text-sm border rounded px-2 py-1 bg-background"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleEdit(child.id)}
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(child.id)}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-muted-foreground">{child.name}</span>
                      <TypeBadge type={child.service_type} />
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => startEdit(child.id, child.name)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => onRemove(child.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Add new service */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <input
            className="flex-1 text-sm border rounded px-2 py-1.5 bg-background"
            placeholder={t("serviceManager.serviceName")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <select
            className="text-sm border rounded px-2 py-1.5 bg-background"
            value={newParentId ?? ""}
            onChange={(e) => setNewParentId(e.target.value || null)}
          >
            <option value="">{t("serviceManager.topLevel")}</option>
            {tree.map((g) => (
              <option key={g.service.id} value={g.service.id}>
                ↳ {g.service.name}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("common.add")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
