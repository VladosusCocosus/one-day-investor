# Email Notification Opt-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make monthly snapshot reminder emails opt-in via an explicit `email_notifications_enabled` flag, with three opt-in surfaces (Profile, Welcome overlay, first-snapshot dialog).

**Architecture:** A single boolean column on `user_settings` drives everything. Backend changes: migration + filter in `findDueUsers` + settings API passthrough. Frontend changes: extend `useSettings`, replace the "Snapshot" chip with a new "Email settings" section on Profile, add inline enable button to Welcome overlay step 4, and show a one-time dialog after the user's first snapshot.

**Tech Stack:** PostgreSQL (node-pg), Elysia (Bun), React 19 + Vite, TanStack Query, radix-ui primitives, Tailwind.

Project has no unit/integration tests — verification is `tsc -b` / `bun run build` plus manual checks. TDD task format is not used; tasks are code-change + build-check + commit.

---

## Task 1: Database migration — add `email_notifications_enabled` column

**Files:**
- Create: `packages/database/migrations/1776384000000_email-notifications-opt-in.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Up Migration

ALTER TABLE user_settings
    ADD COLUMN email_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Down Migration

ALTER TABLE user_settings
    DROP COLUMN IF EXISTS email_notifications_enabled;
```

- [ ] **Step 2: Verify the file exists and reads back cleanly**

Read the file and confirm it matches the content above. No execution needed; the project applies migrations via its own tooling.

- [ ] **Step 3: Commit**

```bash
git add packages/database/migrations/1776384000000_email-notifications-opt-in.sql
git commit -m "feat(db): add email_notifications_enabled to user_settings"
```

---

## Task 2: Extend `UserSettings` type

**Files:**
- Modify: `packages/types/database/index.ts`

- [ ] **Step 1: Add the new field to the `UserSettings` interface**

Locate the existing interface (around line 47) and update:

```ts
export interface UserSettings {
  user_id: string;
  snapshot_day: number;
  goal: string; // numeric comes back as string from pg
  currency: string;
  email_notifications_enabled: boolean;
}
```

- [ ] **Step 2: Typecheck packages/types**

Run: `cd packages/types && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/types/database/index.ts
git commit -m "feat(types): add email_notifications_enabled to UserSettings"
```

---

## Task 3: Database helper — `updateSettings` handles the new field

**Files:**
- Modify: `packages/database/user-settings/index.ts`

- [ ] **Step 1: Extend params type and SET-clause builder**

Replace the current `updateSettings` function body to include the new field. Full replacement:

```ts
export async function updateSettings(
  userId: string,
  params: {
    snapshot_day?: number;
    goal?: number;
    currency?: string;
    email_notifications_enabled?: boolean;
  }
): Promise<UserSettings> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.snapshot_day !== undefined) {
    fields.push(`snapshot_day = $${idx++}`);
    values.push(params.snapshot_day);
  }
  if (params.goal !== undefined) {
    fields.push(`goal = $${idx++}`);
    values.push(params.goal);
  }
  if (params.currency !== undefined) {
    fields.push(`currency = $${idx++}`);
    values.push(params.currency);
  }
  if (params.email_notifications_enabled !== undefined) {
    fields.push(`email_notifications_enabled = $${idx++}`);
    values.push(params.email_notifications_enabled);
  }

  if (fields.length === 0) return getSettings(userId);

  values.push(userId);
  const result = await pool.query<UserSettings>(
    `UPDATE user_settings SET ${fields.join(", ")} WHERE user_id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
}
```

- [ ] **Step 2: Typecheck packages/database**

Run: `cd packages/database && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/database/user-settings/index.ts
git commit -m "feat(db): updateSettings accepts email_notifications_enabled"
```

---

## Task 4: Reminders — filter due users by opt-in flag

**Files:**
- Modify: `packages/database/reminders/index.ts`

- [ ] **Step 1: Add the predicate to `findDueUsers`**

In the `findDueUsers` SQL (the `WHERE` block), add a new condition. Replace:

```sql
WHERE
    date_trunc('month', now())
      > date_trunc('month', rs.last_snapshot_at)
    AND EXTRACT(DAY FROM now())::int >= us.snapshot_day
    AND (rs.last_reminder_sent_at IS NULL
         OR rs.last_reminder_sent_at < rs.last_snapshot_at)
```

With:

```sql
WHERE
    us.email_notifications_enabled = TRUE
    AND date_trunc('month', now())
      > date_trunc('month', rs.last_snapshot_at)
    AND EXTRACT(DAY FROM now())::int >= us.snapshot_day
    AND (rs.last_reminder_sent_at IS NULL
         OR rs.last_reminder_sent_at < rs.last_snapshot_at)
```

- [ ] **Step 2: Typecheck packages/database**

Run: `cd packages/database && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/database/reminders/index.ts
git commit -m "feat(reminders): only email users who opted in"
```

---

## Task 5: Settings API — accept the new field in PUT

**Files:**
- Modify: `apps/core/src/api/settings.ts`

- [ ] **Step 1: Widen the PUT body type**

Replace the PUT handler's body cast. Current:

```ts
const params = body as { snapshot_day?: number; goal?: number; currency?: string };
```

New:

```ts
const params = body as {
  snapshot_day?: number;
  goal?: number;
  currency?: string;
  email_notifications_enabled?: boolean;
};
```

- [ ] **Step 2: Typecheck apps/core**

Run: `cd apps/core && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/core/src/api/settings.ts
git commit -m "feat(api): settings PUT accepts email_notifications_enabled"
```

---

## Task 6: Frontend hook — `useSettings` exposes the new field

**Files:**
- Modify: `apps/frontend/src/hooks/useSettings.ts`

- [ ] **Step 1: Update both the `UserSettings` interface and the mutation params**

Full replacement of the file:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface UserSettings {
  user_id: string;
  snapshot_day: number;
  goal: string;
  currency: string;
  email_notifications_enabled: boolean;
}

type UpdateSettingsParams = {
  snapshot_day?: number;
  goal?: number;
  currency?: string;
  email_notifications_enabled?: boolean;
};

export function useSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading: loading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.get<UserSettings>("/api/settings");
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: UpdateSettingsParams) => {
      const res = await api.put<UserSettings>("/api/settings", params);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
    },
  });

  const updateSettings = async (params: UpdateSettingsParams) => {
    return updateMutation.mutateAsync(params);
  };

  return { settings, loading, updateSettings };
}
```

- [ ] **Step 2: Typecheck the frontend**

Run: `cd apps/frontend && bunx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/hooks/useSettings.ts
git commit -m "feat(frontend): useSettings exposes email_notifications_enabled"
```

---

## Task 7: Profile page — add "Email settings" section, remove "Snapshot" chip

**Files:**
- Modify: `apps/frontend/src/pages/ProfilePage.tsx`

- [ ] **Step 1: Replace the full file**

This rewrite keeps the identity strip, currency chip, and help section intact; it removes the `SettingsChip` wrapping the Snapshot day (the snapshot day now lives inside the new section), keeps the `SnapshotDayEditor` popover content, and adds an `EmailSettingsSection` rendering the toggle + day row. Currency still uses the chip pattern unchanged.

```tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles } from "lucide-react";
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

function EmailSettingsSection({
  snapshotDay,
  emailEnabled,
  onToggleEmail,
  onSaveDay,
}: {
  snapshotDay: number;
  emailEnabled: boolean;
  onToggleEmail: (next: boolean) => void;
  onSaveDay: (value: number) => void;
}) {
  const [dayOpen, setDayOpen] = useState(false);

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Email settings
      </h2>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            Monthly snapshot reminder
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            A gentle nudge when it's time to take your monthly snapshot.
          </p>
        </div>
        <Switch.Root
          checked={emailEnabled}
          onCheckedChange={onToggleEmail}
          aria-label="Monthly snapshot reminder"
          className={cn(
            "relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-border transition-colors outline-none",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50",
            emailEnabled ? "bg-primary" : "bg-muted"
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

      <div
        className={cn(
          "mt-4 flex items-center justify-between gap-4 border-t border-border pt-4 transition-opacity",
          !emailEnabled && "opacity-60"
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
                onSave={onSaveDay}
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
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();

  const [currencyChipOpen, setCurrencyChipOpen] = useState(false);

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
  const emailEnabled = settings?.email_notifications_enabled ?? false;

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
      </div>

      {/* Email settings */}
      <EmailSettingsSection
        snapshotDay={snapshotDay}
        emailEnabled={emailEnabled}
        onToggleEmail={(next) =>
          updateSettings({ email_notifications_enabled: next })
        }
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
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + build the frontend**

Run: `cd apps/frontend && bunx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/ProfilePage.tsx
git commit -m "feat(profile): add Email settings section with reminder toggle"
```

---

## Task 8: Welcome overlay — inline "Enable monthly reminder" on step 4

**Files:**
- Modify: `apps/frontend/src/components/WelcomeOverlay.tsx`

- [ ] **Step 1: Wire settings into the component and render an inline action on the reminder step**

Edit the file with these changes:

1. Add imports near the top (`useSettings`, `Check` icon):

```tsx
import { useSettings } from "@/hooks/useSettings";
```

And update the `lucide-react` import line to include `Check`:

```tsx
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
```

2. Inside `WelcomeOverlay`, after the existing destructuring, add:

```tsx
const { settings, updateSettings } = useSettings();
const emailEnabled = settings?.email_notifications_enabled ?? false;
const isReminderStep = current === 3; // "Come back once a month"

const enableReminder = () => {
  updateSettings({ email_notifications_enabled: true }).catch(() => {
    /* nudge surface — silently ignore */
  });
};
```

3. In the RIGHT content pane, right after the existing `<p className="mt-3 text-sm leading-relaxed text-slate-600">{step.body[1]}</p>`, insert a new conditional block:

```tsx
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
```

- [ ] **Step 2: Typecheck the frontend**

Run: `cd apps/frontend && bunx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/WelcomeOverlay.tsx
git commit -m "feat(welcome): inline enable-reminder action on monthly step"
```

---

## Task 9: First-snapshot prompt — new dialog component

**Files:**
- Create: `apps/frontend/src/components/FirstSnapshotEmailPrompt.tsx`

- [ ] **Step 1: Create the dialog component**

```tsx
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
```

- [ ] **Step 2: Typecheck the frontend**

Run: `cd apps/frontend && bunx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/FirstSnapshotEmailPrompt.tsx
git commit -m "feat(frontend): add FirstSnapshotEmailPrompt dialog"
```

---

## Task 10: SnapshotsPage — show the prompt after the user's first snapshot

**Files:**
- Modify: `apps/frontend/src/pages/SnapshotsPage.tsx`

- [ ] **Step 1: Hook the prompt into the create flow**

Apply these targeted edits:

1. Update imports — add `useSettings`, `useRef`, and the new component. At the top of the file:

```tsx
import { useEffect, useRef, useState } from "react";
```

2. Add these two imports alongside the existing ones:

```tsx
import {
  FirstSnapshotEmailPrompt,
  FIRST_SNAPSHOT_EMAIL_PROMPT_KEY,
} from "@/components/FirstSnapshotEmailPrompt";
```

Note: `useSettings` is already imported.

3. Inside `SnapshotsPage`, right after the existing `const { settings } = useSettings();` line, add:

```tsx
const emailEnabled = settings?.email_notifications_enabled ?? false;
const hadSnapshotsBeforeCreate = useRef(false);
const [emailPromptOpen, setEmailPromptOpen] = useState(false);
```

4. Update `openCreate` to remember the pre-create count:

```tsx
const openCreate = () => {
  hadSnapshotsBeforeCreate.current = summaries.length > 0;
  setDrawerMode({ kind: "create" });
  setDrawerOpen(true);
};
```

5. Update the `<SnapshotDrawer>`'s `onCreated` handler:

```tsx
onCreated={(id) => {
  setSelectedId(id);
  if (hadSnapshotsBeforeCreate.current) return;
  if (emailEnabled) return;
  if (window.localStorage.getItem(FIRST_SNAPSHOT_EMAIL_PROMPT_KEY)) return;
  window.localStorage.setItem(FIRST_SNAPSHOT_EMAIL_PROMPT_KEY, "1");
  setEmailPromptOpen(true);
}}
```

6. Render the prompt at the end of the JSX tree, just before the closing `</div>`:

```tsx
<FirstSnapshotEmailPrompt
  open={emailPromptOpen}
  onClose={() => setEmailPromptOpen(false)}
/>
```

- [ ] **Step 2: Typecheck + build the frontend**

Run: `cd apps/frontend && bunx tsc -b && bunx vite build`
Expected: clean typecheck, successful build.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/SnapshotsPage.tsx
git commit -m "feat(snapshots): prompt first-time user to enable reminder email"
```

---

## Task 11: Full-project verification

**Files:** none

- [ ] **Step 1: Typecheck everything**

Run each in turn:

```bash
cd packages/types && bunx tsc --noEmit
cd packages/database && bunx tsc --noEmit
cd apps/core && bunx tsc --noEmit
cd apps/frontend && bunx tsc -b && bunx vite build
```

Expected: no errors anywhere; frontend build outputs bundle.

- [ ] **Step 2: Manual verification checklist (not executable — the user will do this later)**

Document but don't execute:
- Opt-out user: `findDueUsers()` returns no row for them (verify in a DB query or a manual run).
- Opt-in user: `findDueUsers()` returns the row.
- Profile toggle persists across reload.
- Welcome overlay step 4 shows "Enable monthly reminder" when disabled, "Reminder enabled ✓" when enabled.
- After first snapshot (empty → 1), the dialog appears exactly once; dismissing then creating a second snapshot does not re-open it.

- [ ] **Step 3: (No commit — this is a verification task.)**

---

## Self-Review Notes

- Spec coverage: ✅ migration (T1), type (T2), DB helper (T3), reminder filter (T4), API (T5), hook (T6), profile section replacing chip (T7), welcome overlay inline action (T8), first-snapshot dialog (T9) and its wiring (T10), full-project typecheck (T11).
- Placeholders: none.
- Type/name consistency: `email_notifications_enabled` used consistently in SQL column, TS interface, DB helper params, API body type, hook params, and all callers. `FIRST_SNAPSHOT_EMAIL_PROMPT_KEY` defined once and imported where used.
- File boundaries: the new `EmailSettingsSection` is internal to `ProfilePage.tsx` (not a shared component) — the spec explicitly flagged it as single-use. `FirstSnapshotEmailPrompt` is its own file because it's a full modal and needs clean imports from the snapshots page.
