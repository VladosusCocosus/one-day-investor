import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, LogOut } from "lucide-react";
import { Switch } from "radix-ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { WELCOME_OVERLAY_STORAGE_KEY } from "@/components/WelcomeOverlay";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/lib/use-page-meta";
import { pageMeta } from "@/lib/metadata";

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

const languages = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
  { value: "es", label: "Español" },
] as const;

const languageLabels: Record<string, string> = {
  en: "English",
  ru: "Русский",
  es: "Español",
};

function LanguageEditor({
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
        Language
      </div>
      <select
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {languages.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
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

function EmailSettingsSection({
  snapshotDay,
  notifySnapshots,
  notifyUpdates,
  notifyBlog,
  onToggle,
  onSaveDay,
}: {
  snapshotDay: number;
  notifySnapshots: boolean;
  notifyUpdates: boolean;
  notifyBlog: boolean;
  onToggle: (key: string, value: boolean) => void;
  onSaveDay: (value: number) => void;
}) {
  const [dayOpen, setDayOpen] = useState(false);

  const categories = [
    {
      key: "notify_snapshot_reminders",
      label: "Snapshot reminders",
      description: "A gentle nudge when it's time to take your monthly snapshot.",
      checked: notifySnapshots,
    },
    {
      key: "notify_service_updates",
      label: "Service updates",
      description: "New features, integrations, and maintenance notices.",
      checked: notifyUpdates,
    },
    {
      key: "notify_blog_posts",
      label: "Blog posts",
      description: "New blog posts published on One Day Investor.",
      checked: notifyBlog,
    },
  ];

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Email settings
      </h2>

      <div className="mt-4 space-y-4">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {cat.label}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {cat.description}
              </p>
            </div>
            <Switch.Root
              checked={cat.checked}
              onCheckedChange={(next) => onToggle(cat.key, next)}
              aria-label={cat.label}
              className={cn(
                "relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-border transition-colors outline-none",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                cat.checked ? "bg-primary" : "bg-muted"
              )}
            >
              <Switch.Thumb
                className={cn(
                  "block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  "translate-x-0.5 data-[state=checked]:translate-x-[22px]"
                )}
              />
            </Switch.Root>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "mt-4 flex items-center justify-between gap-4 border-t border-border pt-4 transition-opacity",
          !notifySnapshots && "opacity-60"
        )}
      >
        <div className="text-xs text-muted-foreground">
          Remind me on the{" "}
          <Popover open={dayOpen} onOpenChange={setDayOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors",
                  dayOpen && "bg-primary/10 border-primary/35"
                )}
              >
                {snapshotDay}
                {ordinal(snapshotDay)}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto min-w-[220px] p-3">
              <SnapshotDayEditor
                value={snapshotDay}
                onSave={(v) => {
                  onSaveDay(v);
                  setDayOpen(false);
                }}
                onClose={() => setDayOpen(false)}
              />
            </PopoverContent>
          </Popover>{" "}
          of each month.
        </div>
      </div>
    </section>
  );
}

export function ProfilePage() {
  usePageMeta(pageMeta.profile);
  const { user, logout } = useAuth();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();

  const [currencyChipOpen, setCurrencyChipOpen] = useState(false);
  const [languageChipOpen, setLanguageChipOpen] = useState(false);

  const handleReplayWelcome = () => {
    window.localStorage.removeItem(WELCOME_OVERLAY_STORAGE_KEY);
    navigate("/dashboard");
  };

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
  const language = settings?.language ?? "en";
  const notifySnapshots = settings?.notify_snapshot_reminders ?? false;
  const notifyUpdates = settings?.notify_service_updates ?? false;
  const notifyBlog = settings?.notify_blog_posts ?? false;

  return (
    <div>
      {/* Page header */}
      <h1 className="text-xl font-bold text-foreground">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your account and preferences
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

      {/* Settings chips (currency only now) */}
      <div className="mt-5 flex flex-wrap gap-2">
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
        <SettingsChip
          label="Language"
          displayValue={languageLabels[language] ?? language}
          open={languageChipOpen}
          onOpenChange={setLanguageChipOpen}
        >
          <LanguageEditor
            value={language}
            onSave={(newLanguage) => updateSettings({ language: newLanguage })}
            onClose={() => setLanguageChipOpen(false)}
          />
        </SettingsChip>
      </div>

      {/* Email settings */}
      <EmailSettingsSection
        snapshotDay={snapshotDay}
        notifySnapshots={notifySnapshots}
        notifyUpdates={notifyUpdates}
        notifyBlog={notifyBlog}
        onToggle={(key, value) => updateSettings({ [key]: value })}
        onSaveDay={(snapshot_day) => updateSettings({ snapshot_day })}
      />

      {/* Help */}
      <section className="mt-10 border-t border-border pt-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Help
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Forgotten how things work? Replay the welcome tour any time.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={handleReplayWelcome}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Show welcome tour
        </Button>
      </section>

      {/* Sign out */}
      <section className="mt-10 border-t border-border pt-6">
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={async () => {
            await logout();
            navigate("/");
          }}
        >
          <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </Button>
      </section>
    </div>
  );
}
