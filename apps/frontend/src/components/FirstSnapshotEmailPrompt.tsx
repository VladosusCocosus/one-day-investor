import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";

export const FIRST_SNAPSHOT_EMAIL_PROMPT_KEY =
  "odi.email-prompt.first-snapshot.seen";

interface FirstSnapshotEmailPromptProps {
  open: boolean;
  onClose: () => void;
}

export function FirstSnapshotEmailPrompt({
  open,
  onClose,
}: FirstSnapshotEmailPromptProps) {
  const { updateSettings } = useSettings();

  const handleEnable = () => {
    updateSettings({ email_notifications_enabled: true }).catch(() => {
      /* nudge surface — silently ignore */
    });
    onClose();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
            "overflow-hidden rounded-2xl bg-white p-6 shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "duration-200"
          )}
        >
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </DialogPrimitive.Close>

          <DialogPrimitive.Title className="text-xl font-bold leading-tight text-slate-900">
            Want a monthly nudge?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-3 text-sm leading-relaxed text-slate-600">
            You just took your first snapshot. Want us to email you a gentle
            reminder next month so this becomes a habit?
          </DialogPrimitive.Description>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Not now
            </Button>
            <Button
              size="sm"
              onClick={handleEnable}
              className="bg-emerald-700 text-white hover:bg-emerald-800"
            >
              Enable monthly reminder
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
