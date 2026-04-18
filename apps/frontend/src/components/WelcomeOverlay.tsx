import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  X,
  Wallet,
  Layers,
  Camera,
  CalendarDays,
  LineChart,
  Repeat,
  Check,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

type Step = {
  icon: LucideIcon;
  title: string;
  shortTitle: string;
  body: [string, string];
};

const steps: Step[] = [
  {
    icon: Wallet,
    title: "Create a pocket",
    shortTitle: "Create a pocket",
    body: [
      "A pocket is wherever you mentally keep a chunk of money — Revolut, Interactive Brokers, your apartment, cash in your drawer. Make one per service or per thing; the structure should match how you already think about your money.",
      "Don't worry about getting it right the first time. You can split, rename, or merge pockets later.",
    ],
  },
  {
    icon: Layers,
    title: "Add your assets",
    shortTitle: "Add your assets",
    body: [
      "Fill each pocket with what's inside: stocks, cash, crypto, real estate, cars, whatever counts. Exchange rates and market prices update automatically — everything else you write down once.",
      "If an asset doesn't have a public price (an apartment, a collection, a car), you set the number. The app trusts you to know your own stuff.",
    ],
  },
  {
    icon: Camera,
    title: "Take your first snapshot",
    shortTitle: "First snapshot",
    body: [
      "A snapshot is a monthly photograph of your entire net worth. One click captures the whole picture, and the totals stay fixed even as prices move later.",
      "You'll end up with one snapshot per month. That's the building block of your timeline.",
    ],
  },
  {
    icon: CalendarDays,
    title: "Come back once a month",
    shortTitle: "Come back monthly",
    body: [
      "We'll email you a gentle reminder when it's time. Five minutes in the app, update the numbers that changed, click snapshot. Then close the tab and live your life.",
      "That's the whole ritual. Not daily. Not weekly. One day a month.",
    ],
  },
  {
    icon: LineChart,
    title: "See the curve, not the ticker",
    shortTitle: "Watch the curve",
    body: [
      "The Dashboard shows your net worth over months and years — the one chart that actually matters. Not yesterday's 0.3% dip. Not minute-by-minute market noise.",
      "The slow, honest line that tells you where your capital is really going.",
    ],
  },
  {
    icon: Repeat,
    title: "Build the habit",
    shortTitle: "Build the habit",
    body: [
      "Twelve snapshots a year, and then another twelve, and another. A decade of snapshots is a decade of your financial story in one honest line.",
      "No bank, no broker, no spreadsheet can show you that — they don't live long enough. One Day Investor does.",
    ],
  },
];

interface WelcomeOverlayProps {
  open: boolean;
  onDismiss: () => void;
}

export function WelcomeOverlay({ open, onDismiss }: WelcomeOverlayProps) {
  const [current, setCurrent] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const emailEnabled = settings?.email_notifications_enabled ?? false;

  const enableReminder = () => {
    updateSettings({ email_notifications_enabled: true }).catch(() => {
      /* nudge surface — silently ignore */
    });
  };

  // Reset to first step when the overlay transitions from closed to open.
  // This uses the React 19 "setState during render" pattern for derived state,
  // which avoids the cascading re-render caused by doing the same in useEffect.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setCurrent(0);
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) onDismiss();
  };

  const goNext = () => {
    if (current < steps.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      onDismiss();
      navigate("/assets-managment");
    }
  };

  const goBack = () => {
    if (current > 0) setCurrent((c) => c - 1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goBack();
    }
  };

  const step = steps[current];
  const Icon = step.icon;
  const isLast = current === steps.length - 1;
  const isFirst = current === 0;
  const isReminderStep = current === 3;

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
          onKeyDown={handleKeyDown}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[720px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
            "overflow-hidden rounded-2xl bg-white shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "duration-200"
          )}
          aria-describedby="welcome-step-body"
        >
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] md:min-h-[420px]">
            {/* LEFT — visual pane */}
            <div className="flex flex-col justify-between border-b border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 md:border-b-0 md:border-r md:p-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Welcome
                </p>
                <div className="mt-4 hidden h-24 w-24 items-center justify-center rounded-2xl border border-emerald-200 bg-white shadow-sm md:flex">
                  <Icon
                    className="h-11 w-11 text-emerald-700"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <ol className="mt-4 hidden space-y-0.5 md:block">
                {steps.map((s, i) => (
                  <li
                    key={s.title}
                    aria-current={i === current ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                      i === current
                        ? "bg-emerald-700/10 font-semibold text-emerald-900"
                        : "text-emerald-800/70"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
                        i === current
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-emerald-300 bg-white text-emerald-700/70"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span>{s.shortTitle}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* RIGHT — content pane */}
            <div className="relative flex flex-col p-6 md:p-8">
              <DialogPrimitive.Close
                className="absolute right-4 top-4 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Close welcome tour"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </DialogPrimitive.Close>

              <div className="flex-1 pt-2" aria-live="polite">
                <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  Step {current + 1} of {steps.length}
                </span>
                <DialogPrimitive.Title className="mt-3 text-2xl font-bold leading-tight text-slate-900">
                  {step.title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description
                  id="welcome-step-body"
                  className="mt-3 text-sm leading-relaxed text-slate-600"
                >
                  {step.body[0]}
                </DialogPrimitive.Description>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {step.body[1]}
                </p>
                {isReminderStep && (
                  <div className="mt-4">
                    {emailEnabled ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Reminder enabled
                      </div>
                    ) : (
                      <Button
                        onClick={enableReminder}
                        size="sm"
                        variant="outline"
                        className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                      >
                        Enable monthly reminder
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <Button
                  variant="ghost"
                  disabled={isFirst}
                  onClick={goBack}
                  className={cn(isFirst && "pointer-events-none opacity-40")}
                >
                  ← Back
                </Button>
                <Button
                  onClick={goNext}
                  className="bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  {isLast ? "Get started →" : "Next →"}
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const WELCOME_OVERLAY_STORAGE_KEY = "odi.welcome-overlay.seen";
