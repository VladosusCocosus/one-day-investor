# @reminder-app

Hourly CLI worker that emails users when their monthly snapshot is due.

## What it does

1. Reads `reminder_state` joined with `users`, `user_settings`, and the user's latest snapshot.
2. For each user whose configured `snapshot_day` has arrived in a new calendar month since their last snapshot — and who hasn't already been reminded this cycle — builds a branded HTML email with their last-snapshot stats.
3. Sends via Mailgun (`mailgun.js` + `form-data`).
4. Marks `reminder_state.last_reminder_sent_at = now()` on each successful send.
5. Exits. (No daemon, no long-running process.)

## Required env vars

Add these to your `.env` (see repo root `.env.example`):

```bash
MAILGUN_API_KEY=...                                    # real key
MAILGUN_DOMAIN=odinvestor.net
MAILGUN_FROM="One Day Investor <postmaster@odinvestor.net>"
```

All three are also surfaced in `@config` as `mailgun.apiKey`, `mailgun.domain`, `mailgun.from`.

**Note:** The Mailgun SDK initializes at module load time and requires `MAILGUN_API_KEY` to be non-empty. Running the CLI without a real (or dummy) key will crash before the first log line. In dev, set `MAILGUN_API_KEY=dummy-key-for-dry-run` to validate the query path without sending mail.

## Running locally

```bash
bun run -F @reminder-app send-reminders
```

Expected structured JSON log output. If no one is due, you'll see `"count":0`. To force one user to be due for testing:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d one_day_investor <<'SQL'
UPDATE reminder_state
SET last_snapshot_at = now() - interval '40 days',
    last_reminder_sent_at = NULL
WHERE user_id = (SELECT id FROM users LIMIT 1);
SQL
```

Run the CLI, confirm the send, then reset:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d one_day_investor <<'SQL'
UPDATE reminder_state SET last_snapshot_at = now() WHERE user_id = (SELECT id FROM users LIMIT 1);
SQL
```

## Production cron setup

On the production host, add one line to the operator's crontab (`crontab -e`):

```cron
# Send due snapshot reminders every hour at :00
0 * * * * cd <REPO_PATH> && bun run -F @reminder-app send-reminders >> /var/log/reminder.log 2>&1
```

Replace `<REPO_PATH>` with the actual path to the checked-out repo on the host (e.g. `/srv/one-day-investor`). Make sure `/var/log/reminder.log` is writable by the cron user, or redirect to a different path.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Clean run — 0 or more users reminded successfully |
| `1` | At least one per-user send failed (batch continued, some emails did NOT go out) |
| `2` | Fatal — the initial query crashed or the process had an uncaught error |

Host cron surfaces non-zero exits via its mail mechanism if configured. Operators should grep `/var/log/reminder.log` for `"level":50` (error) and `"level":60` (fatal) to find issues.

## Troubleshooting

**"count: 0" but I expect users to be due** — double-check the three AND conditions in the send-gate query: (1) calendar month has moved past `last_snapshot_at`'s month, (2) today's day-of-month ≥ `user_settings.snapshot_day`, (3) no reminder has been sent since the last snapshot. Use the force-due psql block above to short-circuit.

**Mailgun 401** — `MAILGUN_API_KEY` is wrong or unset. Check `.env` and the `@config` load.

**Mailgun 403 "domain not found"** — `MAILGUN_DOMAIN` doesn't match an active domain in your Mailgun account. Confirm in the Mailgun dashboard.

**Script hangs after "run complete"** — a `pool.end()` failure probably swallowed cleanup; force-kill and check the logger output.

**Same user emailed twice in one hour** — shouldn't happen (the `UPDATE` is inside the per-user try). If it does, the `UPDATE` failed after the Mailgun call succeeded; investigate DB connectivity.

**"Parameter 'key' is required" on startup** — `MAILGUN_API_KEY` is empty. The Mailgun SDK fails fast at module load. Set the env var before invoking the CLI. This is a known tradeoff of eager client initialization in `src/mailer/mailgun.ts`.
