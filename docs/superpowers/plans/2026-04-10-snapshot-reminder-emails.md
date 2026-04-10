# Snapshot Reminder Emails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `apps/reminder` worker CLI that runs hourly via host cron, finds users whose `snapshot_day` has arrived in a new month since their last snapshot, and sends them one branded HTML reminder email via Mailgun containing their last-snapshot stats and goal progress.

**Architecture:** New standalone CLI app in the monorepo (mirrors `apps/market`'s shape). Adds one DB table (`reminder_state`), one tiny hook in `createSnapshot` to upsert state atomically, Mailgun keys in the shared `@config` package, and four small files in `apps/reminder/src/` (cli, mailer, template, query). External host cron invokes `bun run -F @reminder-app send-reminders` once per hour.

**Tech Stack:** Bun runtime, TypeScript, Elysia-style workspace layout, PostgreSQL via `pg`, `@config` (convict), `@logger` (pino), `mailgun.js` + `form-data` for sending. No test framework is configured in this repo — verification is via `bunx tsc -b --noEmit` plus targeted manual runs against a real or sandbox Mailgun domain.

**Spec:** `docs/superpowers/specs/2026-04-10-snapshot-reminder-emails-design.md`

---

## File Structure

Nine tasks produce these changes. Every task ends with exactly one commit.

| File | Task | Change |
|---|---|---|
| `packages/database/migrations/<ts>_add-reminder-state.sql` | 1 | **New** — migration for `reminder_state` table + index |
| `packages/database/snapshots/index.ts` | 2 | **Modify** — add reminder_state UPSERT to `createSnapshot` transaction |
| `packages/config/index.ts` | 3 | **Modify** — add `mailgun.apiKey`, `mailgun.domain`, `mailgun.from` schema |
| `.env.example` | 3 | **Modify** — document `MAILGUN_*` env vars |
| `.env` | 3 | **Modify** — add real values for local dev (operator fills in) |
| `apps/reminder/package.json` | 4 | **New** — `@reminder-app` workspace package |
| `apps/reminder/src/mailer/mailgun.ts` | 5 | **New** — Mailgun client wrapper |
| `apps/reminder/src/template/reminder.ts` | 6 | **New** — pure HTML template builder |
| `apps/reminder/src/query/find-due-users.ts` | 7 | **New** — SQL + row mapping to `ReminderData[]` |
| `apps/reminder/src/cli/send-due-reminders.ts` | 8 | **New** — CLI entry point that wires everything together |
| `apps/reminder/README.md` | 9 | **New** — operator docs: env vars, local run, crontab line |

The four `apps/reminder/src/` files are each single-responsibility: mailer knows about Mailgun, template is pure HTML, query is pure SQL + mapping, CLI is pure orchestration. Cross-file coupling is limited to a single exported type (`ReminderData`) defined in `query/find-due-users.ts` and consumed by the CLI and the template.

---

## Task 1: Database migration for `reminder_state`

**Goal of this task:** After the migration runs, `reminder_state` exists with the schema and index from the spec, and `\d reminder_state` in psql matches.

**Files:**
- Create: `packages/database/migrations/<ts>_add-reminder-state.sql` (exact timestamp picked in Step 1)

---

- [ ] **Step 1: Generate the migration filename**

The project uses 13-digit millisecond epoch timestamps as filename prefixes (see existing files in `packages/database/migrations/`). Generate the current timestamp:

```bash
echo "$(date +%s)000_add-reminder-state.sql"
```

This produces something like `1775820000000_add-reminder-state.sql`. Remember this exact filename — you'll use it in Step 2 and nowhere else. (If the build clock is wrong, use the literal filename `1775820000000_add-reminder-state.sql` — the exact number doesn't matter, only that it sorts after the latest existing migration.)

- [ ] **Step 2: Create the migration file**

Create `packages/database/migrations/<the-filename-from-step-1>` with these exact contents:

```sql
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

The pattern (SQL at the top, `-- Down Migration` marker, DROP statements) matches existing migrations like `packages/database/migrations/1775554111228_add-portfolio-tables.sql`.

- [ ] **Step 3: Run the migration**

From the repo root:

```bash
cd packages/database && bun run migrate up
```

Expected output: something like `Migrated files: 1775820000000_add-reminder-state.sql` with no errors. If the `migrate` script isn't wired up the same way, fall back to whatever command the other migrations use — check `packages/database/package.json`'s `scripts` section.

- [ ] **Step 4: Verify the table exists**

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d one_day_investor -c "\d reminder_state"
```

Expected output includes:
- Column `user_id` (uuid, primary key, not null)
- Column `last_snapshot_at` (timestamp with time zone, not null)
- Column `last_reminder_sent_at` (timestamp with time zone, nullable)
- Index `idx_reminder_state_due` on `(last_snapshot_at, last_reminder_sent_at)`
- Foreign key to `users(id)` with `ON DELETE CASCADE`

If anything is off, fix the migration SQL, run `bun run migrate down` then `up` again, and re-verify.

- [ ] **Step 5: Commit**

```bash
git add packages/database/migrations/
git commit -m "$(cat <<'EOF'
feat(db): add reminder_state table for snapshot reminders

Tracks per-user last-snapshot timestamp and last-reminder-sent
timestamp so the hourly reminder CLI can dedupe sends.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Snapshot create hook

**Goal of this task:** Every successful `createSnapshot` call upserts `reminder_state` atomically in the same transaction. If the snapshot insert rolls back, the `reminder_state` write rolls back too.

**Files:**
- Modify: `packages/database/snapshots/index.ts`

---

- [ ] **Step 1: Read the current `createSnapshot`**

Open `packages/database/snapshots/index.ts`. Find the `createSnapshot` function (starts around line 79). Confirm its current shape: it `BEGIN`s a transaction, inserts the snapshot, inserts the entries in a loop, then `COMMIT`s.

- [ ] **Step 2: Add the UPSERT inside the transaction**

Immediately before the `await client.query("COMMIT");` line, add this block:

```typescript
    await client.query(
      `INSERT INTO reminder_state (user_id, last_snapshot_at, last_reminder_sent_at)
       VALUES ($1, now(), NULL)
       ON CONFLICT (user_id) DO UPDATE
         SET last_snapshot_at = EXCLUDED.last_snapshot_at,
             last_reminder_sent_at = NULL`,
      [params.user_id]
    );
```

The `await client.query("COMMIT");` line stays exactly where it was; the new block goes directly above it so both writes share the same transaction.

- [ ] **Step 3: Type-check**

```bash
bunx tsc -b packages/database --noEmit
```

Expected: no output. If you see a `bun-types` error or a `moduleResolution=node10` deprecation warning, those are pre-existing and not from your change — they existed before Task 1. Only fail this step on errors caused by the new SQL literal (syntax typos, missing commas, etc.).

- [ ] **Step 4: Manual verify the hook**

Open a psql session and confirm reminder_state is currently empty (or note what's in it). Then create a test snapshot via the core API — or if that's awkward, run this SQL manually, which simulates what `createSnapshot` now does atomically:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d one_day_investor <<'SQL'
BEGIN;
-- Pick any real user_id from your DB:
-- SELECT id FROM users LIMIT 1;
-- Use that below:
WITH u AS (SELECT id FROM users LIMIT 1)
INSERT INTO reminder_state (user_id, last_snapshot_at, last_reminder_sent_at)
SELECT u.id, now(), NULL FROM u
ON CONFLICT (user_id) DO UPDATE
  SET last_snapshot_at = EXCLUDED.last_snapshot_at,
      last_reminder_sent_at = NULL;
SELECT * FROM reminder_state;
ROLLBACK;
SQL
```

Expected: a row is returned in the SELECT before ROLLBACK undoes it. This confirms the SQL is valid and the upsert works against the real schema. (We ROLLBACK so we don't pollute the dev DB — the real hook inside `createSnapshot` will COMMIT when called from the API.)

- [ ] **Step 5: Commit**

```bash
git add packages/database/snapshots/index.ts
git commit -m "$(cat <<'EOF'
feat(db): upsert reminder_state on snapshot create

Keeps last_snapshot_at in sync and resets last_reminder_sent_at to
NULL so the next reminder cycle can fire. Runs inside the existing
createSnapshot transaction so a failed snapshot rolls back the
reminder state change too.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Mailgun config + env vars

**Goal of this task:** The shared `@config` package exposes `mailgun.apiKey`, `mailgun.domain`, and `mailgun.from` keys, and the `.env.example` file documents the corresponding env vars. After this task, any app in the monorepo can call `config.get("mailgun.apiKey")` and get a string (empty if unset).

**Files:**
- Modify: `packages/config/index.ts`
- Modify: `.env.example`
- Modify: `.env` (local dev — operator fills in real values)

---

- [ ] **Step 1: Add the `mailgun` block to the convict schema**

Open `packages/config/index.ts`. Inside the `convict({ ... })` call, add a new top-level `mailgun` block. Put it directly after the existing `session` block (order doesn't matter functionally, but match the visual grouping).

```typescript
  mailgun: {
    apiKey: {
      doc: "Mailgun API key (EU or US)",
      format: String,
      default: "",
      env: "MAILGUN_API_KEY",
      sensitive: true,
    },
    domain: {
      doc: "Mailgun sending domain",
      format: String,
      default: "",
      env: "MAILGUN_DOMAIN",
    },
    from: {
      doc: "Mailgun From header value",
      format: String,
      default: "",
      env: "MAILGUN_FROM",
    },
  },
```

The final file's overall shape stays exactly the same (still ends with `config.validate({ allowed: "strict" });` and `export default config;`). The `default: ""` values are critical — they ensure apps that don't set these env vars (core, analytics, market, frontend) don't crash at config-load time.

- [ ] **Step 2: Type-check the config package**

```bash
bunx tsc -b packages/config --noEmit
```

Expected: no output. Fix any syntax errors you introduced.

- [ ] **Step 3: Verify config still loads in a consumer**

```bash
bun -e 'import config from "@config"; console.log(config.get("mailgun.apiKey") === ""); console.log(config.get("postgres.host"));'
```

Expected: prints `true` (empty string) and `localhost` (or whatever your `POSTGRES_HOST` is). If convict throws at import time, fix the schema and re-run.

- [ ] **Step 4: Document env vars in `.env.example`**

Append this block to `.env.example` (below the existing `VITE_MARKET_URL` line):

```bash

# Mailgun
MAILGUN_API_KEY=
MAILGUN_DOMAIN=odinvestor.net
MAILGUN_FROM="One Day Investor <postmaster@odinvestor.net>"
```

Keep the values commented/blank for `MAILGUN_API_KEY` so nobody accidentally commits a real secret.

- [ ] **Step 5: Add the same keys to the local `.env`**

Append to `.env` (the real file, not the example). Leave `MAILGUN_API_KEY` blank for now — the operator fills it in when they want to actually send mail. The domain and From fields get real values:

```bash

# Mailgun
MAILGUN_API_KEY=
MAILGUN_DOMAIN=odinvestor.net
MAILGUN_FROM="One Day Investor <postmaster@odinvestor.net>"
```

(If `.env` is `.gitignore`d — and it should be — `git status` won't show it as changed. That's expected. The commit only stages `.env.example` and the config file.)

- [ ] **Step 6: Commit**

```bash
git add packages/config/index.ts .env.example
git commit -m "$(cat <<'EOF'
feat(config): add mailgun api key, domain, and from

Prepares shared config for the reminder CLI. All three keys default
to empty strings so non-mailer apps continue to load fine.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Scaffold `apps/reminder` workspace package

**Goal of this task:** A new workspace package `@reminder-app` exists under `apps/reminder/` with the right `package.json`, the `mailgun.js` + `form-data` dependencies installed, and an empty `src/` tree ready for the files in tasks 5-8.

**Files:**
- Create: `apps/reminder/package.json`
- Create: `apps/reminder/tsconfig.json`
- Create: `apps/reminder/src/cli/.gitkeep`
- Create: `apps/reminder/src/mailer/.gitkeep`
- Create: `apps/reminder/src/template/.gitkeep`
- Create: `apps/reminder/src/query/.gitkeep`

---

- [ ] **Step 1: Create the package.json**

Create `apps/reminder/package.json` with these exact contents:

```json
{
  "name": "@reminder-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "send-reminders": "bun run src/cli/send-due-reminders.ts"
  },
  "dependencies": {
    "@config": "workspace:*",
    "@database": "workspace:*",
    "@logger": "workspace:*",
    "form-data": "^4.0.1",
    "mailgun.js": "^11.1.0"
  },
  "devDependencies": {
    "bun-types": "latest"
  }
}
```

Notes:
- `@reminder-app` matches the `@market-app` naming convention.
- No `dev` script (this is CLI-only, no long-running server).
- No `elysia` dependency (not a web app).
- `private: true` keeps it out of any future publish flows.

- [ ] **Step 2: Create the tsconfig.json**

Create `apps/reminder/tsconfig.json` with exactly these contents — matches the pattern in `packages/database/tsconfig.json` and `apps/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json"
}
```

This gives the app strict mode + bun-types + all the base compiler options, and lets you run `bunx tsc -b apps/reminder --noEmit` for every downstream type-check step.

- [ ] **Step 3: Create empty `src/` subdirectories with `.gitkeep`**

Git doesn't track empty directories, so seed each subfolder with an empty placeholder file:

```bash
mkdir -p apps/reminder/src/cli apps/reminder/src/mailer apps/reminder/src/template apps/reminder/src/query
touch apps/reminder/src/cli/.gitkeep apps/reminder/src/mailer/.gitkeep apps/reminder/src/template/.gitkeep apps/reminder/src/query/.gitkeep
```

- [ ] **Step 4: Install the new dependencies**

```bash
bun install
```

Expected: Bun updates `bun.lockb` and installs `mailgun.js` + `form-data` into `node_modules`. No errors.

- [ ] **Step 5: Verify the workspace picks up the new package**

```bash
bun pm ls --filter @reminder-app 2>&1 || ls apps/reminder/node_modules 2>&1 || true
ls apps/reminder/
```

Expected: `apps/reminder/` contains `package.json`, `tsconfig.json`, `src/`, and (after `bun install`) `node_modules` with symlinks to the workspace packages.

- [ ] **Step 6: Type-check the empty scaffold**

```bash
bunx tsc -b apps/reminder --noEmit
```

Expected: no output. Since `src/` contains only `.gitkeep` files, tsc has nothing to compile and exits cleanly. Any error here means the tsconfig is wrong — fix before moving on.

- [ ] **Step 7: Commit**

```bash
git add apps/reminder/package.json apps/reminder/tsconfig.json apps/reminder/src/cli/.gitkeep apps/reminder/src/mailer/.gitkeep apps/reminder/src/template/.gitkeep apps/reminder/src/query/.gitkeep bun.lockb
git commit -m "$(cat <<'EOF'
feat(reminder): scaffold @reminder-app workspace package

Empty shell with @config/@database/@logger workspace deps and
mailgun.js + form-data external deps. Includes tsconfig extending
the repo base. Ready for mailer, template, query, and cli files
in follow-up commits.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

(If `bun.lockb` is `.gitignore`d, drop it from `git add` — it'll already be excluded. Otherwise include it so CI picks up the resolved versions.)

---

## Task 5: Mailgun wrapper

**Goal of this task:** `apps/reminder/src/mailer/mailgun.ts` exports a single `sendReminderEmail({ to, subject, html })` function that posts to Mailgun and resolves on success or rejects on failure. No retries, no fallbacks, no state.

**Files:**
- Create: `apps/reminder/src/mailer/mailgun.ts`

---

- [ ] **Step 1: Create the wrapper file**

Create `apps/reminder/src/mailer/mailgun.ts` with these exact contents:

```typescript
import FormData from "form-data";
import Mailgun from "mailgun.js";
import config from "@config";

const mailgun = new Mailgun(FormData);

const mg = mailgun.client({
  username: "api",
  key: config.get("mailgun.apiKey"),
  // Add `url: "https://api.eu.mailgun.net"` here if the sending domain
  // ever moves to the EU region.
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

Notes:
- **HTML only**, no plain-text fallback (intentional per spec).
- **No retry logic** inside the wrapper (the CLI's try/catch + hourly cron provide retry semantics).
- The `mg` client is created once at module import, reused for every call inside the same CLI run.

- [ ] **Step 2: Remove the mailer .gitkeep**

The `.gitkeep` is no longer needed now that the directory has a real file:

```bash
rm apps/reminder/src/mailer/.gitkeep
```

- [ ] **Step 3: Type-check**

```bash
bunx tsc -b apps/reminder --noEmit
```

Expected: no errors. If you see `Cannot find module 'mailgun.js'`, re-run `bun install` from the repo root.

- [ ] **Step 4: Commit**

```bash
git add apps/reminder/src/mailer/mailgun.ts
git rm apps/reminder/src/mailer/.gitkeep
git commit -m "$(cat <<'EOF'
feat(reminder): add mailgun client wrapper

sendReminderEmail(to, subject, html) posts to Mailgun using the
shared @config values. No retries — the CLI's per-user try/catch
plus the hourly cron provide retry semantics.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: HTML template builder

**Goal of this task:** `apps/reminder/src/template/reminder.ts` exports a pure `renderReminderEmail(data)` function that returns the full `<!doctype html>` string for the reminder email. The layout matches the approved mockup — emerald hero, two stats cards, progress bar, CTA button, footer — all fully inlined, using `<table role="presentation">` layouts for email-client compatibility.

**Files:**
- Create: `apps/reminder/src/template/reminder.ts`

---

- [ ] **Step 1: Create the template file**

Create `apps/reminder/src/template/reminder.ts` with these exact contents:

```typescript
export interface ReminderData {
  user_id: string;
  email: string;
  name: string;               // full name, used for the "To:" header
  firstName: string;          // "Pavel" — derived in find-due-users.ts
  currentMonthLabel: string;  // "April" — the month we're nagging them about
  lastMonthLabel: string;     // "March 2026"
  lastCreatedAtLabel: string; // "Mar 1"
  lastTotal: number;          // 21240
  goal: number;               // 50000
  symbol: string;             // "€"
  ctaHref: string;            // "https://odinvestor.net/snapshots"
}

function formatAmount(n: number, symbol: string): string {
  return `${symbol}${Number(n).toLocaleString("en-US")}`;
}

export function renderReminderEmail(data: ReminderData): string {
  const percent =
    data.goal > 0 ? Math.round((data.lastTotal / data.goal) * 100) : 0;
  const progressWidth = Math.min(100, percent);
  const lastTotalFmt = formatAmount(data.lastTotal, data.symbol);
  const goalFmt = formatAmount(data.goal, data.symbol);

  return `<!doctype html>
<html>
  <body style="margin:0;padding:20px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"
           style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
      <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 55%,#34d399 100%);padding:32px;color:#ffffff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);">
          &#x25cf; One Day Investor
        </div>
        <h1 style="margin:18px 0 6px;font-size:26px;font-weight:800;line-height:1.15;letter-spacing:-0.015em;">
          Time for your ${data.currentMonthLabel} snapshot, ${data.firstName}
        </h1>
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.88);line-height:1.5;max-width:420px;">
          It's been a month since you last recorded your portfolio. Take 2 minutes to update it and keep your timeline honest.
        </p>
      </td></tr>

      <tr><td style="padding:22px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:50%;padding-right:7px;vertical-align:top;">
            <div style="padding:14px;border:1px solid #e5e7eb;border-radius:10px;">
              <div style="font-size:9px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#64748b;">Last snapshot</div>
              <div style="margin-top:4px;font-size:18px;font-weight:800;color:#0f172a;">${data.lastMonthLabel}</div>
              <div style="margin-top:2px;font-size:11px;color:#64748b;">created ${data.lastCreatedAtLabel}</div>
            </div>
          </td>
          <td style="width:50%;padding-left:7px;vertical-align:top;">
            <div style="padding:14px;border:1px solid #e5e7eb;border-radius:10px;">
              <div style="font-size:9px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#64748b;">Last total</div>
              <div style="margin-top:4px;font-size:18px;font-weight:800;color:#0f172a;">${lastTotalFmt}</div>
              <div style="margin-top:2px;font-size:11px;color:#64748b;">${percent}% of goal</div>
            </div>
          </td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:20px 32px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Goal progress</td>
          <td style="font-size:10px;font-weight:800;color:#047857;text-align:right;">${lastTotalFmt} / ${goalFmt}</td>
        </tr></table>
        <div style="margin-top:8px;height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden;">
          <div style="height:8px;width:${progressWidth}%;background:linear-gradient(90deg,#059669,#10b981);border-radius:99px;"></div>
        </div>
      </td></tr>

      <tr><td style="padding:24px 32px 32px;">
        <a href="${data.ctaHref}"
           style="display:block;background:linear-gradient(135deg,#059669,#10b981);color:#ffffff;text-align:center;padding:14px 20px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 6px 16px rgba(16,185,129,0.3);">
          Record ${data.currentMonthLabel} snapshot &rarr;
        </a>
      </td></tr>

      <tr><td style="padding:16px 32px 22px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;line-height:1.5;">
        You're getting this because your monthly snapshot day has arrived.<br>
        <strong style="color:#475569;">One Day Investor</strong> &middot; odinvestor.net
      </td></tr>
    </table>
  </body>
</html>`;
}
```

Key rendering notes baked into this code:
- `<table role="presentation">` for every layout (email clients ignore flex/grid)
- No `<style>` block — all styles are inline (many clients strip `<style>`)
- The progress-bar track and fill both explicitly set `height:8px` (some clients ignore percentage heights on absolutely-positioned children)
- No images, no webfonts
- HTML entities (`&#x25cf;`, `&rarr;`, `&middot;`) instead of raw unicode for maximum compatibility

- [ ] **Step 2: Remove the template .gitkeep**

```bash
rm apps/reminder/src/template/.gitkeep
```

- [ ] **Step 3: Type-check**

```bash
bunx tsc -b apps/reminder --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke-test the render**

Write the rendered output to a temporary file and open it in a browser to visually confirm the layout before committing:

```bash
bun -e '
import { renderReminderEmail } from "./apps/reminder/src/template/reminder.ts";
const html = renderReminderEmail({
  user_id: "test",
  email: "test@example.com",
  name: "Pavel Test",
  firstName: "Pavel",
  currentMonthLabel: "April",
  lastMonthLabel: "March 2026",
  lastCreatedAtLabel: "Mar 1",
  lastTotal: 21240,
  goal: 50000,
  symbol: "\u20ac",
  ctaHref: "https://odinvestor.net/snapshots",
});
await Bun.write("/tmp/reminder-preview.html", html);
console.log("Wrote /tmp/reminder-preview.html");
'
open /tmp/reminder-preview.html  # macOS; use xdg-open on Linux
```

Expected: browser opens showing the emerald hero, two stats cards, progress bar at 42%, CTA button, footer. Layout matches the approved mockup. If it looks broken, fix the template and re-run.

- [ ] **Step 5: Commit**

```bash
git add apps/reminder/src/template/reminder.ts
git rm apps/reminder/src/template/.gitkeep
git commit -m "$(cat <<'EOF'
feat(reminder): add HTML email template

Pure renderReminderEmail(data) function returns a fully-inlined
HTML string matching the approved mockup (emerald hero, stats row,
progress bar, CTA, footer). Uses <table role="presentation"> layout
for email-client compatibility.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Send-gate query + `ReminderData` mapping

**Goal of this task:** `apps/reminder/src/query/find-due-users.ts` exports `findDueUsers()` returning `Promise<ReminderData[]>`. It runs the send-gate SQL against the DB pool and maps each raw row to a fully-populated `ReminderData` suitable for passing straight to `renderReminderEmail`.

**Files:**
- Create: `apps/reminder/src/query/find-due-users.ts`

---

- [ ] **Step 1: Create the query file**

Create `apps/reminder/src/query/find-due-users.ts` with these exact contents:

```typescript
import { pool } from "@database";
import config from "@config";
import type { ReminderData } from "../template/reminder";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
};

interface DueRow {
  user_id: string;
  email: string;
  name: string | null;
  snapshot_day: number;
  goal: string;                // numeric comes back as string from pg
  currency: string;
  last_snapshot_month: Date;
  last_snapshot_total: string; // numeric → string
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatCurrentMonthLabel(now: Date): string {
  return now.toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

function firstNameOf(name: string | null): string {
  if (!name) return "there";
  const trimmed = name.trim().split(/\s+/)[0];
  return trimmed.length > 0 ? trimmed : "there";
}

export async function findDueUsers(): Promise<ReminderData[]> {
  const { rows } = await pool.query<DueRow>(
    `SELECT
         rs.user_id,
         u.email,
         u.name,
         us.snapshot_day,
         us.goal,
         us.currency,
         ls.month AS last_snapshot_month,
         ls.total AS last_snapshot_total
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
         date_trunc('month', now())
           > date_trunc('month', rs.last_snapshot_at)
         AND EXTRACT(DAY FROM now())::int >= us.snapshot_day
         AND (rs.last_reminder_sent_at IS NULL
              OR rs.last_reminder_sent_at < rs.last_snapshot_at)`,
  );

  const now = new Date();
  const ctaHref = `${config.get("frontendUrl")}/snapshots`;

  return rows.map((row) => {
    const symbol = CURRENCY_SYMBOLS[row.currency] ?? "\u20ac";
    return {
      user_id: row.user_id,
      email: row.email,
      name: row.name ?? row.email,
      firstName: firstNameOf(row.name),
      currentMonthLabel: formatCurrentMonthLabel(now),
      lastMonthLabel: formatMonthYear(row.last_snapshot_month),
      lastCreatedAtLabel: formatShortDate(row.last_snapshot_month),
      lastTotal: Number(row.last_snapshot_total),
      goal: Number(row.goal),
      symbol,
      ctaHref,
    };
  });
}
```

Notes:
- Imports `ReminderData` as a **type-only** import from the template module so there's no runtime cycle.
- `DueRow.goal` and `last_snapshot_total` are typed as `string` because node-postgres returns `NUMERIC` columns as strings; `Number(...)` coerces them at the boundary.
- `last_snapshot_month` is a `Date` because node-postgres returns `DATE` columns as JS Date objects.
- `lastCreatedAtLabel` uses the same month value (e.g. "Mar 1") — this is the spec's "created Mar 1" caption. Using `month/day` of the stored DATE gives a deterministic, timezone-safe label.
- `firstNameOf("   ")` correctly returns `"there"` (trimmed empty split produces `[""]`, length check rescues).
- `ctaHref` uses `config.get("frontendUrl")` so the same CLI works in dev (`http://localhost:5173`) and prod (`https://odinvestor.net`).

- [ ] **Step 2: Remove the query .gitkeep**

```bash
rm apps/reminder/src/query/.gitkeep
```

- [ ] **Step 3: Type-check**

```bash
bunx tsc -b apps/reminder --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke-test against the real DB**

Run the query function and print the count — no email is sent:

```bash
bun -e '
import { findDueUsers } from "./apps/reminder/src/query/find-due-users.ts";
import { pool } from "@database";
const due = await findDueUsers();
console.log("due users:", due.length);
if (due.length > 0) console.log("first due:", JSON.stringify(due[0], null, 2));
await pool.end();
'
```

Expected: prints the count (likely `0` in a fresh dev DB where nobody is overdue). If you see a SQL error, the LATERAL join or a column name is wrong — fix and re-run. If you see `due users: 0` that's correct behavior — no one is due.

To force a positive case for local testing, temporarily backdate a `reminder_state` row:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d one_day_investor <<'SQL'
UPDATE reminder_state
SET last_snapshot_at = now() - interval '40 days',
    last_reminder_sent_at = NULL
WHERE user_id = (SELECT id FROM users LIMIT 1);
SQL
```

Re-run the bun command. Expected: `due users: 1`. Don't forget to reset the row afterward:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d one_day_investor <<'SQL'
UPDATE reminder_state
SET last_snapshot_at = now()
WHERE user_id = (SELECT id FROM users LIMIT 1);
SQL
```

- [ ] **Step 5: Commit**

```bash
git add apps/reminder/src/query/find-due-users.ts
git rm apps/reminder/src/query/.gitkeep
git commit -m "$(cat <<'EOF'
feat(reminder): add findDueUsers() query + ReminderData mapping

Runs the send-gate SQL (calendar month + snapshot_day + dedupe) in
one round-trip with a LATERAL join that pulls the latest snapshot's
month and total. Maps raw rows to fully-populated ReminderData
suitable for renderReminderEmail().

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: CLI entry point

**Goal of this task:** `apps/reminder/src/cli/send-due-reminders.ts` wires `findDueUsers` → `renderReminderEmail` → `sendReminderEmail` → `UPDATE reminder_state`, with per-user try/catch, structured logging, and exit codes. After this task, running `bun run -F @reminder-app send-reminders` from the repo root executes the full happy path against the real DB and Mailgun.

**Files:**
- Create: `apps/reminder/src/cli/send-due-reminders.ts`

---

- [ ] **Step 1: Create the CLI file**

Create `apps/reminder/src/cli/send-due-reminders.ts` with these exact contents:

```typescript
import { createLogger } from "@logger";
import { pool } from "@database";
import { findDueUsers } from "../query/find-due-users";
import { sendReminderEmail } from "../mailer/mailgun";
import { renderReminderEmail } from "../template/reminder";

const log = createLogger("reminder-cli");

async function main(): Promise<number> {
  const startedAt = Date.now();

  let due;
  try {
    due = await findDueUsers();
  } catch (err) {
    log.error({ err }, "failed to query due users");
    return 2;
  }

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
      log.info({ user_id: user.user_id, email: user.email }, "reminder sent");
    } catch (err) {
      failed++;
      log.error({ err, user_id: user.user_id }, "send failed");
    }
  }

  log.info(
    { sent, failed, durationMs: Date.now() - startedAt },
    "reminder run complete"
  );
  return failed > 0 ? 1 : 0;
}

main()
  .then(async (code) => {
    await pool.end();
    process.exit(code);
  })
  .catch(async (err) => {
    log.fatal({ err }, "reminder run crashed");
    try {
      await pool.end();
    } catch {
      /* ignore cleanup errors on fatal path */
    }
    process.exit(2);
  });
```

Key properties:
- **`main()` returns the exit code** (0, 1, or 2) — the `.then` handles pool cleanup and `process.exit`.
- **Two distinct error categories**: the initial `findDueUsers()` query failure is a fatal-ish exit 2 (we couldn't even build the batch); per-user send failures are exit 1 (partial success).
- **Mark-after-send.** The `UPDATE reminder_state ... last_reminder_sent_at` is inside the try block, **after** the Mailgun call succeeds. If the `UPDATE` itself fails (unlikely), the Mailgun call already happened — the user might get a second email next hour. Acceptable over-send vs. silent under-send.
- **`pool.end()`** is always called before exit so the process dies cleanly. Without this, bun hangs after the main work completes (pg keeps TCP sockets alive).
- **`log.info`** on each successful send so operators can tail `/var/log/reminder.log` and see per-user confirmations.

- [ ] **Step 2: Remove the CLI .gitkeep**

```bash
rm apps/reminder/src/cli/.gitkeep
```

- [ ] **Step 3: Type-check**

```bash
bunx tsc -b apps/reminder --noEmit
```

Expected: no errors. If you get "cannot find module '@database'" or similar workspace errors, re-run `bun install` from the repo root.

- [ ] **Step 4: Dry-run with zero due users**

```bash
bun run -F @reminder-app send-reminders
```

Expected JSON log lines:
```
{"level":30,"service":"reminder-cli","count":0,"msg":"due users found"}
{"level":30,"service":"reminder-cli","sent":0,"failed":0,"durationMs":<small>,"msg":"reminder run complete"}
```

Exit code 0 (check with `echo $?`).

- [ ] **Step 5: Force-test one real send (requires real `MAILGUN_API_KEY`)**

Skip this step if you haven't set a Mailgun key yet. Otherwise:

1. Edit `.env` and set `MAILGUN_API_KEY` to a real value (Mailgun sandbox key is fine — just add your own email as an authorized recipient in Mailgun's sandbox UI first).
2. Backdate a reminder_state row as in Task 7's smoke-test so one user is due.
3. Run:

    ```bash
    bun run -F @reminder-app send-reminders
    ```

4. Expected: log lines show `count: 1`, `reminder sent`, `sent: 1, failed: 0`, exit 0. Check the inbox — the email should arrive within a minute looking exactly like `/tmp/reminder-preview.html` from Task 6 Step 4.
5. Immediately re-run the command. Expected: `count: 0` — the `UPDATE last_reminder_sent_at = now()` should have dedup'd.
6. Reset state: `UPDATE reminder_state SET last_snapshot_at = now(), last_reminder_sent_at = NULL WHERE user_id = '...';`

- [ ] **Step 6: Commit**

```bash
git add apps/reminder/src/cli/send-due-reminders.ts
git rm apps/reminder/src/cli/.gitkeep
git commit -m "$(cat <<'EOF'
feat(reminder): add send-due-reminders CLI entry point

Wires findDueUsers -> renderReminderEmail -> sendReminderEmail ->
UPDATE reminder_state with per-user try/catch and structured
logging. Exit codes: 0 clean, 1 partial send failures, 2 fatal.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Operator README with cron instructions

**Goal of this task:** A single `apps/reminder/README.md` documents everything the operator needs: required env vars, how to run locally, the exact crontab line to add on the host, and how to verify a run.

**Files:**
- Create: `apps/reminder/README.md`

---

- [ ] **Step 1: Create the README**

Create `apps/reminder/README.md` with these exact contents:

````markdown
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
````

- [ ] **Step 2: Verify the README renders cleanly**

Eyeball it, or run it through a markdown renderer if you have one installed:

```bash
cat apps/reminder/README.md | head -40
```

- [ ] **Step 3: Commit**

```bash
git add apps/reminder/README.md
git commit -m "$(cat <<'EOF'
docs(reminder): add operator README

Documents env vars, local run, production crontab line, exit codes,
and troubleshooting for @reminder-app.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final verification checklist

After all 9 tasks are committed, run through this end-to-end:

- [ ] `bunx tsc -b --noEmit` across the workspace — clean (existing unrelated errors are fine, new errors from reminder are not)
- [ ] Migration is applied: `\d reminder_state` in psql shows the table
- [ ] Snapshot creation hook works: create a new snapshot via the frontend, then `SELECT * FROM reminder_state WHERE user_id = '...'` — row exists with `last_snapshot_at ≈ now()` and `last_reminder_sent_at IS NULL`
- [ ] `@config` exposes `mailgun.apiKey`, `mailgun.domain`, `mailgun.from` (verified via the `bun -e` snippet in Task 3)
- [ ] `bun run -F @reminder-app send-reminders` runs to completion with exit 0 when no users are due
- [ ] With a backdated row, the CLI sends exactly one email to the test inbox
- [ ] Running the CLI a second time immediately after a successful send returns `count: 0` (dedupe works)
- [ ] After creating a new snapshot, the `last_reminder_sent_at` is reset to NULL and the next cycle re-arms
- [ ] The delivered email visually matches `/tmp/reminder-preview.html` from Task 6 Step 4 in Gmail and Apple Mail
- [ ] `git log --oneline | head -9` shows the nine feature commits, cleanly ordered
- [ ] Nothing touches `apps/core`, `apps/analytics`, `apps/market`, or `apps/frontend`
