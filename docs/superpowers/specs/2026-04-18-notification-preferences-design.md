# Email Notification Preferences — Design Spec

## Overview

Replace the single `email_notifications_enabled` toggle with per-category notification preferences. Add a standalone unsubscribe page accessible via signed token (no login required). Extend the in-app Profile page with category toggles.

## Notification Categories

1. **Snapshot Reminders** — monthly reminder to record portfolio snapshot
2. **Service Updates** — new features, integrations, maintenance notices
3. **Blog Posts** — new blog post published

## Database Changes

Replace `email_notifications_enabled` with 3 columns:

```sql
ALTER TABLE user_settings
  ADD COLUMN notify_snapshot_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN notify_service_updates BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN notify_blog_posts BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE user_settings
SET notify_snapshot_reminders = TRUE,
    notify_service_updates = TRUE,
    notify_blog_posts = TRUE
WHERE email_notifications_enabled = TRUE;

ALTER TABLE user_settings DROP COLUMN email_notifications_enabled;
```

Existing opt-in users get all 3 enabled. New users default to all off (explicit opt-in preserved).

## Unsubscribe Token

HMAC-SHA256 signed token for passwordless unsubscribe access.

- **Format:** `base64url(userId):base64url(hmac-sha256(userId, secret))`
- **Secret:** reuses `EXCHANGE_ENCRYPTION_KEY` env var
- **No expiry** — unsubscribe links must always work
- **Generation:** utility function in a shared package, used by email sender and API validator

## Unsubscribe Page

- **Route:** `/unsubscribe?token=xxx` (frontend route)
- **No login required** — token authenticates the user
- **UI:** minimal standalone page (no app nav), shows:
  - App logo
  - 3 toggle switches (Snapshot Reminders, Service Updates, Blog Posts)
  - "Unsubscribe from all" button
  - Success/error feedback
- On toggle change → `PUT /api/notifications/preferences?token=xxx`
- On "Unsubscribe from all" → sets all 3 to false in one call

## Email Changes

All outgoing emails include:

- **Footer:** "Unsubscribe" link → `{FRONTEND_URL}/unsubscribe?token=xxx`
- **Header:** `List-Unsubscribe: <{FRONTEND_URL}/unsubscribe?token=xxx>` for Gmail/Apple one-click

Token is generated at send time using the recipient's user ID.

## API Endpoints

### Token-based (no auth, for unsubscribe page)

```
GET  /api/notifications/preferences?token=xxx  — returns current preferences
PUT  /api/notifications/preferences?token=xxx  — updates preferences
```

PUT body:
```typescript
{
  notify_snapshot_reminders?: boolean;
  notify_service_updates?: boolean;
  notify_blog_posts?: boolean;
}
```

### Auth-based (for in-app settings)

Extend existing `PUT /api/settings` to accept the 3 new fields alongside existing settings (snapshot_day, goal, currency).

## In-App Profile Page

Extend `EmailSettingsSection` in `ProfilePage.tsx`:

- Replace single toggle with 3 category toggles
- Each toggle updates independently via `updateSettings()`
- Snapshot day editor stays as-is (only relevant when snapshot reminders are on)
- Mute snapshot day editor when `notify_snapshot_reminders` is off

## Reminder Service Update

Change `findDueUsers()` query filter from `email_notifications_enabled = TRUE` to `notify_snapshot_reminders = TRUE`.

## Types

Update `UserSettings` interface:

```typescript
export interface UserSettings {
  user_id: string;
  snapshot_day: number;
  goal: string;
  currency: string;
  notify_snapshot_reminders: boolean;
  notify_service_updates: boolean;
  notify_blog_posts: boolean;
}
```

Remove `email_notifications_enabled` from all code.

## Out of Scope

- Email frequency controls (daily/weekly digest)
- Push notifications
- In-app notification center
