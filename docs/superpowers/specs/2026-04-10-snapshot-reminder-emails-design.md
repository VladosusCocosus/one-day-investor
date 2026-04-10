# Snapshot Reminder Emails — Design

**Date:** 2026-04-10
**Status:** Approved design
**Scope:** New worker app that sends branded HTML reminder emails to users when their monthly `snapshot_day` arrives and they haven't yet recorded a snapshot for the new month. Runs hourly as an external-cron CLI script.

## Goal

When a user has not taken a snapshot for the current month by the time their configured `snapshot_day` arrives, email them a beautifully branded reminder containing their last snapshot total and goal progress. Each user gets **at most one reminder per cycle** (between consecutive snapshots).

## Architecture

One new workspace app in the monorepo:

```
apps/reminder/
├── package.json                    # @reminder-app — bun runtime
├── src/
│   ├── cli/
│   │   └── send-due-reminders.ts   # Entry point — cron invokes this
│   ├── mailer/
│   │   └── mailgun.ts              # Mailgun client wrapper
│   ├── template/
│   │   └── reminder.ts             # Pure HTML template builder
│   └── query/
│       └── find-due-users.ts       # SQL: who gets an email this tick
```

One new DB migration, one small additive change to `createSnapshot` in `packages/database/snapshots`, and no touches to `apps/core`, `apps/analytics`, `apps/market`, or `apps/frontend`.

**Runtime topology:**

1. A **host-level cron job** (operator-configured) invokes `bun run -F @reminder-app send-reminders` once per hour at minute 0.
2. The CLI runs a single SQL query to produce the list of users currently due, sends each one an email via Mailgun, updates `reminder_state.last_reminder_sent_at` after each successful send, and exits.
3. Failures per user are logged but never block the rest of the batch. Failed sends retry on the next hourly tick because `last_reminder_sent_at` stays stale.

**Not in scope (explicit):**

- Plain-text email fallback (HTML-only first cut)
- Unsubscribe mechanism (`reminders_enabled` flag) — revisit when a user asks
- Per-user timezones — server time is fine for the first cut
- Inbound email / "reply to nag me harder" line from the mockup
- Retries inside the Mailgun wrapper (hourly tick is the retry)
- Bumping `reminder_state` when a snapshot is **updated** (only on create)

## Database schema

New migration file: `packages/database/migrations/<timestamp>_add-reminder-state.sql`

```sql
-- Up Migration
CREATE TABLE reminder_state (
    user_id                  UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_snapshot_at         TIMESTAMPTZ NOT NULL,
    last_reminder_sent_at    TIMESTAMPTZ
);

CREATE INDEX idx_reminder_state_due
    ON reminder_state (last_snapshot_at, last_reminder_sent_at);

-- Down Migration
DROP TABLE IF EXISTS reminder_state;
```

**Why this shape:**

- **`user_id` as PK** — one row per user, `ON DELETE CASCADE` keeps it consistent if a user is removed.
- **`last_snapshot_at TIMESTAMPTZ NOT NULL`** — the row is only created once the user has at least one snapshot, so it's never null.
- **`last_reminder_sent_at TIMESTAMPTZ` (nullable)** — starts null (never reminded), set on each successful send, **reset to null on every snapshot creation** so the next cycle can fire.
- **Index** — `(last_snapshot_at, last_reminder_sent_at)` keeps the cron's filtering query fast.

## Snapshot-create hook

The only change outside `apps/reminder/`. A single `UPSERT` is added to `createSnapshot` in `packages/database/snapshots/index.ts`, **inside the same transaction** as the snapshot insert (right before `COMMIT`):

```ts
await client.query(
  `INSERT INTO reminder_state (user_id, last_snapshot_at, last_reminder_sent_at)
   VALUES ($1, now(), NULL)
   ON CONFLICT (user_id) DO UPDATE
     SET last_snapshot_at = EXCLUDED.last_snapshot_at,
         last_reminder_sent_at = NULL`,
  [params.user_id]
);
```

**Properties:**

1. **Atomic.** If the snapshot insert or any entry insert throws, the `reminder_state` upsert also rolls back.
2. **`last_reminder_sent_at` is reset to NULL on every snapshot creation.** This is what makes the next month's cycle fire — without it, a user who took their April snapshot 2 days after the April reminder would still have `last_reminder_sent_at = 2026-04-01` and never get a May reminder.
3. **Idempotent via `ON CONFLICT`.** First-ever snapshot creates the row; every subsequent snapshot updates it.

No change to the snapshot-update path. Updates don't move the reminder-state needle — the user already has the snapshot for that month, the cycle is already satisfied.

## Send-gate query

The heart of the feature. Lives in `apps/reminder/src/query/find-due-users.ts`:

```sql
SELECT
    rs.user_id,
    u.email,
    u.name,
    us.snapshot_day,
    us.goal,
    us.currency,
    rs.last_snapshot_at,
    -- Latest snapshot's month + total for the email stats block
    ls.month           AS last_snapshot_month,
    ls.total           AS last_snapshot_total
FROM reminder_state rs
JOIN users u           ON u.id = rs.user_id
JOIN user_settings us  ON us.user_id = rs.user_id
JOIN LATERAL (
    SELECT s.month, COALESCE(SUM(e.amount), 0) AS total
    FROM snapshots s
    LEFT JOIN snapshot_entries e ON e.snapshot_id = s.id
    WHERE s.user_id = rs.user_id
    GROUP BY s.id, s.month, s.created_at
    ORDER BY s.created_at DESC
    LIMIT 1
) ls ON TRUE
WHERE
    -- Calendar has moved to a new month since the last snapshot
    date_trunc('month', now())
      > date_trunc('month', rs.last_snapshot_at)
    -- Day-of-month has reached the user's configured snapshot_day
    AND EXTRACT(DAY FROM now())::int >= us.snapshot_day
    -- Haven't already reminded since that snapshot
    AND (rs.last_reminder_sent_at IS NULL
         OR rs.last_reminder_sent_at < rs.last_snapshot_at);
```

Plain English: *"The calendar has moved to a new month, the day-of-month is ≥ their configured `snapshot_day`, and we haven't already sent a reminder for this cycle."*

The `LATERAL` subquery pulls the most recently created snapshot's month and entry sum in one round-trip so the CLI doesn't need a second query per user for the email stats block.

**Timezones:** `now()` and `EXTRACT(DAY FROM now())` use the DB's timezone (assumed UTC). If a user complains, we add a `timezone` column to `user_settings` and coerce here. Out of scope for v1.

## CLI runner — `apps/reminder/src/cli/send-due-reminders.ts`

```ts
import { createLogger } from "@logger";
import { pool } from "@database";
import { findDueUsers } from "../query/find-due-users";
import { sendReminderEmail } from "../mailer/mailgun";
import { renderReminderEmail } from "../template/reminder";

const log = createLogger("reminder-cli");

async function main() {
  const startedAt = Date.now();
  const due = await findDueUsers();
  log.info({ count: due.length }, "due users found");

  let sent = 0;
  let failed = 0;

  for (const user of due) {
    try {
      const html = renderReminderEmail(user);
      const subject = `Your ${user.currentMonthLabel} snapshot is due, ${user.firstName}`;
      await sendReminderEmail({
        to: `${user.name} <${user.email}>`,
        subject,
        html,
      });
      await pool.query(
        "UPDATE reminder_state SET last_reminder_sent_at = now() WHERE user_id = $1",
        [user.user_id]
      );
      sent++;
    } catch (err) {
      failed++;
      log.error({ err, user_id: user.user_id }, "send failed");
    }
  }

  log.info(
    { sent, failed, durationMs: Date.now() - startedAt },
    "reminder run complete"
  );
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  log.fatal({ err }, "reminder run crashed");
  process.exit(2);
});
```

**Three properties to call out:**

1. **Mark-after-send, not mark-before-send.** If Mailgun throws, `last_reminder_sent_at` is not updated. The next hourly tick retries. No silent drops.
2. **Per-user try/catch.** One user's failure never blocks the rest of the batch.
3. **Exit codes.** `0` = clean, `1` = some failures (host cron surfaces this in its mail/log), `2` = crash before the loop even ran.

## Mailgun wrapper — `apps/reminder/src/mailer/mailgun.ts`

```ts
import FormData from "form-data";
import Mailgun from "mailgun.js";
import config from "@config";

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: "api",
  key: config.get("mailgun.apiKey"),
});

const DOMAIN = config.get("mailgun.domain");
const FROM = config.get("mailgun.from");

export async function sendReminderEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  await mg.messages.create(DOMAIN, {
    from: FROM,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  });
}
```

**Notes:**

- **HTML only, no `text`.** Modern clients render HTML perfectly; a plain-text fallback is a maintenance burden nobody reads. Revisit if spam-filter scoring complains.
- **No retry inside the wrapper.** The CLI's per-user try/catch plus the hourly tick already provides retry semantics; adding more retries here risks double-sends.
- **EU endpoint** (`url: "https://api.eu.mailgun.net"`) is not set because `odinvestor.net` is on the US region. Add it here if the domain moves regions.

## Env vars

Added to `.env` and `.env.example`:

```bash
# Mailgun
MAILGUN_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=odinvestor.net
MAILGUN_FROM="One Day Investor <postmaster@odinvestor.net>"
```

These plumb into the `@config` package as `mailgun.apiKey`, `mailgun.domain`, `mailgun.from`, following the existing pattern (`postgres.host`, `postgres.user`, `frontendUrl`, etc.). During implementation, the plan will confirm the exact `@config` shape and mirror it — if it uses a different key style, that style is used.

## Email template — `apps/reminder/src/template/reminder.ts`

Pure function, no I/O, no state. Takes the data already fetched by the send-gate query and returns a string of fully-inlined HTML. Everything is inline-styled because most email clients strip `<style>` blocks.

**Layout (matches the approved browser mockup):**

1. **Hero** — emerald gradient (matches frontend `--primary`), brand mark, headline (`Time for your {currentMonthLabel} snapshot, {firstName}`), one-line subtitle
2. **Stats row** — two side-by-side cards: last snapshot month + last total with `{percent}% of goal` subtitle
3. **Progress bar** — emerald fill showing `{lastTotal} / {goal}` goal progress
4. **CTA** — full-width emerald button `Record {currentMonthLabel} snapshot →` linking to `https://odinvestor.net/snapshots`
5. **Footer** — explanatory line + `One Day Investor · odinvestor.net`

```ts
interface ReminderData {
  firstName: string;          // "Pavel" — derived from users.name
  currentMonthLabel: string;  // "April" — the month we're nagging them about, derived from now() in the CLI
  lastMonthLabel: string;     // "March 2026"
  lastCreatedAtLabel: string; // "Mar 1"
  lastTotal: number;          // 21240
  goal: number;               // 50000
  symbol: string;             // "€"
  ctaHref: string;            // "https://odinvestor.net/snapshots"
}

export function renderReminderEmail(data: ReminderData): string {
  // Returns the full `<!doctype html>…</html>` string shown in the mockup,
  // with every tag inline-styled and the layout built from nested tables
  // (`<table role="presentation">`) for email-client compatibility.
  //
  // percent = Math.round((lastTotal / goal) * 100) if goal > 0 else 0
  // progressWidth = Math.min(100, percent)
  // All numbers formatted with `${symbol}${n.toLocaleString("en-US")}`
  //
  // Full HTML is in the implementation plan's code block — kept there
  // rather than duplicated here to avoid drift.
  /* ... see implementation plan for full HTML string ... */
}
```

The full inlined HTML is in the implementation plan so the spec stays focused on intent. The template must render:

- All dynamic values from `ReminderData` (no placeholders in the shipped string)
- Tables, not flex/grid, for layout
- Inline styles only, no `<style>` blocks
- `role="presentation"` on layout tables (accessibility)
- No external images, no webfonts (both break in privacy-focused clients)

**Subject line:** `Your {currentMonthLabel} snapshot is due, {firstName}` — composed in the CLI, not the template.

## Cron setup

The host operator adds one crontab line:

```cron
# Send due snapshot reminders every hour
0 * * * * cd <REPO_PATH> && bun run -F @reminder-app send-reminders >> /var/log/reminder.log 2>&1
```

`<REPO_PATH>` is a deploy-time placeholder the operator replaces with the actual path to the repo on the host. Documented in the new `apps/reminder/README.md` that Task 1 of the implementation plan will create.

`>> /var/log/reminder.log 2>&1` captures stdout and stderr into a rotating log file so runs can be inspected without being SSHed in during the hour-long gap.

## Error handling & observability

- **Structured logging** via `@logger` (same pino-based wrapper all other apps use). Each run logs `{ count }` of due users, `{ sent, failed, durationMs }` on completion, and `{ err, user_id }` for each failure.
- **No alerting integration** in this cut. Host cron surfaces non-zero exit codes via its standard mail mechanism if configured.
- **No metrics export.** Revisit if this feature becomes load-bearing.

## Files touched

| File | Change |
|---|---|
| `packages/database/migrations/<ts>_add-reminder-state.sql` | **New.** Up/Down migration for `reminder_state` table. |
| `packages/database/snapshots/index.ts` | **Modify.** Add reminder-state upsert to `createSnapshot` transaction. |
| `packages/database/index.ts` or similar barrel | **Modify if needed.** Re-export any new helper. |
| `packages/config/...` | **Modify.** Add `mailgun.apiKey`, `mailgun.domain`, `mailgun.from` keys. |
| `apps/reminder/package.json` | **New.** `@reminder-app` workspace package. |
| `apps/reminder/tsconfig.json` | **New.** Matches `apps/market/tsconfig.json`. |
| `apps/reminder/src/cli/send-due-reminders.ts` | **New.** CLI entry point. |
| `apps/reminder/src/mailer/mailgun.ts` | **New.** Mailgun wrapper. |
| `apps/reminder/src/template/reminder.ts` | **New.** Pure HTML template builder. |
| `apps/reminder/src/query/find-due-users.ts` | **New.** `findDueUsers()` — send-gate SQL + shape mapping to `ReminderData`. |
| `apps/reminder/README.md` | **New.** Operator docs: env vars, cron line, how to run locally. |
| `.env` and `.env.example` | **Modify.** Add Mailgun env vars. |
| `package.json` (workspace root) | **Modify if needed.** Ensure `apps/reminder` is picked up by the workspaces glob. |

## Verification

1. **Type-check:** `bunx tsc -b --noEmit` across the workspace — clean
2. **Lint:** `bun run lint` in touched apps — no new errors
3. **Migration runs:** `bun run migrate` — `reminder_state` exists with the expected columns and index
4. **Snapshot-create hook:** create a new snapshot via the existing API, query `reminder_state` → row exists, `last_snapshot_at` is now, `last_reminder_sent_at` is null
5. **Snapshot-create hook atomicity:** force a failure in `snapshot_entries` insert → both `snapshots` row and `reminder_state` row should be absent (transaction rolled back)
6. **Send-gate query in isolation:** with a snapshot from last month, run the CLI in a test env pointed at a Mailgun sandbox domain — email arrives at the test inbox
7. **De-dupe:** run the CLI a second time immediately after a successful run — 0 due users (no second email)
8. **Cycle reset:** create a new snapshot after being reminded → `last_reminder_sent_at` is null again → next month's cycle fires
9. **Visual parity:** open the rendered HTML in a browser AND send a real test email to both Gmail and Apple Mail — confirm the layout matches the approved mockup on both clients
10. **Exit codes:** force a Mailgun failure (bad API key) → script exits with code 1, logs the failure, the rest of the batch still runs

## Open questions

None. All design decisions are resolved.
