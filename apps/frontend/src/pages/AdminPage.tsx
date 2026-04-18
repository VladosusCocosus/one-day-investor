import { useState } from "react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminPage() {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  if (isError || !adminCheck?.admin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-destructive">Access denied.</div>
      </div>
    );
  }

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
      <h1 className="text-xl font-bold text-foreground">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Send service update emails to opted-in users.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What's new in One Day Investor"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Content (Markdown)
          </label>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={16}
            placeholder={"## What's new\n\nWrite your update in markdown...\n\n- Feature one\n- Feature two\n\n> A quote or callout"}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none resize-y focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={!subject.trim() || !markdown.trim()}
          >
            Preview
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!subject.trim() || !markdown.trim() || sending}
            className={cn(
              confirming && "bg-destructive hover:bg-destructive/90"
            )}
          >
            {sending ? "Sending..." : confirming ? "Click again to confirm send" : "Send to all opted-in users"}
          </Button>
          {confirming && (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          )}
        </div>

        {result && (
          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <div className="font-semibold text-foreground">
              Sent: {result.sent} / {result.total}
            </div>
            {result.failed > 0 && (
              <div className="mt-1 text-destructive">Failed: {result.failed}</div>
            )}
          </div>
        )}
      </div>

      {previewHtml && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Preview
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)}>
              Close
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
