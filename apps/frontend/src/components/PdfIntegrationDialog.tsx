import { useState } from "react";
import { Upload, X } from "lucide-react";
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
import { api } from "@/lib/api";
import type { PdfProviderInfo } from "@/lib/pdf-providers";
import { useQueryClient } from "@tanstack/react-query";

interface PdfIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceLabel: string;
  provider: PdfProviderInfo;
}

interface ImportResponse {
  created: Array<{ symbol: string; isin: string | null; quantity: string }>;
  updated: Array<{ id: string; symbol: string; oldQuantity: string; newQuantity: string }>;
  missing: Array<{ id: string; symbol: string; quantity: string }>;
  importRowId: string;
  statementPeriod: { start: string | null; end: string | null };
  uploadedAt: string;
}

export function PdfIntegrationDialog({
  open,
  onOpenChange,
  serviceId,
  serviceLabel,
  provider,
}: PdfIntegrationDialogProps) {
  const qc = useQueryClient();
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [toDelete, setToDelete] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setResult(null);
    setToDelete(new Set());
    setBusy(false);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("provider", provider.slug);
      form.append("service_id", serviceId);
      const res = await api.post<ImportResponse>(
        "/api/integrations/pdf-upload",
        form,
      );
      setResult(res.data);
      setToDelete(new Set());
      setStep("review");
      // Refresh assets so the UI catches up.
      qc.invalidateQueries({ queryKey: ["assets"] });
    } catch (e) {
      const message =
        e && typeof e === "object" && "response" in e
          ? (e as { response: { data: { error: string } } }).response?.data?.error
          : undefined;
      setError(message || (e instanceof Error ? e.message : "Upload failed"));
    } finally {
      setBusy(false);
    }
  };

  const toggleDelete = (id: string) => {
    setToDelete((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmDeletions = async () => {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      if (toDelete.size > 0) {
        await api.post("/api/integrations/pdf-upload/confirm-deletions", {
          importRowId: result.importRowId,
          pocketAssetIds: [...toDelete],
        });
      }
      qc.invalidateQueries({ queryKey: ["assets"] });
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <SheetContent widthClass="w-full sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Upload statement — {serviceLabel}</SheetTitle>
          <SheetDescription>{provider.helpText}</SheetDescription>
        </SheetHeader>

        <SheetBody>
          {step === "upload" && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-10 text-center cursor-pointer hover:bg-muted/30">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {file ? file.name : "Click to pick a PDF"}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
                />
              </label>
              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
          )}

          {step === "review" && result && (
            <div className="space-y-4 text-sm">
              <div className="rounded-md border bg-muted/10 p-3 text-xs text-muted-foreground">
                Period {result.statementPeriod.start ?? "?"} — {result.statementPeriod.end ?? "?"}
              </div>

              {result.created.length > 0 && (
                <section>
                  <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Added ({result.created.length})
                  </h4>
                  <ul className="space-y-1">
                    {result.created.map((c) => (
                      <li key={c.symbol} className="flex justify-between text-xs tabular-nums">
                        <span>{c.symbol}</span>
                        <span className="text-muted-foreground">{c.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.updated.length > 0 && (
                <section>
                  <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Updated ({result.updated.length})
                  </h4>
                  <ul className="space-y-1">
                    {result.updated.map((u) => (
                      <li key={u.id} className="flex justify-between text-xs tabular-nums">
                        <span>{u.symbol}</span>
                        <span className="text-muted-foreground">
                          {u.oldQuantity} → {u.newQuantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.missing.length > 0 && (
                <section>
                  <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Not in this statement ({result.missing.length})
                  </h4>
                  <p className="mb-2 text-xs text-muted-foreground">
                    These assets are in your portfolio but not in the uploaded PDF. Tick any you want to remove.
                  </p>
                  <ul className="space-y-1">
                    {result.missing.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 text-xs tabular-nums">
                        <label className="flex flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={toDelete.has(m.id)}
                            onChange={() => toggleDelete(m.id)}
                          />
                          <span>{m.symbol}</span>
                        </label>
                        <span className="text-muted-foreground">{m.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.created.length === 0 &&
                result.updated.length === 0 &&
                result.missing.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Portfolio already matches this statement — nothing to change.
                  </p>
                )}

              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={busy}
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Cancel
          </Button>
          {step === "upload" ? (
            <Button size="sm" onClick={handleUpload} disabled={!file || busy}>
              {busy ? "Parsing…" : "Upload"}
            </Button>
          ) : (
            <Button size="sm" onClick={handleConfirmDeletions} disabled={busy}>
              {busy ? "Saving…" : toDelete.size > 0 ? `Confirm (remove ${toDelete.size})` : "Done"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
