# Agents API — Design Spec

**Date:** 2026-04-22
**Status:** Approved for planning
**Author:** brainstorming session

## Summary

Let third-party agents (LLM agents, automation scripts, bots) drive the One Day Investor service end-to-end without the web UI. Users generate short-lived bearer tokens from an authenticated dashboard page. Agents call the existing `/api/*` endpoints using those tokens. Public OpenAPI documentation and a machine-readable discovery manifest are served so agents can bootstrap without human-authored integration code.

## Goals

- Users can create named agents and issue short-lived bearer tokens (1h / 6h / 24h / 7d / 30d).
- Agents can complete the full investor flow — create pockets, attach assets, search the asset catalog, create monthly snapshots, read analytics — via API alone.
- Service self-describes via `/api/swagger` (on core) and `/agents.json` (on the marketing site) so an agent given only the marketing URL can discover how to operate.
- No changes required to the shapes of existing `/api/*` endpoints.

## Non-goals

- Per-token permission scopes (all agent tokens get the same capability set).
- OAuth 2.0 client credentials / refresh flows. Tokens are opaque, non-renewable; user re-issues when expired.
- Agent marketplace / discovery of third-party agents.
- Rate limiting (out of scope for v1; Nginx upstream limits still apply).
- Webhooks or event streams to agents.

## Decisions

1. **Auth path:** Reuse existing endpoints. Agent tokens are read from `Authorization: Bearer <token>` and resolved to the same `User` that cookie sessions produce. No duplicate `/api/agent/*` namespace.
2. **Data model:** New `agents` table (user-owned, with `revoked_at`). Tokens live in the existing `sessions` table with a nullable `agent_id` FK and a new `token_hash` column (SHA-256).
3. **Scope:** Agent tokens are restricted to the investor flow — `/api/snapshots`, `/api/services`, `/api/assets`, `/api/catalog`, `/api/analytics`. Admin, user settings, notifications, exchange credentials, and `/api/agents` (management) are **denied** (HTTP 403).
4. **Discovery surface:** Swagger UI + JSON at `/api/swagger` on core (public). `/agents.json` machine-readable manifest at the marketing site root (public).
5. **Token expiry:** Fixed enum — `1h`, `6h`, `24h`, `7d`, `30d`. Max 30 days. Server-authoritative.
6. **Token display:** Shown once (plaintext, prefix `oda_`) in the create response. Stored as SHA-256 hash. List views show only a 4-char fingerprint.
7. **Management UI:** New `/agents` page in `apps/frontend` (dashboard), authenticated via cookie. Users create agents, issue tokens, revoke.

## Architecture

```
Agent  ──Authorization: Bearer oda_…──►  core (Elysia)
                                          │
                                          ├─ resolveUser(cookie, headers)
                                          │    Bearer → hash → session → user
                                          │    fallback: cookie path (unchanged)
                                          │
                                          ├─ agentScope middleware
                                          │    if session.agent_id && !allowed(path) → 403
                                          │
                                          ├─ existing routes unchanged:
                                          │    /api/snapshots   /api/services
                                          │    /api/assets      /api/catalog
                                          │    /api/analytics
                                          │
                                          ├─ NEW /api/agents (cookie-authed)
                                          │    CRUD agents + tokens
                                          │
                                          └─ /api/swagger, /api/swagger/json (public)

apps/site (odinvestor.net)
  └─ GET /agents.json  (public, machine-readable discovery manifest)

apps/frontend (dashboard.odinvestor.net)
  └─ /agents page: manage agents, create/revoke tokens
```

No new process. No new package. One DB migration. One @elysiajs/swagger dependency added to core.

## Data model

### New table: `agents`

```sql
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
```

### Altered table: `sessions`

```sql
ALTER TABLE sessions ADD COLUMN agent_id     uuid        REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN token_hash   text;
ALTER TABLE sessions ADD COLUMN token_last4  text;
ALTER TABLE sessions ADD COLUMN last_used_at timestamptz;
ALTER TABLE sessions ADD COLUMN revoked_at   timestamptz;

CREATE INDEX sessions_agent_id_idx          ON sessions (agent_id)   WHERE agent_id IS NOT NULL;
CREATE UNIQUE INDEX sessions_token_hash_key ON sessions (token_hash) WHERE token_hash IS NOT NULL;
```

Migration file: `packages/database/migrations/<timestamp>_add-agents-table.sql`.

### Token format

- Plaintext: `oda_` + 32 random bytes (from `crypto.randomBytes(32)`) base64url-encoded → approx 47 chars.
- DB stores `token_hash = sha256_hex(plaintext)`. Plaintext never written to disk, logs, or metrics.
- Fingerprint for UI: last 4 chars of the plaintext, stored in `sessions.token_last4` so list views can render without needing the plaintext.

## API surface

### Management endpoints (cookie auth only; blocked for agent tokens)

```
GET    /api/agents                      → list non-revoked agents (name, description, created_at, last_used_at, token_count)
POST   /api/agents                      body: { name: string, description?: string }
                                        → 201 { id, name, description, created_at }
PATCH  /api/agents/:id                  body: { name?: string, description?: string }
                                        → 200 agent
DELETE /api/agents/:id                  soft-delete (revoked_at = now()); cascade-revoke tokens
                                        → 204

GET    /api/agents/:id/tokens           → list tokens (id, token_last4, created_at, expires_at, last_used_at, revoked_at)
POST   /api/agents/:id/tokens           body: { expires_in: "1h" | "6h" | "24h" | "7d" | "30d" }
                                        → 201 { id, token, token_last4, expires_at }  ← token plaintext only here
DELETE /api/agents/:id/tokens/:tokenId  soft-revoke (sessions.revoked_at = now())
                                        → 204
```

Server maps `expires_in` → duration:
- `1h`  → 60 min
- `6h`  → 6 h
- `24h` → 24 h
- `7d`  → 7 d
- `30d` → 30 d

### Existing endpoints — accessible by agent tokens (allowlist)

- `/api/snapshots/**`
- `/api/services/**`    (pockets)
- `/api/assets/**`
- `/api/catalog/**`     (search)
- `/api/analytics/**`   (when/if it lives under this prefix — verify during planning)

### Existing endpoints — denied to agent tokens

- `/api/admin/**`
- `/api/settings/**`
- `/api/notifications/**`
- `/api/exchange/**`
- `/api/exchange-sync/**`
- `/api/agents/**`  (management; only the cookie-authed user can manage their own agents)

Scope enforcement: single `onBeforeHandle` plugin mounted before `api` that inspects `agentId` from the derive context and the request `path`.

## Auth flow changes

`apps/core/src/auth/session.ts`:

```ts
export async function resolveAuth(
  cookie: Record<string, { value?: string }>,
  headers?: Record<string, string | undefined>
): Promise<{ user: User | null; agentId: string | null }> {
  const bearer = parseBearer(headers?.authorization);
  if (bearer) {
    const session = await findSessionByTokenHash(sha256Hex(bearer));
    // findSessionByTokenHash returns only if expires_at > now() AND revoked_at IS NULL
    if (!session) return { user: null, agentId: null };
    touchSessionLastUsed(session.id).catch(() => {}); // fire-and-forget
    if (session.agent_id) touchAgentLastUsed(session.agent_id).catch(() => {});
    const user = await findUserById(session.user_id);
    return { user, agentId: session.agent_id };
  }

  // existing cookie path unchanged
  const token = cookie.session?.value;
  if (!token) return { user: null, agentId: null };
  const session = await findSessionByToken(token);
  if (!session) return { user: null, agentId: null };
  const user = await findUserById(session.user_id);
  return { user, agentId: null };
}
```

Existing helper `resolveUser` becomes a thin wrapper that returns `result.user` for call sites that don't care about `agentId`. The scope middleware reads the full result.

Every `/api/*` route file that currently calls `resolveUser(cookie)` is updated to call `resolveAuth(cookie, request.headers)` — mechanical change.

## Swagger + `/agents.json`

### `@elysiajs/swagger` on core

- Add `@elysiajs/swagger` dependency in `apps/core/package.json`.
- Mount at `/api/swagger` (UI) and `/api/swagger/json` (spec), public.
- Define `securitySchemes.bearerAuth` (HTTP bearer, scheme `bearer`, bearer format `opaque`).
- Tag existing routes per domain (Snapshots, Pockets, Assets, Catalog, Analytics, Agents) by adding `detail: { tags, summary, description }` to each `.get/.post/...` call. This is a focused edit across existing route files — not a rewrite.
- Admin/settings/notifications/exchange routes are tagged `Cookie-only` and documented as such.

### `/agents.json` on apps/site

New route in `apps/site/src/index.tsx`, content-type `application/json`, `Cache-Control: public, max-age=300`:

```json
{
  "name": "One Day Investor",
  "description": "Personal investment tracker. Agents can manage pockets, assets, and monthly snapshots on behalf of a user.",
  "api": {
    "base_url": "<CORE_URL>",
    "openapi_url": "<CORE_URL>/api/swagger/json",
    "swagger_ui": "<CORE_URL>/api/swagger"
  },
  "auth": {
    "type": "bearer",
    "header": "Authorization",
    "format": "Bearer <token>",
    "obtain": "User generates a token at <DASHBOARD_URL>/agents (max 30-day expiry).",
    "expiry_options": ["1h", "6h", "24h", "7d", "30d"]
  },
  "capabilities": {
    "allowed":  ["pockets", "assets", "asset-catalog-search", "snapshots", "analytics"],
    "denied":   ["admin", "user-settings", "notifications", "exchange-credentials"]
  },
  "flow": [
    { "step": 1, "action": "List pockets",            "method": "GET",  "path": "/api/services" },
    { "step": 2, "action": "Create pocket",           "method": "POST", "path": "/api/services" },
    { "step": 3, "action": "Search asset catalog",    "method": "GET",  "path": "/api/catalog/search?q=VOO" },
    { "step": 4, "action": "Attach asset to pocket",  "method": "POST", "path": "/api/assets" },
    { "step": 5, "action": "Create monthly snapshot", "method": "POST", "path": "/api/snapshots" },
    { "step": 6, "action": "List snapshots",          "method": "GET",  "path": "/api/snapshots" },
    { "step": 7, "action": "Read analytics",          "method": "GET",  "path": "/api/analytics" }
  ],
  "errors": {
    "401": "Missing, invalid, or expired token.",
    "403": "Route not permitted for agent tokens (see capabilities.denied).",
    "409": "Resource already exists (e.g. snapshot for that month)."
  }
}
```

`<CORE_URL>` and `<DASHBOARD_URL>` are resolved from env (`CORE_URL`, `DASHBOARD_URL`) at request time, falling back to production hosts. Add these to `apps/site/src/index.tsx` alongside the existing `SITE_URL` / `BLOG_URL` lookups.

## Frontend `/agents` page (apps/frontend)

- File: `apps/frontend/src/pages/AgentsPage.tsx`.
- Route registered in `main.tsx`.
- Menu link added to the Profile menu (verify exact component during planning).
- i18n strings in `apps/frontend/src/locales/{en,es}/agents.json` — distinct from the public `/agents.json` manifest on the marketing site.
- Uses existing `@ui` primitives and fetch utilities; no new frontend dependencies.

**Structure:**

1. Header + "Create agent" button.
2. Empty state with link to the public `/agents.json` docs.
3. Agent list: each row shows name, description, created, last-used, token count, and Revoke/Rename actions. Click to expand.
4. Expanded view (inline): tokens list + "Create token" form (expiry dropdown).
5. On token creation: full token rendered once in a dismissable callout (copy button, monospace, large). Callout cannot be reopened.

## Security considerations

- **Hashed at rest.** Plaintext tokens are never stored.
- **Scope restriction.** Agent tokens cannot touch admin, settings, notifications, exchange credentials, or the agent-management API itself. Enforced by a single middleware — reviewable in one place.
- **Short-lived.** 30-day cap. No renewal; users re-issue.
- **Revocable.** Soft-delete on agent → cascade-revoke tokens (by setting `sessions.revoked_at = now()` for all tokens owned by that agent). Per-token revoke supported.
- **No cookies on API responses.** Bearer-authed requests set no `Set-Cookie` headers, so agents don't accidentally become logged-in browser sessions.
- **CORS.** Swagger UI loads from core origin; no new cross-origin surface added.
- **Logging.** Token `last4` fingerprint is logged on auth events; plaintext and hash are not.

## Testing

- Integration: one happy-path test that creates agent → issues token → hits the full flow (create pocket → attach asset → create snapshot → read analytics) as an agent, then verifies 403 on admin/settings/notifications.
- Integration: revocation — token immediately stops working after `DELETE /api/agents/:id/tokens/:tokenId`.
- Integration: expiry — set a 1-second synthetic expiry in a test-only helper, confirm 401 after expiry.
- Unit: `resolveAuth` — cookie-only, Bearer-only, both (Bearer wins), neither, invalid Bearer.
- Unit: scope middleware allow/deny for each prefix.

## Open items to resolve during planning

- Exact production hostnames for core and dashboard (used in `agents.json`).
- Whether `/api/analytics` is the actual mount prefix or lives elsewhere — confirm against current route wiring.
- Menu component name in the frontend that should host the "Agents" link.
- Whether cookie sessions should also migrate to `token_hash` storage in a follow-up (out of scope here).

## Rollout

1. Merge migration + backend changes (Swagger public, agents.json public, `/api/agents` endpoints). Existing UI unaffected.
2. Merge frontend AgentsPage.
3. Announce on marketing site (link to `/agents.json`).

No feature flag needed — the new surfaces are additive and denied-by-default for agent tokens on everything outside the allowlist.
