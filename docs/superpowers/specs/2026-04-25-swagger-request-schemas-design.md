# Swagger Request Schemas for Core + Market

**Date:** 2026-04-25
**Scope:** `apps/core` and `apps/market` Elysia route definitions
**Type:** Documentation / API contract

## Problem

Both `apps/core` and `apps/market` already mount `@elysiajs/swagger` at `/api/swagger` with tags and a `bearerAuth` security scheme. But **no route currently declares Elysia/TypeBox schemas** (`body`, `query`, `params`, `response`, or `detail`). Swagger UI lists endpoints by path/method only — agents and other clients have no documented input contract.

This matters because the core surface is consumed by AI agents (per `agents.json`) that need a typed contract to call routes safely.

## Goal

Every route in `apps/core/src/api/*.ts` and `apps/market/src/api/*.ts` declares `body`/`query`/`params` schemas where applicable, plus `detail` (tag, summary, security). Swagger UI then renders a complete request contract for ~55 endpoints.

## Non-goals

- **No `response` schemas.** Out of scope for this round. Adding them risks 422-ing on any handler whose actual return shape doesn't match exactly. We accept the verification gap that Swagger output isn't automatically checked against runtime responses.
- **No auth refactor.** The existing `if (!user) { 401 }` inline checks stay. They're orthogonal to schema work.
- **No promotion of schemas to `@types`.** Request shapes drift from DB row shapes; coupling all apps to one app's API surface is a tax we're not paying.
- **No new endpoints, no removed endpoints, no behavior changes.** Pure metadata + input validation.
- **Empty/aggregator files untouched.** `apps/core/src/api/exchange-sync.ts` (currently 0 routes) and the `index.ts` aggregators have nothing to schema.

## Conventions

### Per-route shape

```ts
.post(
  "/",
  async (ctx) => { /* handler unchanged */ },
  {
    body: t.Object({ /* fields */ }, { additionalProperties: true }),
    detail: {
      tags: ["Snapshots"],
      summary: "Create a snapshot",
      security: [{ bearerAuth: [] }],   // omit for cookie-only routes
    },
  },
)
```

### Schema construction rules

- **Object bodies:** `t.Object({ ... }, { additionalProperties: true })`. Lax on purpose so existing callers that send extra fields don't 422.
- **Numeric fields that may arrive as strings** (form-encoded prices/quantities, query params): `t.Numeric()` — Elysia coerces string-or-number.
- **Pure numbers known to be JSON numbers** (already JSON-encoded from frontend): `t.Number()`.
- **IDs:** `t.String()` (UUIDs cross the wire as strings; we don't validate UUID format here).
- **Optionality:** `t.Optional(...)` liberally. If the handler treats a field as nullable, mark it optional.
- **Path params:** add `params: t.Object({ id: t.String() })` even though Elysia infers them from `/:id`. Redundant at runtime, but Swagger's "Parameters" panel renders cleaner with the explicit declaration.
- **Query strings:** `t.Object({ ... }, { additionalProperties: true })` only when the handler actually reads `query`. Skip otherwise.

### `detail` rules

- **`tags`:** array of strings matching tags declared in the app's `swagger({...documentation.tags})` block. Both apps already declare those tag names; we reuse them verbatim. Always an array, even with one tag (`tags: ["Snapshots"]`) — this is the OpenAPI 3 operation-object convention that Elysia's `detail` passes through.
- **`summary`:** one short imperative line (~5–8 words). E.g. "Create a snapshot", "List user pockets".
- **`description`:** optional. Add only when the route has non-obvious behavior worth explaining (e.g., the snapshot duplicate-detection logic).
- **`security`:**
  - `[{ bearerAuth: [] }]` for routes that resolve auth via the request's `Authorization` header (most agent-facing routes).
  - **Omit** for cookie-only routes — admin, settings, exchange credentials, and any route whose tag description in the app's swagger config says "cookie-auth only".

### Shared TypeBox schemas — per-app, not cross-app

Create:

- `apps/core/src/api/schemas.ts`
- `apps/market/src/api/schemas.ts`

Each exports the TypeBox shapes that recur in that app — e.g., `SnapshotEntry` (used by snapshots.ts), `PocketAssetCreate` (used by pocket-assets.ts). Routes import from there.

Why per-app and not the shared `@types` package: the `@types` package documents *DB row* shapes, which are strict. Request bodies are deliberately lax (`additionalProperties: true`, `t.Optional()` liberally, `t.Numeric()` for coerced fields). Promoting these to `@types` would either pollute the strict types or fork them — both worse than per-app schema modules.

### Removing redundant casts

Where a handler currently has `const { x } = body as { x: ... }` *and* the body shape becomes Elysia-typed via the new schema, drop the cast. Don't otherwise refactor handler internals.

### Auth header `detail` for `bearerAuth`

The `bearerAuth` scheme already exists in both apps' `swagger({...components.securitySchemes})` blocks. Adding `detail.security: [{ bearerAuth: [] }]` to a route makes Swagger UI render a "Try it out" Authorize prompt for that route. This is metadata only — it does not enforce authentication. The existing `resolveAuth(...)` calls in `.derive(...)` continue to enforce.

## Concrete before/after

Take `POST /api/snapshots/` from `apps/core/src/api/snapshots.ts:66` as a representative case.

**Before:**

```ts
.post("/", async ({ user, set, body }) => {
  if (!user) {
    set.status = 401;
    return { error: "Unauthorized" };
  }
  const { month, entries } = body as {
    month: string;
    entries: SnapshotEntryInput[];
  };
  if (!month || !entries) {
    set.status = 400;
    return { error: "month and entries are required" };
  }
  // …unchanged…
})
```

**After:**

```ts
import { t } from "elysia";
import { SnapshotEntry } from "./schemas";

// …

.post(
  "/",
  async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { month, entries } = body;            // cast removed
    if (!month || !entries) {
      set.status = 400;
      return { error: "month and entries are required" };
    }
    // …unchanged…
  },
  {
    body: t.Object(
      {
        month: t.String(),
        entries: t.Array(SnapshotEntry),
      },
      { additionalProperties: true },
    ),
    detail: {
      tags: ["Snapshots"],
      summary: "Create a snapshot for a month",
      security: [{ bearerAuth: [] }],
    },
  },
)
```

`SnapshotEntry` lives in `apps/core/src/api/schemas.ts`:

```ts
import { t } from "elysia";

export const SnapshotEntry = t.Object(
  {
    service_id: t.String(),
    amount: t.Numeric(),
    pocket_asset_id: t.Optional(t.Union([t.String(), t.Null()])),
    quantity: t.Optional(t.Union([t.Numeric(), t.Null()])),
    price: t.Optional(t.Union([t.Numeric(), t.Null()])),
  },
  { additionalProperties: true },
);
```

## Files affected

**Core (`apps/core/src/api/`)** — files with routes:

- `snapshots.ts` (~6 routes)
- `services.ts` (~6 routes — pockets/services)
- `assets.ts` (~2 routes)
- `catalog.ts` (~2 routes)
- `agents.ts` (~7 routes)
- `settings.ts` (~2 routes — cookie-auth)
- `notifications.ts` (~2 routes)
- `exchange.ts` (~3 routes — cookie-auth)
- `admin.ts` (~12 routes — cookie-auth)
- new: `schemas.ts`

Untouched: `exchange-sync.ts`, `index.ts`.

**Market (`apps/market/src/api/`)** — files with routes:

- `asset-catalog.ts`
- `search-assets.ts`
- `pocket-assets.ts`
- `market.ts`
- new: `schemas.ts`

Untouched: `index.ts`.

## Testing & verification

Per file, after edits:

1. **Compile:** the app must still build (`bun run --watch src/index.ts` does not produce TypeScript errors on startup).
2. **Boot:** the app starts and listens on its port (3000 for core, 3002 for market).
3. **Swagger renders without errors:** `curl http://localhost:<port>/api/swagger/json` returns valid JSON; `curl http://localhost:<port>/api/swagger` returns the UI HTML. We don't deep-validate the OpenAPI shape; we just confirm the docs endpoint doesn't throw.
4. **Smoke a representative route:** for at least one route in each modified file, send a request with `curl` and confirm the response is a non-error and matches what the route returned before.

After all files are done:

5. **Manual /api/swagger walkthrough:** load `http://localhost:3000/api/swagger` and `http://localhost:3002/api/swagger` in the browser; visually confirm every tag has its routes, every route has a documented body/params/query (where applicable), and bearer-auth routes show the Authorize affordance.

## Risks & trade-offs

- **Lax-but-still-strict-enough-to-422:** even with `additionalProperties: true`, a *typed* mismatch (e.g., `t.Number()` where the caller sends `"100"`) will 422. Mitigation: prefer `t.Numeric()` anywhere a numeric value crosses an HTML form or query string. We'll explicitly note any field where this is a judgment call in the plan.
- **No response-shape gate:** Swagger's documented response shapes are absent, so a future handler refactor that changes a return shape goes undocumented. Tradeoff accepted; can be revisited as a follow-up.
- **Cookie-auth routes unmarked in Swagger:** without `security` on them, Swagger doesn't render an Authorize affordance. That's correct — they're not bearer-callable. They still appear in the UI under their tag.
- **No automated test coverage added.** This codebase's apps don't have a test runner (no `test` script in `package.json`). Verification is the manual smoke and Swagger walkthrough above.

## Decomposition for the plan

The plan derived from this spec uses one task per file, plus prep + verification:

1. Create `apps/core/src/api/schemas.ts` with the recurring shapes used downstream
2. Add schemas + detail to `apps/core/src/api/snapshots.ts`
3. … one task per remaining core file …
4. Create `apps/market/src/api/schemas.ts`
5. … one task per market file …
6. Final: boot both apps, hit `/api/swagger/json` for each, smoke one representative route per file.

Each task produces one commit. ~16 commits total.
