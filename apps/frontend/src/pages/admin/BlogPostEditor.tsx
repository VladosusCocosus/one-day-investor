import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { blogApi } from "@/lib/blogApi";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, X, Plus, ImagePlus } from "lucide-react";

type Block = Record<string, any> & { type: string };

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  content: Block[];
  publish_date: string | null;
}

interface FieldDef {
  path: string;
  label: string;
  type: "text" | "textarea" | "lines" | "select" | "json" | "image-url";
  options?: string[];
}

interface BlockSchema {
  label: string;
  fields: FieldDef[];
  defaults: () => Block;
}

const SCHEMAS: Record<string, BlockSchema> = {
  hero: {
    label: "Hero",
    fields: [
      { path: "label", label: "Label", type: "text" },
      { path: "title", label: "Title", type: "text" },
      { path: "subtitle", label: "Subtitle", type: "text" },
    ],
    defaults: () => ({ type: "hero", label: "", title: "", subtitle: "" }),
  },
  prose: {
    label: "Prose",
    fields: [
      { path: "label", label: "Label", type: "text" },
      { path: "heading", label: "Heading", type: "text" },
      { path: "paragraphs", label: "Paragraphs (one per line)", type: "lines" },
    ],
    defaults: () => ({ type: "prose", label: "", heading: "", paragraphs: [] }),
  },
  "pull-quote": {
    label: "Pull quote",
    fields: [{ path: "text", label: "Quote text", type: "textarea" }],
    defaults: () => ({ type: "pull-quote", text: "" }),
  },
  comparison: {
    label: "Comparison",
    fields: [
      { path: "label", label: "Label", type: "text" },
      { path: "heading", label: "Heading", type: "text" },
      { path: "intro", label: "Intro", type: "textarea" },
      { path: "left.label", label: "Left column label", type: "text" },
      { path: "left.items", label: "Left items (one per line)", type: "lines" },
      { path: "right.label", label: "Right column label", type: "text" },
      { path: "right.items", label: "Right items (one per line)", type: "lines" },
      { path: "outro", label: "Outro", type: "textarea" },
    ],
    defaults: () => ({
      type: "comparison", label: "", heading: "", intro: "",
      left: { label: "", items: [] }, right: { label: "", items: [] }, outro: "",
    }),
  },
  closing: {
    label: "Closing",
    fields: [
      { path: "text", label: "Closing text", type: "textarea" },
      { path: "author", label: "Author", type: "text" },
    ],
    defaults: () => ({ type: "closing", text: "", author: "" }),
  },
  image: {
    label: "Image",
    fields: [
      { path: "src", label: "Image URL", type: "image-url" },
      { path: "alt", label: "Alt text", type: "text" },
      { path: "caption", label: "Caption", type: "text" },
    ],
    defaults: () => ({ type: "image", src: "", alt: "", caption: "" }),
  },
  markdown: {
    label: "Markdown",
    fields: [
      { path: "label", label: "Label", type: "text" },
      { path: "heading", label: "Heading", type: "text" },
      { path: "body", label: "Markdown body", type: "textarea" },
    ],
    defaults: () => ({ type: "markdown", label: "", heading: "", body: "" }),
  },
  chart: {
    label: "Chart",
    fields: [
      { path: "chartType", label: "Chart type", type: "select", options: ["bar", "horizontal-bar", "line", "donut"] },
      { path: "heading", label: "Heading", type: "text" },
      { path: "caption", label: "Caption (source)", type: "text" },
      { path: "height", label: "Height (px)", type: "text" },
      { path: "data.labels", label: "Labels (one per line)", type: "lines" },
      { path: "data.series", label: "Series (JSON array)", type: "json" },
      { path: "options.colors", label: "Colors (JSON array of hex)", type: "json" },
      { path: "options.suffix", label: "Value suffix (e.g. %)", type: "text" },
      { path: "options.prefix", label: "Value prefix (e.g. \u20ac)", type: "text" },
    ],
    defaults: () => ({
      type: "chart", chartType: "bar", heading: "", caption: "",
      height: 300, data: { labels: [], series: [] },
      options: { colors: [], suffix: "", prefix: "" },
    }),
  },
};

function getPath(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj: any, path: string, value: any): void {
  const keys = path.split(".");
  const last = keys.pop()!;
  let target = obj;
  for (const k of keys) {
    if (target[k] == null) target[k] = {};
    target = target[k];
  }
  target[last] = value;
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function BlockField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: any;
  onChange: (value: any) => void;
}) {
  if (field.type === "text") {
    return (
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          {field.label}
        </label>
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          {field.label}
        </label>
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={cn(inputCls, "resize-y")}
        />
      </div>
    );
  }
  if (field.type === "lines") {
    const text = Array.isArray(value) ? value.join("\n") : (value || "");
    return (
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          {field.label}
        </label>
        <textarea
          value={text}
          onChange={(e) => {
            const lines = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
            onChange(lines);
          }}
          rows={4}
          className={cn(inputCls, "resize-y")}
        />
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          {field.label}
        </label>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        >
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }
  if (field.type === "json") {
    const jsonText = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return (
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          {field.label}
        </label>
        <textarea
          value={jsonText}
          onChange={(e) => {
            try { onChange(JSON.parse(e.target.value)); } catch { /* keep raw until valid */ }
          }}
          rows={4}
          className={cn(inputCls, "resize-y font-mono text-xs")}
        />
      </div>
    );
  }
  if (field.type === "image-url") {
    return <ImageUrlField value={value} onChange={onChange} label={field.label} />;
  }
  return null;
}

function ImageUrlField({
  value,
  onChange,
  label,
}: {
  value: any;
  onChange: (value: string) => void;
  label: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<{ url: string }>("/api/admin/upload-image", form);
      onChange(res.data.url);
    } catch {
      // silently ignore
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      <div
        className={cn(
          "relative rounded-md border transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file?.type.startsWith("image/")) handleUpload(file);
        }}
      >
        {dragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-primary/10 pointer-events-none">
            <span className="text-sm font-medium text-primary">Drop image here</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste URL or drop an image"
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
          />
          <label
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 mr-1 text-xs font-medium text-muted-foreground cursor-pointer hover:bg-muted transition-colors",
              uploading && "opacity-50 pointer-events-none"
            )}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {uploading ? "..." : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {value && (
        <img
          src={value}
          alt="Preview"
          className="mt-2 max-h-40 rounded-md border border-border object-contain"
        />
      )}
    </div>
  );
}

function BlockCard({
  block,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  block: Block;
  index: number;
  total: number;
  onUpdate: (block: Block) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const schema = SCHEMAS[block.type];
  if (!schema) return null;

  const handleFieldChange = (path: string, value: any) => {
    const updated = JSON.parse(JSON.stringify(block));
    setPath(updated, path, value);
    onUpdate(updated);
  };

  const handleTypeChange = (newType: string) => {
    if (newType === block.type) return;
    if (!confirm("Changing the block type will reset its fields. Continue?")) return;
    const newSchema = SCHEMAS[newType];
    if (newSchema) onUpdate(newSchema.defaults());
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="shrink-0 text-xs font-semibold text-primary">#{index + 1}</span>
        <select
          value={block.type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none"
        >
          {Object.entries(SCHEMAS).map(([key, s]) => (
            <option key={key} value={key}>{s.label}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          className="h-8 w-8 shrink-0 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 flex items-center justify-center"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          className="h-8 w-8 shrink-0 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 flex items-center justify-center"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="h-8 w-8 shrink-0 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center justify-center"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-3">
        {schema.fields.map((field) => (
          <BlockField
            key={field.path}
            field={field}
            value={getPath(block, field.path)}
            onChange={(val) => handleFieldChange(field.path, val)}
          />
        ))}
      </div>
    </div>
  );
}

export function BlogPostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [newBlockType, setNewBlockType] = useState("hero");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [notifyConfirming, setNotifyConfirming] = useState(false);
  const [notifyPreviewHtml, setNotifyPreviewHtml] = useState<string | null>(null);

  const { data: post } = useQuery({
    queryKey: ["admin", "blog", "post", id],
    queryFn: async () => {
      const res = await blogApi.get<BlogPost>(`/api/admin/posts/${id}`);
      return res.data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt);
      setTags(post.tags.join(", "));
      setPublishDate(post.publish_date ?? "");
      setBlocks(post.content);
    }
  }, [post]);

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        slug,
        excerpt,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        content: blocks,
        publish_date: publishDate || null,
      };
      if (isNew) {
        await blogApi.post("/api/admin/posts", payload);
      } else {
        await blogApi.put(`/api/admin/posts/${id}`, payload);
      }
      navigate("/admin/blog");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleNotifyPreview = async () => {
    try {
      const res = await api.post<{ html: string }>("/api/admin/blog-post/preview", {
        title, excerpt, slug,
      });
      setNotifyPreviewHtml(res.data.html);
    } catch {
      setNotifyPreviewHtml("<p>Preview failed.</p>");
    }
  };

  const handleNotifySend = async () => {
    if (!notifyConfirming) {
      setNotifyConfirming(true);
      return;
    }
    setNotifying(true);
    setNotifyConfirming(false);
    try {
      const res = await api.post<{ sent: number; failed: number; total: number }>(
        "/api/admin/blog-post/send",
        { title, excerpt, slug }
      );
      setNotifyResult(res.data);
    } catch {
      setNotifyResult({ sent: 0, failed: 0, total: 0 });
    } finally {
      setNotifying(false);
    }
  };

  const addBlock = () => {
    const schema = SCHEMAS[newBlockType];
    if (schema) setBlocks([...blocks, schema.defaults()]);
  };

  const updateBlock = (index: number, block: Block) => {
    const updated = [...blocks];
    updated[index] = block;
    setBlocks(updated);
  };

  const removeBlock = (index: number) => {
    if (!confirm("Delete this block?")) return;
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setBlocks(updated);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">
          {isNew ? "New post" : "Edit post"}
        </h1>
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/blog")}>
          Back
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Post details */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Details
        </h2>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Slug</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-post-slug" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Excerpt</label>
          <input type="text" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Tags (comma-separated)</label>
          <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="philosophy, investing" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Publish date (empty = draft)</label>
          <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className={inputCls} />
        </div>
      </section>

      {/* Content blocks */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Content blocks
        </h2>

        {blocks.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-4 text-center">
            No blocks yet. Pick a type below and tap Add.
          </p>
        )}

        <div className="space-y-4">
          {blocks.map((block, i) => (
            <BlockCard
              key={i}
              block={block}
              index={i}
              total={blocks.length}
              onUpdate={(b) => updateBlock(i, b)}
              onRemove={() => removeBlock(i)}
              onMove={(dir) => moveBlock(i, dir)}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <select
            value={newBlockType}
            onChange={(e) => setNewBlockType(e.target.value)}
            className="flex-1 min-w-[140px] rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          >
            {Object.entries(SCHEMAS).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={addBlock}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add block
          </Button>
        </div>
      </section>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : isNew ? "Create post" : "Save changes"}
        </Button>
      </div>

      {/* Notify subscribers */}
      {!isNew && publishDate && (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Notify subscribers
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Send an email to users who opted in to blog post notifications.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleNotifyPreview} disabled={!title || !slug}>
              Preview email
            </Button>
            <Button
              size="sm"
              onClick={handleNotifySend}
              disabled={!title || !slug || !excerpt || notifying}
              className={cn(notifyConfirming && "bg-destructive hover:bg-destructive/90")}
            >
              {notifying ? "Sending..." : notifyConfirming ? "Click again to confirm" : "Send to subscribers"}
            </Button>
            {notifyConfirming && (
              <Button variant="ghost" size="sm" onClick={() => setNotifyConfirming(false)}>
                Cancel
              </Button>
            )}
          </div>
          {notifyResult && (
            <div className="mt-3 rounded-lg border border-border p-3 text-sm">
              <span className="font-semibold">Sent: {notifyResult.sent} / {notifyResult.total}</span>
              {notifyResult.failed > 0 && (
                <span className="ml-2 text-destructive">Failed: {notifyResult.failed}</span>
              )}
            </div>
          )}
          {notifyPreviewHtml && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Email preview</span>
                <Button variant="ghost" size="sm" onClick={() => setNotifyPreviewHtml(null)}>Close</Button>
              </div>
              <div className="rounded-lg border border-border overflow-hidden bg-[#f1f5f9]">
                <iframe srcDoc={notifyPreviewHtml} title="Blog post email preview" className="w-full border-0" style={{ minHeight: 400 }} sandbox="" />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
