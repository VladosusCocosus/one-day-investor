import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImagePlus } from "lucide-react";

export function AdminPage() {
  const { t } = useTranslation();
  const { data: adminCheck, isLoading, isError } = useQuery({
    queryKey: ["admin", "check"],
    queryFn: async () => {
      const res = await api.get<{ admin: boolean }>("/api/admin/check");
      return res.data;
    },
    retry: false,
  });

  const [subject, setSubject] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">{t("admin.checkingAccess")}</div>
      </div>
    );
  }

  if (isError || !adminCheck?.admin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-destructive">{t("admin.accessDenied")}</div>
      </div>
    );
  }

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<{ url: string }>("/api/admin/upload-image", form);
      const imageMarkdown = `![${file.name}](${res.data.url})`;
      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart;
        const before = markdown.slice(0, start);
        const after = markdown.slice(ta.selectionEnd);
        setMarkdown(`${before}${imageMarkdown}${after}`);
      } else {
        setMarkdown((prev) => `${prev}\n${imageMarkdown}`);
      }
    } catch {
      // silently ignore upload errors
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async () => {
    if (!subject.trim() || !markdown.trim()) return;
    try {
      const res = await api.post<{ html: string }>("/api/admin/service-update/preview", {
        subject,
        markdown,
      });
      setPreviewHtml(res.data.html);
    } catch {
      setPreviewHtml("<p>Preview failed.</p>");
    }
  };

  const handleSend = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setSending(true);
    setConfirming(false);
    try {
      const res = await api.post<{ sent: number; failed: number; total: number }>(
        "/api/admin/service-update/send",
        { subject, markdown }
      );
      setResult(res.data);
    } catch {
      setResult({ sent: 0, failed: 0, total: 0 });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">{t("admin.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("admin.subtitle")}
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("admin.subject")}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("admin.subjectPlaceholder")}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("admin.contentMarkdown")}
            </label>
            <label
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground cursor-pointer hover:bg-muted transition-colors",
                uploading && "opacity-50 pointer-events-none"
              )}
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              {uploading ? t("admin.uploading") : t("admin.addImage")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadImage(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div
            className={cn(
              "relative mt-1.5 rounded-lg border transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file?.type.startsWith("image/")) handleUploadImage(file);
            }}
          >
            {dragging && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/10 pointer-events-none">
                <span className="text-sm font-medium text-primary">{t("common.dropImageHere")}</span>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              onPaste={(e) => {
                const file = e.clipboardData.files[0];
                if (file?.type.startsWith("image/")) {
                  e.preventDefault();
                  handleUploadImage(file);
                }
              }}
              rows={16}
              placeholder={"## What's new\n\nWrite your update in markdown...\n\n- Feature one\n- Feature two\n\n> A quote or callout\n\nDrop or paste images here"}
              className="w-full rounded-lg bg-background px-3 py-2 text-sm font-mono outline-none resize-y border-0 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={!subject.trim() || !markdown.trim()}
          >
            {t("common.preview")}
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!subject.trim() || !markdown.trim() || sending}
            className={cn(
              confirming && "bg-destructive hover:bg-destructive/90"
            )}
          >
            {sending ? t("admin.sending") : confirming ? t("admin.confirmSend") : t("admin.sendToAll")}
          </Button>
          {confirming && (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              {t("common.cancel")}
            </Button>
          )}
        </div>

        {result && (
          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <div className="font-semibold text-foreground">
              {t("admin.sentResult", { sent: result.sent, total: result.total })}
            </div>
            {result.failed > 0 && (
              <div className="mt-1 text-destructive">{t("admin.failedResult", { failed: result.failed })}</div>
            )}
          </div>
        )}
      </div>

      {previewHtml && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("common.preview")}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)}>
              {t("common.close")}
            </Button>
          </div>
          <div className="mt-2 rounded-lg border border-border overflow-hidden bg-[#f1f5f9]">
            <iframe
              srcDoc={previewHtml}
              title="Email preview"
              className="w-full border-0"
              style={{ minHeight: 600 }}
              sandbox=""
            />
          </div>
        </div>
      )}
    </div>
  );
}
