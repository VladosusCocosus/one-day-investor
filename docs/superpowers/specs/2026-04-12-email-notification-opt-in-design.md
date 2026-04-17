# Email notification opt-in — design

**Date:** 2026-04-12
**Status:** approved (user: "chose all preferred, don't ask me again")

## Problem

The app currently sends monthly snapshot reminder emails to every user found by `findDueUsers()` with no opt-in, no consent, and no way to disable them. We want an explicit opt-in model: users must agree to receive emails, and they must always be able to turn them off. The snapshot-day setting — which only affects reminder timing — should live next to the email toggle so the settings are mentally grouped.

## Goals

- Email notifications are **off by default for every user**, existing and new.
- The profile page has a dedicated **"Email settings" section** that contains the opt-in toggle and the snapshot day. The section is structured so future email-related preferences (monthly digest, monthly summary, etc.) can be added without reshaping the layout.
- Three surfaces prompt the user to opt in:
  1. **Profile page** — canonical, always-available control.
  2. **Welcome overlay** — inline action on the existing "Come back once a month" step, so new users see it during onboarding.
  3. **After first snapshot** — a one-time modal on the snapshots page when a user creates their first snapshot, asking if they want a monthly nudge.
- The reminder CLI only emails users whose flag is `TRUE`.

## Non-goals

- Consent audit trail (who agreed, when). Just a boolean; can be extended later if needed.
- Editing the email address itself. Email comes from OAuth and is not user-editable here.
- Unsubscribe link inside emails. (Worth adding later; out of scope for this change.)
- Separate channels beyond email (push, SMS, etc.).
- Migration of existing subscribers as "grandfathered on". Everyone starts `FALSE`.

## Data model

New column on `user_settings`:

```sql
ALTER TABLE user_settings
  ADD COLUMN email_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE;
```

- Default `FALSE` applies to existing rows — no grandfathering.
- Down migration drops the column.

TypeScript mirror in `packages/types/database/index.ts`:

```ts
export interface UserSettings {
  user_id: string;
  snapshot_day: number;
  goal: string;
  currency: string;
  email_notifications_enabled: boolean;
}
```

## Backend changes

### `packages/database/user-settings/index.ts`

`updateSettings` gains handling for the new field:

```ts
params: {
  snapshot_day?: number;
  goal?: number;
  currency?: string;
  email_notifications_enabled?: boolean;
}
```

Plus a conditional `email_notifications_enabled = $N` branch in the dynamic SET clause. Same partial-update pattern as the existing fields.

### `packages/database/reminders/index.ts`

`findDueUsers()` query gets one additional predicate:

```sql
AND us.email_notifications_enabled = TRUE
```

This is the only filter change. Everything else — `reminder_state` tracking, `last_snapshot_at`, `snapshot_day` windowing — stays as-is. A user who disables reminders simply stops matching the query; when they re-enable, they pick up with normal cadence.

### `apps/core/src/api/settings.ts`

PUT body type extended:

```ts
const params = body as {
  snapshot_day?: number;
  goal?: number;
  currency?: string;
  email_notifications_enabled?: boolean;
};
```

No other API surface changes. Existing GET automatically returns the new field via `SELECT *`.

## Frontend changes

### `useSettings` hook

Extend `UserSettings` type and the `updateSettings` params to include `email_notifications_enabled`. No behavioral change beyond the extra field.

### Profile page — "Email settings" section

Replace the current "Snapshot" chip with a new full-width **section** titled "Email settings" that sits above the chips row. Currency stays as a chip (it's unrelated to notifications).

Section layout:

```
┌─ Email settings ──────────────────────────────────┐
│  Monthly snapshot reminder          [ toggle ]    │
│  A gentle nudge when it's time to take            │
│  your monthly snapshot.                           │
│  ────────────────────────────────────────         │
│  Remind me on the  [1st] of each month            │
└───────────────────────────────────────────────────┘
```

- **Toggle row:** switch with label "Monthly snapshot reminder" and a one-line description. Uses `radix-ui` `Switch` primitive. Flipping it calls `updateSettings({ email_notifications_enabled: next })` optimistically via the mutation.
- **Divider + day row:** "Remind me on the [day] of each month" — `day` is a small inline editable number (1–28). Uses the same `SnapshotDayEditor`/popover chip pattern already in the file, but inlined into this section. The day is always editable, regardless of the toggle state — it represents the user's declared "snapshot day" even if reminders are off. When the toggle is off, the day row gets `opacity-60` so it visually reads as inactive but remains clickable.
- The currency chip is kept as the only chip in the chips row (no "Snapshot" chip anymore).
- Section is built so future rows (e.g., "Monthly summary email") can be added as sibling toggle rows under the divider.

### Welcome overlay — step 4 augmentation

The existing "Come back once a month" step already mentions "We'll email you a gentle reminder when it's time." That line is now a lie for opted-out users, so the step gets an inline call-to-action:

- Under the existing copy, add a small action block:
  - If `settings.email_notifications_enabled === false`: show a button "Enable monthly reminder" that calls `updateSettings({ email_notifications_enabled: true })`. On success, swap the button for a subtle confirmation ("Reminder enabled ✓").
  - If already `true`: show the confirmation state directly, no button.
- No new step is added; the step count stays at 6.
- The action does not block navigation — user can still "Next" / "Back" freely.

### After first snapshot — one-time prompt

On `SnapshotsPage`, when the user creates their first snapshot (transition `summaries.length === 0 → 1` via `onCreated`), show a small dialog:

- Title: **Want a monthly nudge?**
- Body: "You just took your first snapshot. Want us to email you a gentle reminder next month so this becomes a habit?"
- Primary button: **Enable monthly reminder** — calls `updateSettings({ email_notifications_enabled: true })` then closes.
- Secondary button: **Not now** — just closes.

Suppression rules:
- If `settings.email_notifications_enabled === true`, do not show it.
- Once shown (dismissed or accepted), set `localStorage["odi.email-prompt.first-snapshot.seen"] = "1"` and never show it again, regardless of how many more snapshots they create.

Dialog uses `radix-ui`'s `Dialog` primitive, consistent with `WelcomeOverlay`. Lives in a new `components/FirstSnapshotEmailPrompt.tsx`. The prompt is a local component — not a shared dialog — because the welcome-overlay surface and the profile surface use inline UI instead of modals, so there's nothing to share.

### Wiring

- `SnapshotsPage` reads `settings` from `useSettings`, tracks whether the create happened from an empty state, and renders `FirstSnapshotEmailPrompt` conditionally.
- `WelcomeOverlay` reads `settings` and `updateSettings` from `useSettings` to drive the inline button state.
- `ProfilePage` imports the new section-level UI built alongside the existing chips.

## Error handling

- Settings mutations already surface failures via react-query; on the profile toggle we revert the optimistic UI if the mutation fails (toggle snaps back).
- The welcome-overlay inline action and the first-snapshot dialog silently no-op on failure (no error UI) — these are nudge surfaces, not critical flows. The user can always retry from Profile.

## Migration / rollout

- Single SQL migration adds the column with `DEFAULT FALSE NOT NULL`. Existing rows backfill to `FALSE`.
- Next reminder run after deploy will find zero due users until users start opting in. This is the intended behavior.
- No data cleanup or historical adjustment needed.

## Testing

Project has no unit or integration tests today. Verification is manual:

- Build passes (`bun run build` in frontend, typecheck in core/database).
- Profile toggle flips and persists (reload preserves).
- `findDueUsers()` returns `[]` for an opted-out user and the expected row for an opted-in user.
- Welcome overlay step 4 shows the right state pre/post click.
- First-snapshot dialog fires exactly once for a brand-new user and never again after dismissal.

## Files touched

**Backend**
- `packages/database/migrations/<ts>_email-notifications-opt-in.sql` (new)
- `packages/types/database/index.ts`
- `packages/database/user-settings/index.ts`
- `packages/database/reminders/index.ts`
- `apps/core/src/api/settings.ts`

**Frontend**
- `apps/frontend/src/hooks/useSettings.ts`
- `apps/frontend/src/pages/ProfilePage.tsx`
- `apps/frontend/src/components/WelcomeOverlay.tsx`
- `apps/frontend/src/components/FirstSnapshotEmailPrompt.tsx` (new)
- `apps/frontend/src/pages/SnapshotsPage.tsx`
