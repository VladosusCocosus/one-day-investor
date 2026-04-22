# Agents API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let third-party agents drive the One Day Investor service through short-lived bearer tokens, scoped to the investor flow (pockets, assets, snapshots, catalog, analytics), with public Swagger + `/agents.json` discovery.

**Architecture:** Reuse existing `/api/*` endpoints. Agent tokens are stored hashed in the existing `sessions` table with a new `agent_id` FK. A single scope middleware enforces an allowlist for agent-authenticated requests; cookie sessions are unaffected. Management UI lives on the dashboard, discovery manifest lives on the marketing site.

**Tech Stack:** Elysia (Bun), PostgreSQL, React + Vite + react-query + react-i18next, `@elysiajs/swagger`.

**Spec:** `docs/superpowers/specs/2026-04-22-agents-api-design.md`

**Project context for the engineer (no prior codebase knowledge assumed):**
- Monorepo with `apps/core` (REST API, Elysia, port 3000), `apps/analytics` (separate Elysia service that exposes `/api/analytics/*`), `apps/site` (marketing site Elysia + JSX, port 3005, `odinvestor.net`), `apps/frontend` (React dashboard, `dashboard.odinvestor.net`).
- Shared `@database` package holds all SQL logic as per-domain modules (e.g. `packages/database/modules/services/index.ts`). Each module exports functions and re-exports its type from `@types`.
- Shared `@types` package (`packages/types/database/index.ts`) holds TypeScript interfaces for every DB row.
- Migrations: plain SQL files in `packages/database/migrations/`. Name format: `<unix-ms>_<slug>.sql`. To generate a timestamp run `date +%s%3N` or use any current millisecond epoch.
- No test framework in the repo. Verification is done by running the service (`bun run dev` in each `apps/*` dir) and hitting endpoints with `curl`. Each task has explicit `curl` commands and expected outputs.
- The project uses `bun`. Install dependencies with `bun add <pkg>` inside the target `apps/*` directory. `bun run --watch src/index.ts` is the dev command.
- Existing auth: Google OAuth → cookie named `session` with a token stored plaintext in `sessions.token`. `resolveUser(cookie)` in `apps/core/src/auth/session.ts` does the lookup. Analytics service has a duplicate of that file at `apps/analytics/src/auth/session.ts`.
- The dev database is Postgres reachable through `pool` from `@database`. Migrations are applied by a script in the same package; check `packages/database/package.json` for the exact command (usually `bun run migrate` or similar) before writing your own runner.

**Branching:** Work on a single feature branch. Commit after each task. One PR at the end.

---

## File structure

### New files
- `packages/database/migrations/<ts>_add-agents-table.sql` — migration.
- `packages/database/modules/agents/index.ts` — agent CRUD.
- `apps/core/src/auth/agent-token.ts` — token generation, hashing, expiry mapping.
- `apps/core/src/auth/agent-scope.ts` — scope allowlist middleware.
- `apps/core/src/api/agents.ts` — management routes (CRUD agents + tokens).
- `apps/frontend/src/lib/agentsApi.ts` — thin fetch client for `/api/agents`.
- `apps/frontend/src/hooks/useAgents.ts` — react-query wrappers.
- `apps/frontend/src/pages/AgentsPage.tsx` — management UI.

### Modified files
- `packages/types/database/index.ts` — add `Agent`, extend `Session`.
- `packages/database/modules/sessions/index.ts` — hash-lookup, touch, revoke, agent-session creation.
- `packages/database/index.ts` — re-export agents module.
- `apps/core/src/auth/session.ts` — `resolveAuth({user, agentId})`.
- `apps/core/src/api/index.ts` — mount scope middleware + agents routes.
- `apps/core/src/api/*.ts` (snapshots, services, assets, catalog, settings, notifications, exchange, admin) — swap `resolveUser` → `resolveAuth` in each `.derive`.
- `apps/core/src/index.ts` — mount `@elysiajs/swagger`.
- `apps/core/package.json` — add `@elysiajs/swagger`.
- `apps/analytics/src/auth/session.ts` — same Bearer support.
- `apps/analytics/src/api/analytics.ts` — `resolveUser` → `resolveAuth`.
- `apps/analytics/src/index.ts` — mount scope middleware.
- `apps/site/src/index.tsx` — `/agents.json` route + env-driven URLs.
- `apps/frontend/src/main.tsx` — register `/agents` route.
- `apps/frontend/src/components/Sidebar.tsx` (or whichever file owns the nav; verify in Task 14) — add "Agents" link.
- `apps/frontend/src/locales/{en,ru,es}.json` — add `agents.*` and `nav.agents` keys.

---

## Task 1: Types + migration

**Files:**
- Create: `packages/database/migrations/<ts>_add-agents-table.sql`
- Modify: `packages/types/database/index.ts`

- [ ] **Step 1: Add `Agent` type and extend `Session`**

In `packages/types/database/index.ts`, replace the existing `Session` interface and add `Agent` below it:

```ts
export interface Session {
  id: string;
  user_id: string;
  token: string | null;           // plaintext cookie sessions (legacy path)
  token_hash: string | null;      // sha256 hex of bearer tokens
  token_last4: string | null;     // last 4 chars of plaintext, for UI
  agent_id: string | null;        // null = cookie session, non-null = agent token
  expires_at: Date;
  created_at: Date;
  last_used_at: Date | null;
  revoked_at: Date | null;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: Date;
  last_used_at: Date | null;
  revoked_at: Date | null;
}

export type AgentTokenExpiresIn = "1h" | "6h" | "24h" | "7d" | "30d";
```

- [ ] **Step 2: Create the migration file**

Get a timestamp: `date +%s%3N` (example: `1777200000000`). Create `packages/database/migrations/<ts>_add-agents-table.sql`:

```sql
-- Agents and agent-session token infrastructure.

CREATE TABLE agents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

CREATE INDEX agents_user_id_active_idx ON agents (user_id) WHERE revoked_at IS NULL;

-- Extend sessions to support bearer-token agent sessions alongside cookie sessions.
ALTER TABLE sessions ADD COLUMN agent_id     uuid REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN token_hash   text;
ALTER TABLE sessions ADD COLUMN token_last4  text;
ALTER TABLE sessions ADD COLUMN last_used_at timestamptz;
ALTER TABLE sessions ADD COLUMN revoked_at   timestamptz;

-- Make the existing token column nullable so future agent sessions can use token_hash only.
ALTER TABLE sessions ALTER COLUMN token DROP NOT NULL;

CREATE INDEX sessions_agent_id_idx          ON sessions (agent_id)   WHERE agent_id IS NOT NULL;
CREATE UNIQUE INDEX sessions_token_hash_key ON sessions (token_hash) WHERE token_hash IS NOT NULL;
```

- [ ] **Step 3: Apply the migration**

From the repo root:

```bash
cd packages/database
cat package.json | grep -A1 '"scripts"'
```

Use whichever script the package exposes for migrations (likely `bun run migrate`). If none exists, use `psql` with the connection string from `.env`:

```bash
psql "$DATABASE_URL" -f migrations/<ts>_add-agents-table.sql
```

Expected: no output or a line of `ALTER TABLE` / `CREATE …`. No errors.

- [ ] **Step 4: Verify schema**

```bash
psql "$DATABASE_URL" -c "\d agents"
psql "$DATABASE_URL" -c "\d sessions"
```

Expected: `agents` table exists with the 7 columns; `sessions` now has `agent_id`, `token_hash`, `token_last4`, `last_used_at`, `revoked_at`.

- [ ] **Step 5: Commit**

```bash
git add packages/database/migrations packages/types/database/index.ts
git commit -m "feat(db): agents table + sessions extensions for bearer tokens"
```

---

## Task 2: agents database module

**Files:**
- Create: `packages/database/modules/agents/index.ts`
- Modify: `packages/database/index.ts`

- [ ] **Step 1: Write the module**

Create `packages/database/modules/agents/index.ts`:

```ts
import { pool } from "../../pool";
import type { Agent } from "@types";

export type { Agent } from "@types";

export async function createAgent(params: {
  user_id: string;
  name: string;
  description: string | null;
}): Promise<Agent> {
  const result = await pool.query<Agent>(
    `INSERT INTO agents (user_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [params.user_id, params.name, params.description]
  );
  return result.rows[0];
}

export async function listAgentsByUserId(userId: string): Promise<Agent[]> {
  const result = await pool.query<Agent>(
    `SELECT * FROM agents
     WHERE user_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function findAgentById(
  id: string,
  userId: string
): Promise<Agent | null> {
  const result = await pool.query<Agent>(
    "SELECT * FROM agents WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL",
    [id, userId]
  );
  return result.rows[0] ?? null;
}

export async function updateAgent(
  id: string,
  userId: string,
  params: { name?: string; description?: string | null }
): Promise<Agent | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(params.name);
  }
  if (params.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(params.description);
  }
  if (fields.length === 0) return findAgentById(id, userId);

  values.push(id, userId);
  const result = await pool.query<Agent>(
    `UPDATE agents SET ${fields.join(", ")}
     WHERE id = $${idx++} AND user_id = $${idx} AND revoked_at IS NULL
     RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function revokeAgent(
  id: string,
  userId: string
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const agent = await client.query(
      `UPDATE agents SET revoked_at = now()
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
       RETURNING id`,
      [id, userId]
    );
    if (agent.rowCount === 0) {
      await client.query("ROLLBACK");
      return false;
    }
    // Cascade-revoke all tokens for this agent.
    await client.query(
      `UPDATE sessions SET revoked_at = now()
       WHERE agent_id = $1 AND revoked_at IS NULL`,
      [id]
    );
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function touchAgentLastUsed(id: string): Promise<void> {
  await pool.query("UPDATE agents SET last_used_at = now() WHERE id = $1", [id]);
}

export async function countActiveTokensByAgentId(
  agentId: string
): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM sessions
     WHERE agent_id = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [agentId]
  );
  return Number(result.rows[0].count);
}
```

- [ ] **Step 2: Re-export from package index**

Modify `packages/database/index.ts` — add one line at the bottom:

```ts
export * from "./modules/agents";
```

- [ ] **Step 3: Type-check the package**

```bash
cd packages/database
bunx tsc --noEmit
```

Expected: no errors. If `bunx tsc` is not configured here, skip — TS errors will surface during the core service dev step of a later task.

- [ ] **Step 4: Commit**

```bash
git add packages/database
git commit -m "feat(db): agents module CRUD"
```

---

## Task 3: sessions module — token-hash helpers

**Files:**
- Modify: `packages/database/modules/sessions/index.ts`

- [ ] **Step 1: Extend the module**

Replace the contents of `packages/database/modules/sessions/index.ts` with:

```ts
import { pool } from "../../pool";
import type { Session } from "@types";

export type { Session } from "@types";

/**
 * Cookie session creation (legacy plaintext token path).
 * Unchanged signature for back-compat.
 */
export async function createSession(params: {
  user_id: string;
  token: string;
  expires_at: Date;
}): Promise<Session> {
  const result = await pool.query<Session>(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [params.user_id, params.token, params.expires_at]
  );
  return result.rows[0];
}

/**
 * Agent-session creation. Stores only the SHA-256 hash of the plaintext token
 * plus the last 4 characters for UI display.
 */
export async function createAgentSession(params: {
  user_id: string;
  agent_id: string;
  token_hash: string;
  token_last4: string;
  expires_at: Date;
}): Promise<Session> {
  const result = await pool.query<Session>(
    `INSERT INTO sessions (user_id, agent_id, token_hash, token_last4, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      params.user_id,
      params.agent_id,
      params.token_hash,
      params.token_last4,
      params.expires_at,
    ]
  );
  return result.rows[0];
}

/** Cookie lookup. Filters on expires_at and revoked_at. */
export async function findSessionByToken(
  token: string
): Promise<Session | null> {
  const result = await pool.query<Session>(
    `SELECT * FROM sessions
     WHERE token = $1
       AND expires_at > now()
       AND revoked_at IS NULL`,
    [token]
  );
  return result.rows[0] ?? null;
}

/** Bearer lookup. Filters on expires_at and revoked_at. */
export async function findSessionByTokenHash(
  tokenHash: string
): Promise<Session | null> {
  const result = await pool.query<Session>(
    `SELECT * FROM sessions
     WHERE token_hash = $1
       AND expires_at > now()
       AND revoked_at IS NULL`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
}

/** Best-effort last-used stamp. Callers fire-and-forget. */
export async function touchSessionLastUsed(id: string): Promise<void> {
  await pool.query(
    "UPDATE sessions SET last_used_at = now() WHERE id = $1",
    [id]
  );
}

export async function revokeSession(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE sessions SET revoked_at = now()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * List active+revoked tokens for an agent. Caller filters user ownership upstream.
 * Used by the management UI — never called by agent-authenticated requests.
 */
export async function listTokensByAgentId(agentId: string): Promise<Session[]> {
  const result = await pool.query<Session>(
    `SELECT * FROM sessions
     WHERE agent_id = $1
     ORDER BY created_at DESC`,
    [agentId]
  );
  return result.rows;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/database/modules/sessions/index.ts
git commit -m "feat(db): sessions module bearer-token helpers"
```

---

## Task 4: Agent-token utilities (core)

**Files:**
- Create: `apps/core/src/auth/agent-token.ts`

- [ ] **Step 1: Write token utilities**

Create `apps/core/src/auth/agent-token.ts`:

```ts
import { randomBytes, createHash } from "node:crypto";
import type { AgentTokenExpiresIn } from "@types";

const TOKEN_PREFIX = "oda_";

/** Returns { plaintext, hash, last4 }. Plaintext shown once to the user. */
export function generateAgentToken(): {
  plaintext: string;
  hash: string;
  last4: string;
} {
  const raw = randomBytes(32).toString("base64url"); // ~43 chars
  const plaintext = `${TOKEN_PREFIX}${raw}`;
  const hash = sha256Hex(plaintext);
  const last4 = plaintext.slice(-4);
  return { plaintext, hash, last4 };
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function parseBearer(header: string | undefined): string | null {
  if (!header) return null;
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

const EXPIRES_IN_MS: Record<AgentTokenExpiresIn, number> = {
  "1h":  60 * 60 * 1000,
  "6h":  6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d":  7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function isValidExpiresIn(
  value: string
): value is AgentTokenExpiresIn {
  return value in EXPIRES_IN_MS;
}

export function expiresAtFrom(expiresIn: AgentTokenExpiresIn): Date {
  return new Date(Date.now() + EXPIRES_IN_MS[expiresIn]);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/core/src/auth/agent-token.ts
git commit -m "feat(core): agent-token generation + hashing utilities"
```

---

## Task 5: Extend `resolveUser` → `resolveAuth` (core)

**Files:**
- Modify: `apps/core/src/auth/session.ts`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `apps/core/src/auth/session.ts` with:

```ts
import {
  findSessionByToken,
  findSessionByTokenHash,
  findUserById,
  touchSessionLastUsed,
  touchAgentLastUsed,
} from "@database";
import { createLogger } from "@logger";
import type { User } from "@types";
import { parseBearer, sha256Hex } from "./agent-token";

const log = createLogger("auth");

export interface ResolvedAuth {
  user: User | null;
  agentId: string | null;
}

export async function resolveAuth(
  cookie: Record<string, { value?: string }>,
  headers?: Record<string, string | undefined>
): Promise<ResolvedAuth> {
  const bearer = parseBearer(headers?.authorization);
  if (bearer) {
    try {
      const session = await findSessionByTokenHash(sha256Hex(bearer));
      if (!session) {
        log.debug("Bearer token not found or expired/revoked");
        return { user: null, agentId: null };
      }
      // Fire-and-forget usage stamps.
      touchSessionLastUsed(session.id).catch((err) =>
        log.warn({ err }, "touchSessionLastUsed failed")
      );
      if (session.agent_id) {
        touchAgentLastUsed(session.agent_id).catch((err) =>
          log.warn({ err }, "touchAgentLastUsed failed")
        );
      }
      const user = await findUserById(session.user_id);
      return { user, agentId: session.agent_id };
    } catch (err) {
      log.error({ err }, "Bearer auth resolution failed");
      return { user: null, agentId: null };
    }
  }

  const token = cookie.session?.value;
  if (!token) return { user: null, agentId: null };

  try {
    const session = await findSessionByToken(token);
    if (!session) return { user: null, agentId: null };
    const user = await findUserById(session.user_id);
    return { user, agentId: null };
  } catch (err) {
    log.error({ err }, "Cookie auth resolution failed");
    return { user: null, agentId: null };
  }
}

/**
 * Back-compat wrapper. Existing call sites that only care about the User
 * can keep using this. New code (and the scope middleware) should use
 * `resolveAuth`.
 */
export async function resolveUser(
  cookie: Record<string, { value?: string }>,
  headers?: Record<string, string | undefined>
): Promise<User | null> {
  const { user } = await resolveAuth(cookie, headers);
  return user;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/core/src/auth/session.ts
git commit -m "feat(core): resolveAuth supports Authorization Bearer"
```

---

## Task 6: Scope middleware (core)

**Files:**
- Create: `apps/core/src/auth/agent-scope.ts`

- [ ] **Step 1: Write the middleware**

Create `apps/core/src/auth/agent-scope.ts`:

```ts
import { Elysia } from "elysia";
import { resolveAuth } from "./session";

const AGENT_ALLOWED_PREFIXES = [
  "/api/snapshots",
  "/api/services",
  "/api/assets",
  "/api/catalog",
  "/api/analytics",
] as const;

/**
 * Derives `{ user, agentId }` once per request and short-circuits with 403 when
 * an agent-authenticated request targets a disallowed route. Mount this BEFORE
 * the `api` plugin in `apps/core/src/index.ts`.
 *
 * Cookie-authenticated users (agentId === null) pass through unchanged.
 */
export const agentScope = new Elysia({ name: "agent-scope" })
  .derive(async ({ cookie, request }) => {
    const headers = Object.fromEntries(request.headers.entries()) as Record<
      string,
      string | undefined
    >;
    return resolveAuth(
      cookie as Record<string, { value?: string }>,
      headers
    );
  })
  .onBeforeHandle(({ agentId, path, set }) => {
    if (agentId === null) return; // cookie session or unauthenticated
    const allowed = AGENT_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
    if (!allowed) {
      set.status = 403;
      return { error: "Agent tokens cannot access this endpoint" };
    }
  });
```

- [ ] **Step 2: Commit**

```bash
git add apps/core/src/auth/agent-scope.ts
git commit -m "feat(core): agent-scope allowlist middleware"
```

---

## Task 7: Wire `resolveAuth` + scope middleware into core routes

**Files:**
- Modify: `apps/core/src/api/snapshots.ts`
- Modify: `apps/core/src/api/services.ts`
- Modify: `apps/core/src/api/assets.ts`
- Modify: `apps/core/src/api/catalog.ts`
- Modify: `apps/core/src/api/settings.ts`
- Modify: `apps/core/src/api/notifications.ts`
- Modify: `apps/core/src/api/exchange.ts`
- Modify: `apps/core/src/api/exchange-sync.ts`
- Modify: `apps/core/src/api/admin.ts`
- Modify: `apps/core/src/api/index.ts`

- [ ] **Step 1: Update each route file's `derive` block**

For **every** file listed above (except `admin.ts` which may have a different derive layout — check first), locate the block that looks like:

```ts
.derive(async ({ cookie }) => {
  const user = await resolveUser(cookie as Record<string, { value: string }>);
  return { user };
})
```

Replace with:

```ts
.derive(async ({ cookie, request }) => {
  const headers = Object.fromEntries(request.headers.entries()) as Record<
    string,
    string | undefined
  >;
  const { user, agentId } = await resolveAuth(
    cookie as Record<string, { value?: string }>,
    headers
  );
  return { user, agentId };
})
```

And change the import at the top:

```ts
import { resolveAuth } from "../auth/session";
```

(Drop `resolveUser` from the import unless still used elsewhere in the file.)

If `admin.ts` uses a different auth shape (e.g. email allowlist), leave it alone — it stays cookie-only and never receives agent tokens (scope middleware denies first).

- [ ] **Step 2: Mount scope middleware before all routes**

Modify `apps/core/src/api/index.ts` to add the scope middleware:

```ts
import { Elysia } from "elysia";
import { agentScope } from "../auth/agent-scope";
import { servicesApi } from "./services";
import { snapshotsApi } from "./snapshots";
import { catalogApi } from "./catalog";
import { settingsApi } from "./settings";
import { exchangeApi } from "./exchange";
import { assetsApi } from "./assets";
import { notificationsApi } from "./notifications";
import { adminApi } from "./admin";
import { agentsApi } from "./agents";

export const api = new Elysia({ name: "api" })
  .use(agentScope)
  .use(servicesApi)
  .use(snapshotsApi)
  .use(catalogApi)
  .use(settingsApi)
  .use(exchangeApi)
  .use(assetsApi)
  .use(notificationsApi)
  .use(adminApi)
  .use(agentsApi);
```

Note: `agentsApi` doesn't exist yet — Task 9 creates it. Leave that `.use(agentsApi)` line as-is; this task ends with a broken build that Task 9 fixes. Alternative: comment out the line for now and uncomment in Task 9.

- [ ] **Step 3: Boot dev server, verify existing endpoints still work for cookies**

In one terminal:

```bash
cd apps/core
bun run dev
```

In another terminal, with a valid browser session cookie saved as `$SESSION_COOKIE` (grab one by logging in at `http://localhost:3000` through the normal flow and copying the `session` cookie value):

```bash
curl -s -H "Cookie: session=$SESSION_COOKIE" http://localhost:3000/api/snapshots | head -c 200
```

Expected: JSON array (empty `[]` or with rows) — NOT `{"error":"Unauthorized"}`.

- [ ] **Step 4: Commit**

```bash
git add apps/core/src/api
git commit -m "feat(core): propagate resolveAuth + mount agent scope middleware"
```

---

## Task 8: Analytics service — mirror auth + scope

**Files:**
- Create: `apps/analytics/src/auth/agent-token.ts`
- Create: `apps/analytics/src/auth/agent-scope.ts`
- Modify: `apps/analytics/src/auth/session.ts`
- Modify: `apps/analytics/src/api/analytics.ts`
- Modify: `apps/analytics/src/index.ts`

- [ ] **Step 1: Duplicate the auth helpers into analytics**

The analytics service has no dependency on core. Copy the two files verbatim from core:

```bash
cp apps/core/src/auth/agent-token.ts  apps/analytics/src/auth/agent-token.ts
cp apps/core/src/auth/agent-scope.ts  apps/analytics/src/auth/agent-scope.ts
```

(Yes, this duplicates code. Extracting to a shared `@auth` package is a future cleanup — don't do it as part of this task. Keep the duplicates identical.)

- [ ] **Step 2: Rewrite analytics session.ts**

Replace `apps/analytics/src/auth/session.ts` with the same contents as `apps/core/src/auth/session.ts` from Task 5 (logger name can stay `analytics-auth` if you prefer — swap the `createLogger("auth")` line).

- [ ] **Step 3: Update analytics routes to use resolveAuth**

Modify `apps/analytics/src/api/analytics.ts` — replace the import and derive block the same way as in Task 7 Step 1:

```ts
import { resolveAuth } from "../auth/session";

export const analyticsApi = new Elysia({ prefix: "/api/analytics" })
  .derive(async ({ cookie, request }) => {
    const headers = Object.fromEntries(request.headers.entries()) as Record<
      string,
      string | undefined
    >;
    const { user } = await resolveAuth(
      cookie as Record<string, { value?: string }>,
      headers
    );
    return { user };
  })
  // … rest unchanged
```

(Analytics doesn't need `agentId` at the route level — the scope middleware handles denial. It only needs `user`.)

- [ ] **Step 4: Mount scope middleware in analytics root**

Modify `apps/analytics/src/index.ts` — add:

```ts
import { agentScope } from "./auth/agent-scope";
// …
const app = new Elysia()
  .use(cors(/* existing */))
  .use(agentScope)
  .use(analyticsApi)
  // … rest unchanged
```

- [ ] **Step 5: Verify analytics boots**

```bash
cd apps/analytics
bun run dev
```

Expected: service starts without type errors. Curl-check with a cookie session:

```bash
curl -s -H "Cookie: session=$SESSION_COOKIE" "http://localhost:<ANALYTICS_PORT>/api/analytics/timeline" | head -c 200
```

(Look up the analytics port in `apps/analytics/src/index.ts`.)

Expected: JSON response (array or object), no 401/500.

- [ ] **Step 6: Commit**

```bash
git add apps/analytics
git commit -m "feat(analytics): bearer-token auth + scope middleware"
```

---

## Task 9: Management API — agents + tokens

**Files:**
- Create: `apps/core/src/api/agents.ts`

- [ ] **Step 1: Write the route module**

Create `apps/core/src/api/agents.ts`:

```ts
import { Elysia } from "elysia";
import {
  createAgent,
  listAgentsByUserId,
  findAgentById,
  updateAgent,
  revokeAgent,
  countActiveTokensByAgentId,
  createAgentSession,
  listTokensByAgentId,
  revokeSession,
} from "@database";
import { resolveAuth } from "../auth/session";
import {
  generateAgentToken,
  isValidExpiresIn,
  expiresAtFrom,
} from "../auth/agent-token";
import { createLogger } from "@logger";

const log = createLogger("api:agents");

export const agentsApi = new Elysia({ prefix: "/api/agents" })
  .derive(async ({ cookie, request }) => {
    const headers = Object.fromEntries(request.headers.entries()) as Record<
      string,
      string | undefined
    >;
    const { user, agentId } = await resolveAuth(
      cookie as Record<string, { value?: string }>,
      headers
    );
    return { user, agentId };
  })
  // List agents for the current user, with active-token counts.
  .get("/", async ({ user, agentId, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const agents = await listAgentsByUserId(user.id);
    const withCounts = await Promise.all(
      agents.map(async (a) => ({
        ...a,
        active_token_count: await countActiveTokensByAgentId(a.id),
      }))
    );
    return withCounts;
  })
  // Create an agent.
  .post("/", async ({ user, agentId, body, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { name, description } = (body ?? {}) as {
      name?: string;
      description?: string;
    };
    if (!name || name.trim().length === 0) {
      set.status = 400;
      return { error: "name is required" };
    }
    const agent = await createAgent({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
    });
    set.status = 201;
    return agent;
  })
  // Rename / re-describe an agent.
  .patch("/:id", async ({ user, agentId, params, body, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { name, description } = (body ?? {}) as {
      name?: string;
      description?: string | null;
    };
    const agent = await updateAgent(params.id, user.id, { name, description });
    if (!agent) {
      set.status = 404;
      return { error: "Agent not found" };
    }
    return agent;
  })
  // Soft-delete the agent (cascade-revokes its tokens).
  .delete("/:id", async ({ user, agentId, params, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const ok = await revokeAgent(params.id, user.id);
    if (!ok) {
      set.status = 404;
      return { error: "Agent not found" };
    }
    set.status = 204;
    return;
  })
  // List tokens for an agent.
  .get("/:id/tokens", async ({ user, agentId, params, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const agent = await findAgentById(params.id, user.id);
    if (!agent) {
      set.status = 404;
      return { error: "Agent not found" };
    }
    const tokens = await listTokensByAgentId(params.id);
    return tokens.map((t) => ({
      id: t.id,
      token_last4: t.token_last4,
      created_at: t.created_at,
      expires_at: t.expires_at,
      last_used_at: t.last_used_at,
      revoked_at: t.revoked_at,
    }));
  })
  // Create a new token for an agent. Returns plaintext ONCE.
  .post("/:id/tokens", async ({ user, agentId, params, body, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const agent = await findAgentById(params.id, user.id);
    if (!agent) {
      set.status = 404;
      return { error: "Agent not found" };
    }
    const { expires_in } = (body ?? {}) as { expires_in?: string };
    if (!expires_in || !isValidExpiresIn(expires_in)) {
      set.status = 400;
      return {
        error: "expires_in must be one of: 1h, 6h, 24h, 7d, 30d",
      };
    }
    const { plaintext, hash, last4 } = generateAgentToken();
    const session = await createAgentSession({
      user_id: user.id,
      agent_id: params.id,
      token_hash: hash,
      token_last4: last4,
      expires_at: expiresAtFrom(expires_in),
    });
    log.info(
      { userId: user.id, agentId: params.id, tokenId: session.id, expires_in },
      "agent token created"
    );
    set.status = 201;
    return {
      id: session.id,
      token: plaintext, // shown ONCE
      token_last4: last4,
      expires_at: session.expires_at,
    };
  })
  // Revoke a single token.
  .delete("/:id/tokens/:tokenId", async ({ user, agentId, params, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const agent = await findAgentById(params.id, user.id);
    if (!agent) {
      set.status = 404;
      return { error: "Agent not found" };
    }
    const ok = await revokeSession(params.tokenId, user.id);
    if (!ok) {
      set.status = 404;
      return { error: "Token not found" };
    }
    set.status = 204;
    return;
  });
```

- [ ] **Step 2: Confirm the agentsApi import is live in api/index.ts**

If you commented out the `.use(agentsApi)` in Task 7 Step 2, uncomment it now:

```ts
import { agentsApi } from "./agents";
// …
.use(agentsApi);
```

- [ ] **Step 3: Verify the management API end-to-end**

Boot core: `cd apps/core && bun run dev`. Then, with `$SESSION_COOKIE` set:

```bash
# Create an agent
AGENT=$(curl -s -X POST -H "Cookie: session=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test bot"}' \
  http://localhost:3000/api/agents)
echo "$AGENT"
AGENT_ID=$(echo "$AGENT" | jq -r '.id')

# Create a 1h token
TOKEN_RESP=$(curl -s -X POST -H "Cookie: session=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"expires_in":"1h"}' \
  http://localhost:3000/api/agents/$AGENT_ID/tokens)
echo "$TOKEN_RESP"
TOKEN=$(echo "$TOKEN_RESP" | jq -r '.token')

# Use the bearer token on an allowed endpoint
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/snapshots | head -c 200

# Verify it's rejected from a denied endpoint
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/settings | head -c 200

# Verify it cannot reach the agents management surface
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/agents | head -c 200
```

Expected:
- Agent creation → JSON with `id`, `name`, `created_at`.
- Token creation → JSON with `token` (starts with `oda_`), `token_last4`, `expires_at`.
- `GET /api/snapshots` with Bearer → JSON array (or empty array).
- `GET /api/settings` with Bearer → `{"error":"Agent tokens cannot access this endpoint"}` (403).
- `GET /api/agents` with Bearer → same 403.

- [ ] **Step 4: Commit**

```bash
git add apps/core/src/api
git commit -m "feat(core): /api/agents management endpoints"
```

---

## Task 10: Swagger

**Files:**
- Modify: `apps/core/package.json`
- Modify: `apps/core/src/index.ts`

- [ ] **Step 1: Add the dependency**

```bash
cd apps/core
bun add @elysiajs/swagger
```

- [ ] **Step 2: Mount Swagger in the app**

Modify `apps/core/src/index.ts`:

```ts
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import config from "@config";
import { createLogger } from "@logger";
import { auth } from "./auth";
import { api } from "./api";

const log = createLogger("core");

const app = new Elysia()
  .use(cors({
    origin: config.get("frontendUrl"),
    credentials: true,
  }))
  .use(swagger({
    path: "/api/swagger",
    documentation: {
      info: {
        title: "One Day Investor API",
        version: "1.0.0",
        description:
          "Personal investment tracker. Agents authenticate with a bearer token " +
          "obtained from the dashboard. Discovery manifest: https://odinvestor.net/agents.json",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "opaque",
          },
        },
      },
      tags: [
        { name: "Snapshots",    description: "Monthly portfolio snapshots" },
        { name: "Pockets",      description: "User-owned services / pockets" },
        { name: "Assets",       description: "Pocket assets (holdings)" },
        { name: "Catalog",      description: "Asset + service catalog search" },
        { name: "Agents",       description: "Manage agents and tokens (cookie-auth only)" },
        { name: "Settings",     description: "User settings (cookie-auth only)" },
        { name: "Notifications",description: "Notification preferences (cookie-auth only)" },
        { name: "Exchange",     description: "Exchange credentials (cookie-auth only)" },
        { name: "Admin",        description: "Admin-only (cookie-auth only)" },
      ],
    },
  }))
  .onError(({ error, code, path }) => {
    log.error({ err: error, code, path }, "Unhandled request error");
    return { error: "Internal server error" };
  })
  .use(auth)
  .use(api)
  .get("/", () => "Hello Elysia")
  .listen(3000);

log.info({ port: 3000 }, "Core service started");
```

- [ ] **Step 3: Minimal tagging on route files**

For each route file, wherever a handler is defined, add a `detail` block with the right tag. Example for `apps/core/src/api/snapshots.ts`, change:

```ts
.get("/", async ({ user, set }) => { … })
```

to:

```ts
.get("/", async ({ user, set }) => { … }, {
  detail: { tags: ["Snapshots"], summary: "List snapshots" },
})
```

Apply to every route in snapshots, services, assets, catalog, agents. Tagging settings/notifications/exchange/admin as `Cookie-auth only` tags is also recommended but not required for the happy path. Do the agent-reachable files first; the rest can be a follow-up if time is short.

- [ ] **Step 4: Verify the UI loads**

With core running, open `http://localhost:3000/api/swagger` in a browser. Expected: Swagger UI shows grouped sections (Snapshots, Pockets, Assets, …). Click "Authorize" → enter `Bearer <token>` → try the "List snapshots" endpoint.

- [ ] **Step 5: Commit**

```bash
git add apps/core/package.json apps/core/bun.lock apps/core/src
# also any root-level lockfile changes
git add ../../bun.lock 2>/dev/null || true
git commit -m "feat(core): swagger docs at /api/swagger"
```

---

## Task 11: `/agents.json` on the marketing site

**Files:**
- Modify: `apps/site/src/index.tsx`

- [ ] **Step 1: Add env-driven URLs and the route**

Modify `apps/site/src/index.tsx`. Below the existing `const BLOG_URL = …` line, add:

```ts
const CORE_URL = process.env.CORE_URL || "https://api.odinvestor.net";
const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dashboard.odinvestor.net";
```

Then, next to the `/robots.txt` route, add:

```ts
.get("/agents.json", () => {
  const manifest = {
    name: "One Day Investor",
    description:
      "Personal investment tracker. Agents can manage pockets, assets, and monthly snapshots on behalf of a user.",
    api: {
      base_url:    CORE_URL,
      openapi_url: `${CORE_URL}/api/swagger/json`,
      swagger_ui:  `${CORE_URL}/api/swagger`,
    },
    auth: {
      type:            "bearer",
      header:          "Authorization",
      format:          "Bearer <token>",
      obtain:          `User generates a token at ${DASHBOARD_URL}/agents (max 30-day expiry).`,
      expiry_options:  ["1h", "6h", "24h", "7d", "30d"],
    },
    capabilities: {
      allowed: ["pockets", "assets", "asset-catalog-search", "snapshots", "analytics"],
      denied:  ["admin", "user-settings", "notifications", "exchange-credentials"],
    },
    flow: [
      { step: 1, action: "List pockets",            method: "GET",  path: "/api/services" },
      { step: 2, action: "Create pocket",           method: "POST", path: "/api/services" },
      { step: 3, action: "Search asset catalog",    method: "GET",  path: "/api/catalog/search?q=VOO" },
      { step: 4, action: "Attach asset to pocket",  method: "POST", path: "/api/assets" },
      { step: 5, action: "Create monthly snapshot", method: "POST", path: "/api/snapshots" },
      { step: 6, action: "List snapshots",          method: "GET",  path: "/api/snapshots" },
      { step: 7, action: "Read analytics",          method: "GET",  path: "/api/analytics/timeline" },
    ],
    errors: {
      "401": "Missing, invalid, or expired token.",
      "403": "Route not permitted for agent tokens (see capabilities.denied).",
      "409": "Resource already exists (e.g. snapshot for that month).",
    },
  };
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type":  "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
})
```

- [ ] **Step 2: Verify**

```bash
cd apps/site
bun run dev
```

Then in another shell:

```bash
curl -s http://localhost:3005/agents.json | jq .name
```

Expected: `"One Day Investor"`.

- [ ] **Step 3: Commit**

```bash
git add apps/site/src/index.tsx
git commit -m "feat(site): /agents.json discovery manifest"
```

---

## Task 12: Frontend — API client + hooks

**Files:**
- Create: `apps/frontend/src/lib/agentsApi.ts`
- Create: `apps/frontend/src/hooks/useAgents.ts`

- [ ] **Step 1: Write the fetch client**

Pattern: look at an existing `lib/*Api.ts` (e.g. `apps/frontend/src/lib/analyticsApi.ts`) to match the fetch wrapper used by the project. Create `apps/frontend/src/lib/agentsApi.ts` following that pattern:

```ts
const BASE = import.meta.env.VITE_CORE_URL || "";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface AgentListItem {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  last_used_at: string | null;
  active_token_count: number;
}

export interface AgentToken {
  id: string;
  token_last4: string | null;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface CreateTokenResponse {
  id: string;
  token: string;           // shown once
  token_last4: string;
  expires_at: string;
}

export const agentsApi = {
  list: () => req<AgentListItem[]>("/api/agents"),
  create: (name: string, description?: string) =>
    req<AgentListItem>("/api/agents", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),
  rename: (id: string, name: string) =>
    req<AgentListItem>(`/api/agents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  revoke: (id: string) =>
    req<void>(`/api/agents/${id}`, { method: "DELETE" }),

  listTokens: (id: string) => req<AgentToken[]>(`/api/agents/${id}/tokens`),
  createToken: (id: string, expires_in: string) =>
    req<CreateTokenResponse>(`/api/agents/${id}/tokens`, {
      method: "POST",
      body: JSON.stringify({ expires_in }),
    }),
  revokeToken: (id: string, tokenId: string) =>
    req<void>(`/api/agents/${id}/tokens/${tokenId}`, { method: "DELETE" }),
};
```

If the existing `lib/*Api.ts` files use a shared `req` helper (e.g. from `@/lib/apiClient`), use that instead of duplicating. Read one existing `lib/*Api.ts` file before writing this one.

- [ ] **Step 2: Write the react-query hooks**

Create `apps/frontend/src/hooks/useAgents.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentsApi, type AgentListItem, type AgentToken, type CreateTokenResponse } from "@/lib/agentsApi";

const LIST_KEY = ["agents"] as const;
const tokensKey = (id: string) => ["agents", id, "tokens"] as const;

export function useAgents() {
  return useQuery<AgentListItem[]>({
    queryKey: LIST_KEY,
    queryFn:  agentsApi.list,
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      agentsApi.create(name, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useRevokeAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentsApi.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useAgentTokens(id: string) {
  return useQuery<AgentToken[]>({
    queryKey: tokensKey(id),
    queryFn:  () => agentsApi.listTokens(id),
    enabled:  !!id,
  });
}

export function useCreateAgentToken(id: string) {
  const qc = useQueryClient();
  return useMutation<CreateTokenResponse, Error, string>({
    mutationFn: (expires_in) => agentsApi.createToken(id, expires_in),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tokensKey(id) });
      qc.invalidateQueries({ queryKey: LIST_KEY }); // refresh token counts
    },
  });
}

export function useRevokeAgentToken(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) => agentsApi.revokeToken(id, tokenId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tokensKey(id) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/lib/agentsApi.ts apps/frontend/src/hooks/useAgents.ts
git commit -m "feat(frontend): agents API client + hooks"
```

---

## Task 13: Frontend — AgentsPage

**Files:**
- Create: `apps/frontend/src/pages/AgentsPage.tsx`

- [ ] **Step 1: Write the page**

Create `apps/frontend/src/pages/AgentsPage.tsx`. Match existing page visuals (read `apps/frontend/src/pages/ProfilePage.tsx` for reference — same header, muted-text subtitle, card sections):

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAgents,
  useCreateAgent,
  useRevokeAgent,
  useAgentTokens,
  useCreateAgentToken,
  useRevokeAgentToken,
} from "@/hooks/useAgents";
import type { CreateTokenResponse } from "@/lib/agentsApi";
import { cn } from "@/lib/utils";

const EXPIRY_OPTIONS = ["1h", "6h", "24h", "7d", "30d"] as const;
type Expiry = (typeof EXPIRY_OPTIONS)[number];

export function AgentsPage() {
  const { t } = useTranslation();
  const { data: agents = [], isLoading } = useAgents();
  const createAgent = useCreateAgent();
  const revokeAgent = useRevokeAgent();

  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [freshToken, setFreshToken] = useState<CreateTokenResponse | null>(null);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createAgent.mutateAsync({ name });
    setNewName("");
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">{t("agents.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("agents.subtitle")}{" "}
        <a
          className="underline"
          href="https://odinvestor.net/agents.json"
          target="_blank"
          rel="noreferrer"
        >
          agents.json
        </a>
      </p>

      {/* Create agent */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t("agents.namePlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <Button onClick={handleCreate} disabled={createAgent.isPending}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t("agents.createAgent")}
          </Button>
        </div>
      </section>

      {/* Token-shown-once banner */}
      {freshToken && (
        <section className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-5">
          <div className="text-sm font-semibold">{t("agents.tokenCreated")}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t("agents.tokenOnceWarning")}
          </div>
          <div className="mt-3 flex gap-2">
            <code className="flex-1 rounded-md bg-background border border-border px-3 py-2 font-mono text-xs break-all">
              {freshToken.token}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(freshToken.token)}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t("agents.copy")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setFreshToken(null)}>
              {t("common.close")}
            </Button>
          </div>
        </section>
      )}

      {/* Agents list */}
      <section className="mt-6 space-y-3">
        {isLoading && (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        )}
        {!isLoading && agents.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            {t("agents.empty")}
          </div>
        )}
        {agents.map((a) => (
          <article key={a.id} className="rounded-xl border border-border bg-card p-5">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{a.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("agents.tokensCount", { count: a.active_token_count })} ·{" "}
                  {a.last_used_at
                    ? t("agents.lastUsed", {
                        when: new Date(a.last_used_at).toLocaleString(),
                      })
                    : t("agents.neverUsed")}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setExpandedId(expandedId === a.id ? null : a.id)
                  }
                >
                  {expandedId === a.id ? t("common.close") : t("agents.manageTokens")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(t("agents.confirmRevoke"))) {
                      revokeAgent.mutate(a.id);
                      if (expandedId === a.id) setExpandedId(null);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </header>
            {expandedId === a.id && (
              <AgentTokens
                agentId={a.id}
                onTokenCreated={setFreshToken}
              />
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

function AgentTokens({
  agentId,
  onTokenCreated,
}: {
  agentId: string;
  onTokenCreated: (t: CreateTokenResponse) => void;
}) {
  const { t } = useTranslation();
  const { data: tokens = [], isLoading } = useAgentTokens(agentId);
  const createToken = useCreateAgentToken(agentId);
  const revokeToken = useRevokeAgentToken(agentId);
  const [expiry, setExpiry] = useState<Expiry>("24h");

  const handleCreate = async () => {
    const resp = await createToken.mutateAsync(expiry);
    onTokenCreated(resp);
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground">{t("agents.expiresIn")}:</label>
        <select
          value={expiry}
          onChange={(e) => setExpiry(e.target.value as Expiry)}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
        >
          {EXPIRY_OPTIONS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <Button size="sm" onClick={handleCreate} disabled={createToken.isPending}>
          {t("agents.createToken")}
        </Button>
      </div>

      <ul className="mt-4 space-y-2">
        {isLoading && (
          <li className="text-xs text-muted-foreground">{t("common.loading")}</li>
        )}
        {tokens.map((tok) => {
          const expired = new Date(tok.expires_at) < new Date();
          const status = tok.revoked_at
            ? t("agents.statusRevoked")
            : expired
              ? t("agents.statusExpired")
              : t("agents.statusActive");
          return (
            <li
              key={tok.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2",
                (tok.revoked_at || expired) && "opacity-60"
              )}
            >
              <div className="min-w-0 text-xs">
                <div className="font-mono">…{tok.token_last4}</div>
                <div className="text-muted-foreground">
                  {status} · {t("agents.expiresAt", {
                    when: new Date(tok.expires_at).toLocaleString(),
                  })}
                </div>
              </div>
              {!tok.revoked_at && !expired && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => revokeToken.mutate(tok.id)}
                >
                  {t("agents.revokeToken")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/pages/AgentsPage.tsx
git commit -m "feat(frontend): AgentsPage"
```

---

## Task 14: Frontend — routing, menu, i18n

**Files:**
- Modify: `apps/frontend/src/main.tsx`
- Modify: `apps/frontend/src/components/Sidebar.tsx`
- Modify: `apps/frontend/src/components/AppLayout.tsx`
- Modify: `apps/frontend/src/locales/en.json`
- Modify: `apps/frontend/src/locales/ru.json`
- Modify: `apps/frontend/src/locales/es.json`

- [ ] **Step 1: Register the route**

In `apps/frontend/src/main.tsx`, add the import:

```ts
import { AgentsPage } from "./pages/AgentsPage";
```

Inside the `AppLayout` children array (next to `/profile`), add:

```ts
{ path: "/agents", element: <AgentsPage /> },
```

- [ ] **Step 2: Add a sidebar link**

Open `apps/frontend/src/components/Sidebar.tsx`. Find the `nav` array (matches pattern from existing `nav.analytics` entry). Add a new entry — use `Bot` from `lucide-react`:

```tsx
import { BarChart3, Bot, /* …existing imports */ } from "lucide-react";

const nav = [
  // … existing entries
  { labelKey: "nav.agents", icon: Bot, path: "/agents" },
];
```

Also add the matching entry in `apps/frontend/src/components/AppLayout.tsx` if it has its own nav array (verify by reading the file first).

- [ ] **Step 3: Add i18n keys**

In `apps/frontend/src/locales/en.json`, add to `nav`:

```json
"agents": "Agents",
```

and a new top-level `agents` block:

```json
"agents": {
  "title": "Agents",
  "subtitle": "Manage tokens for bots and automations that drive your portfolio. Read the public spec:",
  "namePlaceholder": "Agent name (e.g. My trading bot)",
  "createAgent": "Create agent",
  "empty": "No agents yet. Create one above.",
  "manageTokens": "Manage tokens",
  "tokensCount_one": "{{count}} active token",
  "tokensCount_other": "{{count}} active tokens",
  "lastUsed": "Last used {{when}}",
  "neverUsed": "Never used",
  "confirmRevoke": "Revoke this agent and all its tokens?",
  "expiresIn": "Expires in",
  "createToken": "Create token",
  "revokeToken": "Revoke",
  "tokenCreated": "Token created",
  "tokenOnceWarning": "Copy this token now — it won't be shown again.",
  "copy": "Copy",
  "expiresAt": "Expires {{when}}",
  "statusActive": "Active",
  "statusExpired": "Expired",
  "statusRevoked": "Revoked"
}
```

Replicate in `ru.json` and `es.json` with translated strings. For languages you don't speak, use English placeholder values — user will correct during review.

- [ ] **Step 4: Type-check + boot**

```bash
cd apps/frontend
bun run dev
```

Open `http://localhost:<vite-port>`, sign in, click Agents in the sidebar, create an agent, create a token, copy it, try revoke.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src
git commit -m "feat(frontend): /agents route, sidebar link, i18n"
```

---

## Task 15: End-to-end agent happy-path verification

**Files:** (no code changes; this is an integration test script you run manually)

- [ ] **Step 1: Write the verification script**

Create an untracked script `/tmp/verify-agent-flow.sh` (don't commit it):

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${SESSION_COOKIE:?export SESSION_COOKIE first}"
CORE="${CORE:-http://localhost:3000}"

echo "== Create agent =="
AGENT=$(curl -s -X POST -H "Cookie: session=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name":"E2E test bot"}' "$CORE/api/agents")
AGENT_ID=$(echo "$AGENT" | jq -r '.id')
echo "agent_id=$AGENT_ID"

echo "== Create 24h token =="
TOKEN=$(curl -s -X POST -H "Cookie: session=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"expires_in":"24h"}' "$CORE/api/agents/$AGENT_ID/tokens" | jq -r '.token')
echo "token prefix=${TOKEN:0:8}…"

AUTH=(-H "Authorization: Bearer $TOKEN")

echo "== List pockets =="
curl -s "${AUTH[@]}" "$CORE/api/services" | jq 'length'

echo "== Create a pocket =="
POCKET=$(curl -s -X POST "${AUTH[@]}" -H "Content-Type: application/json" \
  -d '{"name":"Agent-created pocket","parent_id":null}' "$CORE/api/services")
echo "$POCKET" | jq .id

echo "== Search catalog =="
curl -s "${AUTH[@]}" "$CORE/api/catalog/search?q=VOO" | jq 'length'

echo "== Scope denial: /api/settings =="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${AUTH[@]}" "$CORE/api/settings")
[ "$STATUS" = "403" ] && echo "OK 403" || { echo "FAIL: got $STATUS"; exit 1; }

echo "== Scope denial: /api/admin/… =="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${AUTH[@]}" "$CORE/api/admin/blog")
[ "$STATUS" = "403" ] && echo "OK 403" || { echo "FAIL: got $STATUS"; exit 1; }

echo "== Revoke token =="
# Pull the token id first
TOKEN_ID=$(curl -s -H "Cookie: session=$SESSION_COOKIE" \
  "$CORE/api/agents/$AGENT_ID/tokens" | jq -r '.[0].id')
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE -H "Cookie: session=$SESSION_COOKIE" \
  "$CORE/api/agents/$AGENT_ID/tokens/$TOKEN_ID"

echo "== Confirm revoked token is 401 =="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${AUTH[@]}" "$CORE/api/snapshots")
[ "$STATUS" = "401" ] && echo "OK 401 after revoke" || { echo "FAIL: got $STATUS"; exit 1; }

echo
echo "ALL CHECKS PASSED"
```

- [ ] **Step 2: Run it**

```bash
chmod +x /tmp/verify-agent-flow.sh
export SESSION_COOKIE="<paste your dashboard session cookie>"
/tmp/verify-agent-flow.sh
```

Expected: final line `ALL CHECKS PASSED`. Any `FAIL:` line means the scope middleware or revocation logic has a bug — fix and rerun before considering Task 15 done.

- [ ] **Step 3: No commit needed for the script itself.**

---

## Self-review checklist (run after writing the plan)

- [x] **Spec coverage:** Bearer auth (Task 5), scope middleware (Task 6), agents table (Task 1), sessions extension (Task 1), token utilities (Task 4), management endpoints (Task 9), analytics mirror (Task 8), Swagger (Task 10), `/agents.json` (Task 11), frontend UI (Tasks 12–14), end-to-end verification (Task 15).
- [x] **Open spec items:** Frontend menu component identified during Task 14 (`Sidebar.tsx` + possibly `AppLayout.tsx`); analytics prefix confirmed as `/api/analytics/*` and included in the allowlist; host-name placeholders in `/agents.json` resolved at runtime via env.
- [x] **No placeholders:** All SQL, TS, and curl commands are complete. i18n stubs in ru/es are explicitly flagged for user correction rather than silent TODOs.
- [x] **Type consistency:** `Session` updated once (Task 1) and used consistently across modules. `ResolvedAuth` returned from `resolveAuth` matches what the scope middleware and every route file expects.
- [x] **Function names stable:** `createAgent`, `revokeAgent`, `findAgentById`, `createAgentSession`, `findSessionByTokenHash`, `touchSessionLastUsed`, `touchAgentLastUsed`, `revokeSession` — all introduced in Tasks 2–3 and referenced verbatim in later tasks.

---

## Rollout notes

1. Ship backend (Tasks 1–11) first. No user-visible change yet — management endpoints exist but no UI.
2. Ship frontend (Tasks 12–14). UI appears; users can start creating tokens.
3. Announce on blog / marketing site with a link to `https://odinvestor.net/agents.json`.

No feature flag needed: the new surfaces are additive, and everything outside the allowlist is denied by default for agent tokens.
