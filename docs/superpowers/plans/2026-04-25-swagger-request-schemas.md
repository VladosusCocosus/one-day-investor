# Swagger Request Schemas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Elysia/TypeBox `body`/`query`/`params` schemas plus `detail` (tags, summary, security) to every route in `apps/core/src/api/` and `apps/market/src/api/`, so Swagger UI at `/api/swagger` documents a complete request contract for ~43 endpoints.

**Architecture:** Per-app `schemas.ts` modules export reusable TypeBox shapes. Routes import from there and pass schemas + `detail` as Elysia's third hook argument. Lax shapes (`additionalProperties: true`, `t.Numeric()`, liberal `t.Optional()`) — no response validation, no auth refactor, no behavior change.

**Tech Stack:** Elysia, TypeBox (via `t` from `"elysia"`), `@elysiajs/swagger`. Bun runtime. No tests.

**Reference spec:** `docs/superpowers/specs/2026-04-25-swagger-request-schemas-design.md`

**Working directory for all `bun` / `git` / `curl` commands:** `/Users/pavel/Projects/one-day-investor`

---

## File map

**Create:**
- `apps/core/src/api/schemas.ts`
- `apps/market/src/api/schemas.ts`

**Modify (one task each):**
- `apps/core/src/api/snapshots.ts`
- `apps/core/src/api/services.ts`
- `apps/core/src/api/assets.ts`
- `apps/core/src/api/catalog.ts`
- `apps/core/src/api/agents.ts`
- `apps/core/src/api/settings.ts`
- `apps/core/src/api/notifications.ts`
- `apps/core/src/api/exchange.ts`
- `apps/core/src/api/admin.ts`
- `apps/market/src/api/asset-catalog.ts`
- `apps/market/src/api/search-assets.ts`
- `apps/market/src/api/pocket-assets.ts`
- `apps/market/src/api/market.ts`

**Untouched:** `apps/core/src/api/exchange-sync.ts` (0 routes), `apps/core/src/api/index.ts` (aggregator), `apps/market/src/api/index.ts` (aggregator).

---

### Task 1: Create `apps/core/src/api/schemas.ts`

**Files:**
- Create: `apps/core/src/api/schemas.ts`

- [ ] **Step 1: Write the file**

```ts
import { t } from "elysia";

/**
 * Shared request-body shapes used across multiple core API routes.
 * All shapes use additionalProperties: true so existing callers that
 * send extra fields don't 422.
 */

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

- [ ] **Step 2: Commit**

```bash
git add apps/core/src/api/schemas.ts
git commit -m "feat(core): add api/schemas.ts with shared TypeBox shapes"
```

---

### Task 2: Schema-cover `apps/core/src/api/snapshots.ts`

**Files:**
- Modify: `apps/core/src/api/snapshots.ts`

The route file currently imports `Elysia` and defines six routes with no schemas. We add `t` to the import, reference `SnapshotEntry` from `./schemas`, drop the `body as { ... }` casts, and pass the schema/detail object as the third argument to each route.

- [ ] **Step 1: Replace the imports and the six route definitions**

Change the top imports from:

```ts
import { Elysia } from "elysia";
```

to:

```ts
import { Elysia, t } from "elysia";
import { SnapshotEntry } from "./schemas";
```

Then change the six route definitions in the `snapshotsApi` chain. Replace the entire chain (currently lines 35–139) with:

```ts
  .get(
    "/",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return findSnapshotsByUserId(user.id);
    },
    {
      detail: {
        tags: ["Snapshots"],
        summary: "List snapshots for the current user",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/latest",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const snapshot = await findLatestSnapshot(user.id);
      if (!snapshot) {
        set.status = 404;
        return { error: "No snapshots found" };
      }
      return snapshot;
    },
    {
      detail: {
        tags: ["Snapshots"],
        summary: "Get the latest snapshot",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/:id",
    async ({ user, set, params }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const snapshot = await findSnapshotById(params.id, user.id);
      if (!snapshot) {
        set.status = 404;
        return { error: "Snapshot not found" };
      }
      return snapshot;
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Snapshots"],
        summary: "Get a snapshot by id",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/",
    async ({ user, set, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { month, entries } = body;
      if (!month || !entries) {
        set.status = 400;
        return { error: "month and entries are required" };
      }
      try {
        log.info(
          {
            userId: user.id,
            month,
            entryCount: entries.length,
            byServiceAndPocket: entries.map(
              (e) => `${e.service_id}|${e.pocket_asset_id ?? "null"}`,
            ),
          },
          "createSnapshot called",
        );
        const snapshot = await createSnapshot({
          user_id: user.id,
          month,
          entries,
        });
        return snapshot;
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("snapshots_user_id_month")) {
          set.status = 409;
          return { error: "Snapshot already exists for this month" };
        }
        log.error({ err }, "createSnapshot failed");
        throw err;
      }
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
  .put(
    "/:id",
    async ({ user, set, params, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { entries } = body;
      if (!entries) {
        set.status = 400;
        return { error: "entries are required" };
      }
      const result = await updateSnapshot(params.id, user.id, entries);
      if (!result) {
        set.status = 404;
        return { error: "Snapshot not found" };
      }
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object(
        {
          entries: t.Array(SnapshotEntry),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Snapshots"],
        summary: "Replace a snapshot's entries",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:id",
    async ({ user, set, params }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const deleted = await deleteSnapshot(params.id, user.id);
      if (!deleted) {
        set.status = 404;
        return { error: "Snapshot not found" };
      }
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Snapshots"],
        summary: "Delete a snapshot",
        security: [{ bearerAuth: [] }],
      },
    },
  );
```

Also delete the now-unused `interface SnapshotEntryInput` block (lines 15–21 in the original).

- [ ] **Step 2: Commit**

```bash
git add apps/core/src/api/snapshots.ts
git commit -m "feat(core): add request schemas + Swagger detail to snapshots routes"
```

---

### Task 3: Schema-cover `apps/core/src/api/services.ts`

**Files:**
- Modify: `apps/core/src/api/services.ts`

Six routes. Cookie + bearer accepted (same pattern as snapshots).

- [ ] **Step 1: Update imports**

Change:

```ts
import { Elysia } from "elysia";
```

to:

```ts
import { Elysia, t } from "elysia";
```

- [ ] **Step 2: Replace the six route definitions in the chain**

Replace lines 26–122 (the `.get(...)` through final `.delete(...)`) with:

```ts
  .get(
    "/",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return findServicesByUserId(user.id);
    },
    {
      detail: {
        tags: ["Pockets"],
        summary: "List pockets for the current user",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/",
    async ({ user, set, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { name, parent_id, service_type } = body;
      if (!name || typeof name !== "string") {
        set.status = 400;
        return { error: "name is required" };
      }
      const result = await createService({
        user_id: user.id,
        name,
        parent_id: parent_id ?? null,
        service_type,
      });
      await cacheDel(`user:${user.id}:pockets`);
      return result;
    },
    {
      body: t.Object(
        {
          name: t.String(),
          parent_id: t.Optional(t.Union([t.String(), t.Null()])),
          service_type: t.Optional(t.String()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pockets"],
        summary: "Create a pocket",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/subscribe",
    async ({ user, set, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { catalog_service_id, child_ids } = body;
      if (!catalog_service_id) {
        set.status = 400;
        return { error: "catalog_service_id is required" };
      }
      const result = await subscribeToService(user.id, catalog_service_id, child_ids ?? []);
      await cacheDel(`user:${user.id}:pockets`);
      return result;
    },
    {
      body: t.Object(
        {
          catalog_service_id: t.String(),
          child_ids: t.Optional(t.Array(t.String())),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pockets"],
        summary: "Subscribe to a catalog service",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/unsubscribe",
    async ({ user, set, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { catalog_service_id } = body;
      if (!catalog_service_id) {
        set.status = 400;
        return { error: "catalog_service_id is required" };
      }
      const result = await unsubscribeFromService(user.id, catalog_service_id);
      if (!result.success) {
        set.status = 409;
        return { error: result.error };
      }
      await cacheDel(`user:${user.id}:pockets`);
      return { success: true };
    },
    {
      body: t.Object(
        { catalog_service_id: t.String() },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pockets"],
        summary: "Unsubscribe from a catalog service",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/:id",
    async ({ user, set, params, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const updates = body as {
        name?: string;
        parent_id?: string | null;
        sort_order?: number;
        service_type?: ServiceType;
      };
      const result = await updateService(params.id, user.id, updates);
      if (!result) {
        set.status = 404;
        return { error: "Service not found" };
      }
      await cacheDel(`user:${user.id}:pockets`);
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object(
        {
          name: t.Optional(t.String()),
          parent_id: t.Optional(t.Union([t.String(), t.Null()])),
          sort_order: t.Optional(t.Numeric()),
          service_type: t.Optional(t.String()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pockets"],
        summary: "Update a pocket",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:id",
    async ({ user, set, params }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const deleted = await deleteService(params.id, user.id);
      if (!deleted) {
        set.status = 404;
        return { error: "Service not found" };
      }
      await cacheDel(`user:${user.id}:pockets`);
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Pockets"],
        summary: "Delete a pocket",
        security: [{ bearerAuth: [] }],
      },
    },
  );
```

Note the PUT keeps the `body as { ... }` cast because `service_type` is typed as `ServiceType` (a domain enum), but the schema uses `t.String()` for laxness. The cast preserves the original handler typing without forcing `ServiceType` into the schema layer.

- [ ] **Step 3: Commit**

```bash
git add apps/core/src/api/services.ts
git commit -m "feat(core): add request schemas + Swagger detail to services routes"
```

---

### Task 4: Schema-cover `apps/core/src/api/assets.ts`

**Files:**
- Modify: `apps/core/src/api/assets.ts`

One route: `GET /`. No body, no params, no query.

- [ ] **Step 1: Add `t` import (only needed when schemas are added — no schemas here, so skip)**

This file has no `body`/`query`/`params` to schema. Only `detail` is added. The `Elysia` import doesn't need `t`.

- [ ] **Step 2: Replace the `GET /` route**

Replace lines 39–76 (`.get("/", async ({ user, set }) => { ... })`) with:

```ts
  .get(
    "/",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      // 1. Sync exchange holdings if credentials exist and cache expired
      const credentials = await findExchangeCredentialsByUserId(user.id);
      for (const cred of credentials) {
        const cacheKey = `user:${user.id}:exchange-synced:${cred.id}`;
        const synced = await cacheGet<boolean>(cacheKey);
        if (!synced) {
          try {
            log.info({ exchange: cred.exchange, label: cred.label }, "Syncing exchange holdings");
            const adapter = getAdapter(cred.exchange as "binance" | "bybit");
            const apiKey = decrypt(cred.api_key);
            const apiSecret = decrypt(cred.api_secret);
            const pockets = await adapter.fetchPockets(apiKey, apiSecret);
            await syncExchangeToDb(user.id, cred.service_id!, pockets);
            await cacheSet(cacheKey, true, EXCHANGE_CACHE_TTL);
          } catch (err) {
            log.error({ err, exchange: cred.exchange, label: cred.label }, "Exchange sync failed");
          }
        }
      }

      // 2. Read services and assets from DB (always fresh)
      const services = await findServicesByUserId(user.id);
      const leafIds = getLeafServiceIds(services);
      const assets = await findPocketAssetsByServiceIds(leafIds);

      // 3. Enrich with cached market prices in user's preferred currency
      const settings = await getSettings(user.id);
      const currency = settings.currency ?? "EUR";
      const assetsWithPrices = await enrichAssetsWithPrices(assets, MARKET_URL, currency);

      return { services, assets: assetsWithPrices, currency };
    },
    {
      detail: {
        tags: ["Assets"],
        summary: "List user's pocket assets with prices",
        security: [{ bearerAuth: [] }],
      },
    },
  );
```

- [ ] **Step 3: Commit**

```bash
git add apps/core/src/api/assets.ts
git commit -m "feat(core): add Swagger detail to assets route"
```

---

### Task 5: Schema-cover `apps/core/src/api/catalog.ts`

**Files:**
- Modify: `apps/core/src/api/catalog.ts`

Two routes: `GET /` and `GET /search`.

- [ ] **Step 1: Update imports**

Change `import { Elysia } from "elysia";` to `import { Elysia, t } from "elysia";`.

- [ ] **Step 2: Replace the two route definitions**

Replace lines 17–32 with:

```ts
  .get(
    "/",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return findAllCatalogServices();
    },
    {
      detail: {
        tags: ["Catalog"],
        summary: "List all catalog services",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/search",
    async ({ user, set, query }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const q = query.q ?? "";
      if (!q.trim()) return [];
      return searchCatalogServices(q.trim());
    },
    {
      query: t.Object(
        { q: t.Optional(t.String()) },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Catalog"],
        summary: "Search catalog services",
        security: [{ bearerAuth: [] }],
      },
    },
  );
```

The `(query as { q?: string }).q ?? ""` cast becomes `query.q ?? ""` because Elysia now infers the type.

- [ ] **Step 3: Commit**

```bash
git add apps/core/src/api/catalog.ts
git commit -m "feat(core): add request schemas + Swagger detail to catalog routes"
```

---

### Task 6: Schema-cover `apps/core/src/api/agents.ts`

**Files:**
- Modify: `apps/core/src/api/agents.ts`

Seven routes. **All cookie-auth only** (`if (!user || agentId !== null)` rejects bearer-token sessions). No `security: [{ bearerAuth: [] }]`.

- [ ] **Step 1: Update imports**

Change `import { Elysia } from "elysia";` to `import { Elysia, t } from "elysia";`.

- [ ] **Step 2: Replace the seven route definitions**

Replace lines 35–173 with:

```ts
  .get(
    "/",
    async ({ user, agentId, set }) => {
      if (!user || agentId !== null) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const agents = await listAgentsByUserId(user.id);
      const withCounts = await Promise.all(
        agents.map(async (a) => ({
          ...a,
          active_token_count: await countActiveTokensByAgentId(a.id),
        })),
      );
      return withCounts;
    },
    {
      detail: {
        tags: ["Agents"],
        summary: "List the current user's agents",
      },
    },
  )
  .post(
    "/",
    async ({ user, agentId, body, set }) => {
      if (!user || agentId !== null) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { name, description } = body ?? {};
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
    },
    {
      body: t.Object(
        {
          name: t.Optional(t.String()),
          description: t.Optional(t.String()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Agents"],
        summary: "Create an agent",
      },
    },
  )
  .patch(
    "/:id",
    async ({ user, agentId, params, body, set }) => {
      if (!user || agentId !== null) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { name, description } = body ?? {};
      const agent = await updateAgent(params.id, user.id, { name, description });
      if (!agent) {
        set.status = 404;
        return { error: "Agent not found" };
      }
      return agent;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object(
        {
          name: t.Optional(t.String()),
          description: t.Optional(t.Union([t.String(), t.Null()])),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Agents"],
        summary: "Update an agent",
      },
    },
  )
  .delete(
    "/:id",
    async ({ user, agentId, params, set }) => {
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
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Agents"],
        summary: "Revoke an agent",
      },
    },
  )
  .get(
    "/:id/tokens",
    async ({ user, agentId, params, set }) => {
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
      return tokens.map((tok) => ({
        id: tok.id,
        token_last4: tok.token_last4,
        created_at: tok.created_at,
        expires_at: tok.expires_at,
        last_used_at: tok.last_used_at,
        revoked_at: tok.revoked_at,
      }));
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Agents"],
        summary: "List tokens for an agent",
      },
    },
  )
  .post(
    "/:id/tokens",
    async ({ user, agentId, params, body, set }) => {
      if (!user || agentId !== null) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const agent = await findAgentById(params.id, user.id);
      if (!agent) {
        set.status = 404;
        return { error: "Agent not found" };
      }
      const { expires_in } = body ?? {};
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
        "agent token created",
      );
      set.status = 201;
      return {
        id: session.id,
        token: plaintext,
        token_last4: last4,
        expires_at: session.expires_at,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object(
        { expires_in: t.Optional(t.String()) },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Agents"],
        summary: "Create a token for an agent",
      },
    },
  )
  .delete(
    "/:id/tokens/:tokenId",
    async ({ user, agentId, params, set }) => {
      if (!user || agentId !== null) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const agent = await findAgentById(params.id, user.id);
      if (!agent) {
        set.status = 404;
        return { error: "Agent not found" };
      }
      const ok = await revokeAgentSession(params.tokenId, user.id, params.id);
      if (!ok) {
        set.status = 404;
        return { error: "Token not found" };
      }
      set.status = 204;
      return;
    },
    {
      params: t.Object({ id: t.String(), tokenId: t.String() }),
      detail: {
        tags: ["Agents"],
        summary: "Revoke a token for an agent",
      },
    },
  );
```

The local map variable `t` from `tokens.map((t) => ...)` is renamed to `tok` so it doesn't shadow the imported TypeBox `t`.

- [ ] **Step 3: Commit**

```bash
git add apps/core/src/api/agents.ts
git commit -m "feat(core): add request schemas + Swagger detail to agents routes"
```

---

### Task 7: Schema-cover `apps/core/src/api/settings.ts`

**Files:**
- Modify: `apps/core/src/api/settings.ts`

Two routes. Cookie-auth only per the swagger config tag description. No bearer security.

- [ ] **Step 1: Update imports**

Change `import { Elysia } from "elysia";` to `import { Elysia, t } from "elysia";`.

- [ ] **Step 2: Replace the two route definitions**

Replace lines 17–39 with:

```ts
  .get(
    "/",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return getSettings(user.id);
    },
    {
      detail: {
        tags: ["Settings"],
        summary: "Get the current user's settings",
      },
    },
  )
  .put(
    "/",
    async ({ user, set, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return updateSettings(user.id, body);
    },
    {
      body: t.Object(
        {
          snapshot_day: t.Optional(t.Numeric()),
          goal: t.Optional(t.Numeric()),
          currency: t.Optional(t.String()),
          language: t.Optional(t.String()),
          notify_snapshot_reminders: t.Optional(t.Boolean()),
          notify_service_updates: t.Optional(t.Boolean()),
          notify_blog_posts: t.Optional(t.Boolean()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Settings"],
        summary: "Update the current user's settings",
      },
    },
  );
```

The `body as { ... }` cast and the local `params` variable that aliased it are removed; the handler now takes `body` directly.

- [ ] **Step 3: Commit**

```bash
git add apps/core/src/api/settings.ts
git commit -m "feat(core): add request schemas + Swagger detail to settings routes"
```

---

### Task 8: Schema-cover `apps/core/src/api/notifications.ts`

**Files:**
- Modify: `apps/core/src/api/notifications.ts`

Two routes. **Public** — auth is via a `token` query parameter (unsubscribe token), not a session. No bearer security.

- [ ] **Step 1: Update imports**

Change `import { Elysia } from "elysia";` to `import { Elysia, t } from "elysia";`.

- [ ] **Step 2: Replace the two route definitions**

Replace lines 6–51 with:

```ts
  .get(
    "/preferences",
    async ({ query, set }) => {
      const token = query.token;
      if (!token) {
        set.status = 400;
        return { error: "Missing token" };
      }

      const userId = validateUnsubscribeToken(token);
      if (!userId) {
        set.status = 403;
        return { error: "Invalid token" };
      }

      const settings = await getSettings(userId);
      return {
        notify_snapshot_reminders: settings.notify_snapshot_reminders,
        notify_service_updates: settings.notify_service_updates,
        notify_blog_posts: settings.notify_blog_posts,
      };
    },
    {
      query: t.Object(
        { token: t.Optional(t.String()) },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Notifications"],
        summary: "Get notification preferences via unsubscribe token",
      },
    },
  )
  .put(
    "/preferences",
    async ({ query, body, set }) => {
      const token = query.token;
      if (!token) {
        set.status = 400;
        return { error: "Missing token" };
      }

      const userId = validateUnsubscribeToken(token);
      if (!userId) {
        set.status = 403;
        return { error: "Invalid token" };
      }

      const updated = await updateSettings(userId, body);
      return {
        notify_snapshot_reminders: updated.notify_snapshot_reminders,
        notify_service_updates: updated.notify_service_updates,
        notify_blog_posts: updated.notify_blog_posts,
      };
    },
    {
      query: t.Object(
        { token: t.Optional(t.String()) },
        { additionalProperties: true },
      ),
      body: t.Object(
        {
          notify_snapshot_reminders: t.Optional(t.Boolean()),
          notify_service_updates: t.Optional(t.Boolean()),
          notify_blog_posts: t.Optional(t.Boolean()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Notifications"],
        summary: "Update notification preferences via unsubscribe token",
      },
    },
  );
```

- [ ] **Step 3: Commit**

```bash
git add apps/core/src/api/notifications.ts
git commit -m "feat(core): add request schemas + Swagger detail to notifications routes"
```

---

### Task 9: Schema-cover `apps/core/src/api/exchange.ts`

**Files:**
- Modify: `apps/core/src/api/exchange.ts`

Three routes. Cookie-auth only per the swagger config tag description. No bearer security.

- [ ] **Step 1: Update imports**

Change `import { Elysia } from "elysia";` to `import { Elysia, t } from "elysia";`.

- [ ] **Step 2: Replace the three route definitions**

Replace lines 41–188 with:

```ts
  .post(
    "/connect",
    async ({ user, set, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const { exchange, label, apiKey, apiSecret } = body as {
        exchange: ExchangeType;
        label: string;
        apiKey: string;
        apiSecret: string;
      };

      if (!exchange || !label || !apiKey || !apiSecret) {
        set.status = 400;
        log.warn({ userId: user.id, exchange }, "connect: missing required fields");
        return { error: "exchange, label, apiKey, and apiSecret are required" };
      }

      log.info({ userId: user.id, exchange, label }, "connect: validating credentials");

      const adapter = getAdapter(exchange);
      const valid = await adapter.validateCredentials(apiKey, apiSecret);
      if (!valid) {
        set.status = 400;
        log.warn({ userId: user.id, exchange, label }, "connect: invalid credentials");
        return { error: "Invalid API credentials" };
      }

      log.info({ userId: user.id, exchange, label }, "connect: credentials valid, creating service");

      const parentService = await createService({
        user_id: user.id,
        name: `${exchange.charAt(0).toUpperCase() + exchange.slice(1)} - ${label}`,
        parent_id: null,
        service_type: "crypto",
      });

      const credential = await createExchangeCredential({
        user_id: user.id,
        exchange,
        label,
        api_key: encrypt(apiKey),
        api_secret: encrypt(apiSecret),
        service_id: parentService.id,
      });

      log.info({ userId: user.id, exchange, credentialId: credential.id, serviceId: parentService.id }, "connect: credential stored, syncing pockets");

      const pockets = await adapter.fetchPockets(apiKey, apiSecret);

      log.info({ userId: user.id, exchange, pocketCount: pockets.length, assetCount: pockets.reduce((s, p) => s + p.assets.length, 0) }, "connect: fetched pockets from exchange");

      const syncResult = await syncExchangeToDb(
        user.id,
        parentService.id,
        pockets,
      );

      const prices: Record<string, number> = {};
      for (const pocket of pockets) {
        for (const asset of pocket.assets) {
          const qty = parseFloat(asset.quantity);
          const value = parseFloat(asset.valueUsd);
          if (qty > 0 && value > 0) {
            prices[asset.symbol] = value / qty;
          }
        }
      }

      await cacheSet(
        `user:${user.id}:exchange:${credential.id}`,
        { pockets, prices, cachedAt: new Date().toISOString() },
        CACHE_TTL,
      );

      log.info({ userId: user.id, exchange, label, credentialId: credential.id }, "connect: complete");

      return {
        credential: {
          id: credential.id,
          exchange: credential.exchange,
          label: credential.label,
        },
        service: { id: parentService.id, name: parentService.name },
        syncResult,
      };
    },
    {
      body: t.Object(
        {
          exchange: t.String(),
          label: t.String(),
          apiKey: t.String(),
          apiSecret: t.String(),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Exchange"],
        summary: "Connect an exchange and sync pockets",
      },
    },
  )
  .get(
    "/",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const credentials = await findExchangeCredentialsByUserId(user.id);
      return credentials.map((c) => ({
        id: c.id,
        exchange: c.exchange,
        label: c.label,
        serviceId: c.service_id,
        createdAt: c.created_at,
      }));
    },
    {
      detail: {
        tags: ["Exchange"],
        summary: "List the user's exchange connections",
      },
    },
  )
  .delete(
    "/:id",
    async ({ user, set, params }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const credential = await findExchangeCredentialById(params.id);
      if (!credential || credential.user_id !== user.id) {
        set.status = 404;
        log.warn({ userId: user.id, credentialId: params.id }, "disconnect: not found");
        return { error: "Exchange connection not found" };
      }

      log.info({ userId: user.id, exchange: credential.exchange, credentialId: params.id }, "disconnect: removing");

      await deleteExchangeCredential(params.id, user.id);

      if (credential.service_id) {
        const services = await findServicesByUserId(user.id);
        const children = services.filter(
          (s) => s.parent_id === credential.service_id,
        );
        for (const child of children) {
          await deleteService(child.id, user.id);
        }
        await deleteService(credential.service_id, user.id);
        log.info({ userId: user.id, serviceId: credential.service_id, childrenRemoved: children.length }, "disconnect: service tree deleted");
      }

      await cacheDel(`user:${user.id}:exchange:${credential.id}`);
      await cacheDel(`user:${user.id}:pockets`);

      log.info({ userId: user.id, exchange: credential.exchange, credentialId: params.id }, "disconnect: complete");

      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Exchange"],
        summary: "Disconnect an exchange and delete its service tree",
      },
    },
  );
```

The `POST /connect` body keeps the `as { exchange: ExchangeType; ... }` cast because `ExchangeType` is a domain enum the handler relies on; the schema uses `t.String()` for laxness.

- [ ] **Step 3: Commit**

```bash
git add apps/core/src/api/exchange.ts
git commit -m "feat(core): add request schemas + Swagger detail to exchange routes"
```

---

### Task 10: Schema-cover `apps/core/src/api/admin.ts`

**Files:**
- Modify: `apps/core/src/api/admin.ts`

Six routes. Cookie-auth + admin-only. No bearer security. The `/upload-image` route accepts a multipart form; we use `t.Object({ file: t.Any() })` because Elysia represents file uploads as `File` instances and TypeBox can't tightly type them.

- [ ] **Step 1: Update imports**

Change `import { Elysia } from "elysia";` to `import { Elysia, t } from "elysia";`.

- [ ] **Step 2: Replace the six route definitions**

Replace lines 52–167 with:

```ts
  .get(
    "/check",
    () => ({ admin: true }),
    {
      detail: {
        tags: ["Admin"],
        summary: "Check whether the current user is an admin",
      },
    },
  )
  .post(
    "/upload-image",
    async ({ body, set }) => {
      const formBody = body as Record<string, unknown>;
      const file = formBody.file;
      if (!file || !(file instanceof File)) {
        set.status = 400;
        return { error: "No file provided" };
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const key = `emails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { upload } = await import("@storage");
      await upload(key, buffer, file.type);
      const publicBase = config.get("s3.publicUrl");
      const bucket = config.get("s3.bucket");
      const url = publicBase
        ? `${publicBase}/${bucket}/${key}`
        : `${config.get("s3.endpoint")}/${bucket}/${key}`;
      return { url };
    },
    {
      body: t.Object({ file: t.Any() }, { additionalProperties: true }),
      detail: {
        tags: ["Admin"],
        summary: "Upload an image to S3",
      },
    },
  )
  .post(
    "/service-update/preview",
    async ({ body }) => {
      const { subject, markdown } = body;
      const html = renderServiceUpdateEmail({ subject, markdown, unsubscribeUrl: "#" });
      return { html };
    },
    {
      body: t.Object(
        { subject: t.String(), markdown: t.String() },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Admin"],
        summary: "Render a preview of a service-update email",
      },
    },
  )
  .post(
    "/service-update/send",
    async ({ body, set }) => {
      const { subject, markdown } = body;

      const { rows } = await pool.query<{ user_id: string; email: string; name: string | null }>(
        `SELECT us.user_id, u.email, u.name
         FROM user_settings us
         JOIN users u ON u.id = us.user_id
         WHERE us.notify_service_updates = TRUE`,
      );

      let sent = 0;
      let failed = 0;
      const frontendUrl = config.get("frontendUrl");

      for (const row of rows) {
        try {
          const token = generateUnsubscribeToken(row.user_id);
          const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${token}`;
          const html = renderServiceUpdateEmail({ subject, markdown, unsubscribeUrl });
          const toHeader = row.name ? `${row.name} <${row.email}>` : row.email;
          await sendEmail({
            to: toHeader,
            subject,
            html,
            headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
          });
          sent++;
        } catch {
          failed++;
        }
      }

      return { sent, failed, total: rows.length };
    },
    {
      body: t.Object(
        { subject: t.String(), markdown: t.String() },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Admin"],
        summary: "Send a service-update email to subscribed users",
      },
    },
  )
  .post(
    "/blog-post/preview",
    async ({ body }) => {
      const { title, excerpt, slug, blocks } = body as { title: string; excerpt: string; slug: string; blocks?: any[] };
      const blogUrl = process.env.VITE_BLOG_URL || process.env.BLOG_URL || "https://blog.odinvestor.net";
      const sections = extractSections(blocks);
      const html = renderBlogPostEmail({
        title,
        excerpt,
        sections,
        postUrl: `${blogUrl}/${slug}`,
        unsubscribeUrl: "#",
      });
      return { html };
    },
    {
      body: t.Object(
        {
          title: t.String(),
          excerpt: t.String(),
          slug: t.String(),
          blocks: t.Optional(t.Array(t.Any())),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Admin"],
        summary: "Render a preview of a blog-post email",
      },
    },
  )
  .post(
    "/blog-post/send",
    async ({ body }) => {
      const { title, excerpt, slug, blocks } = body as { title: string; excerpt: string; slug: string; blocks?: any[] };
      const blogUrl = process.env.VITE_BLOG_URL || process.env.BLOG_URL || "https://blog.odinvestor.net";
      const sections = extractSections(blocks);

      const { rows } = await pool.query<{ user_id: string; email: string; name: string | null }>(
        `SELECT us.user_id, u.email, u.name
         FROM user_settings us
         JOIN users u ON u.id = us.user_id
         WHERE us.notify_blog_posts = TRUE`,
      );

      let sent = 0;
      let failed = 0;
      const frontendUrl = config.get("frontendUrl");

      for (const row of rows) {
        try {
          const token = generateUnsubscribeToken(row.user_id);
          const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${token}`;
          const html = renderBlogPostEmail({
            title,
            excerpt,
            sections,
            postUrl: `${blogUrl}/${slug}`,
            unsubscribeUrl,
          });
          const toHeader = row.name ? `${row.name} <${row.email}>` : row.email;
          await sendEmail({
            to: toHeader,
            subject: `New post: ${title}`,
            html,
            headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
          });
          sent++;
        } catch {
          failed++;
        }
      }

      return { sent, failed, total: rows.length };
    },
    {
      body: t.Object(
        {
          title: t.String(),
          excerpt: t.String(),
          slug: t.String(),
          blocks: t.Optional(t.Array(t.Any())),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Admin"],
        summary: "Send a blog-post email to subscribed users",
      },
    },
  );
```

The blog-post routes keep the `body as { ... }` cast because `blocks?: any[]` is hard to express in TypeBox without `t.Any()` and the handler treats `blocks` as opaque pass-through to `extractSections`.

- [ ] **Step 3: Commit**

```bash
git add apps/core/src/api/admin.ts
git commit -m "feat(core): add request schemas + Swagger detail to admin routes"
```

---

### Task 11: Create `apps/market/src/api/schemas.ts`

**Files:**
- Create: `apps/market/src/api/schemas.ts`

- [ ] **Step 1: Write the file**

```ts
import { t } from "elysia";

/**
 * Shared request-body shapes used across multiple market API routes.
 * All shapes use additionalProperties: true so existing callers that
 * send extra fields don't 422.
 */

export const PriceQueryAsset = t.Object(
  {
    api_id: t.String(),
    symbol: t.Optional(t.String()),
    asset_type: t.String(),
  },
  { additionalProperties: true },
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/market/src/api/schemas.ts
git commit -m "feat(market): add api/schemas.ts with shared TypeBox shapes"
```

---

### Task 12: Schema-cover `apps/market/src/api/asset-catalog.ts`

**Files:**
- Modify: `apps/market/src/api/asset-catalog.ts`

One route: `GET /search`. Bearer-auth scope (the agent scope plugin gates `/api/asset-catalog`).

- [ ] **Step 1: Update imports**

Change `import { Elysia } from "elysia";` to `import { Elysia, t } from "elysia";`.

- [ ] **Step 2: Replace the route definition**

Replace lines 18–26 with:

```ts
  .get(
    "/search",
    async ({ user, set, query }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { q, type } = query;
      if (!q?.trim()) return [];
      return searchAssetCatalog(q.trim(), type as AssetType | undefined);
    },
    {
      query: t.Object(
        {
          q: t.Optional(t.String()),
          type: t.Optional(t.String()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Asset Catalog"],
        summary: "Search the asset catalog",
        security: [{ bearerAuth: [] }],
      },
    },
  );
```

The `(query as { q?: string; type?: AssetType }).q` cast becomes `query.q` because Elysia infers from the schema. `type` stays cast to `AssetType` at the call site since the schema is loose `t.String()`.

- [ ] **Step 3: Commit**

```bash
git add apps/market/src/api/asset-catalog.ts
git commit -m "feat(market): add request schema + Swagger detail to asset-catalog route"
```

---

### Task 13: Schema-cover `apps/market/src/api/search-assets.ts`

**Files:**
- Modify: `apps/market/src/api/search-assets.ts`

One route: `GET /search-assets`. **Public** — no auth check in the handler. No bearer security.

- [ ] **Step 1: Update imports**

Change `import { Elysia } from "elysia";` to `import { Elysia, t } from "elysia";`.

- [ ] **Step 2: Replace the route definition**

Replace lines 69–76 with:

```ts
export const searchAssetsApi = new Elysia({ prefix: "/api/market" })
  .get(
    "/search-assets",
    async ({ query, set }) => {
      const q = typeof query.q === "string" ? query.q.trim() : "";
      if (!q) {
        set.status = 400;
        return { error: "q is required" };
      }
      return searchYahoo(q);
    },
    {
      query: t.Object(
        { q: t.Optional(t.String()) },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Market"],
        summary: "Search assets via Yahoo Finance (ISIN or free text)",
      },
    },
  );
```

- [ ] **Step 3: Commit**

```bash
git add apps/market/src/api/search-assets.ts
git commit -m "feat(market): add request schema + Swagger detail to search-assets route"
```

---

### Task 14: Schema-cover `apps/market/src/api/pocket-assets.ts`

**Files:**
- Modify: `apps/market/src/api/pocket-assets.ts`

Five routes. Bearer-auth scope.

- [ ] **Step 1: Update imports**

Change `import { Elysia } from "elysia";` to `import { Elysia, t } from "elysia";`.

- [ ] **Step 2: Replace the five route definitions**

Replace lines 24–102 with:

```ts
  .get(
    "/:serviceId",
    async ({ user, set, params }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return findPocketAssetsByServiceId(params.serviceId);
    },
    {
      params: t.Object({ serviceId: t.String() }),
      detail: {
        tags: ["Pocket Assets"],
        summary: "List pocket assets for a service",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/",
    async ({ user, set, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const params = body as {
        service_id: string;
        asset_catalog_id?: string | null;
        symbol: string;
        name: string;
        asset_type: AssetType;
      };
      if (!params.service_id || !params.symbol || !params.name || !params.asset_type) {
        set.status = 400;
        return { error: "service_id, symbol, name, and asset_type are required" };
      }
      return addPocketAsset(params);
    },
    {
      body: t.Object(
        {
          service_id: t.String(),
          asset_catalog_id: t.Optional(t.Union([t.String(), t.Null()])),
          symbol: t.String(),
          name: t.String(),
          asset_type: t.String(),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pocket Assets"],
        summary: "Add an asset to a pocket",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/:id/quantity",
    async ({ user, set, params, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const { quantity } = body;
      if (quantity == null || typeof quantity !== "number") {
        set.status = 400;
        return { error: "quantity is required" };
      }
      const result = await updatePocketAssetQuantity(params.id, quantity);
      if (!result) {
        set.status = 404;
        return { error: "Pocket asset not found" };
      }
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object(
        { quantity: t.Number() },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pocket Assets"],
        summary: "Update a pocket asset's quantity",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/:id",
    async ({ user, set, params, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const patch = body;
      if (patch.service_id === undefined && patch.quantity === undefined) {
        set.status = 400;
        return { error: "At least one of service_id or quantity is required" };
      }
      if (patch.quantity !== undefined && typeof patch.quantity !== "number") {
        set.status = 400;
        return { error: "quantity must be a number" };
      }
      if (patch.service_id !== undefined && typeof patch.service_id !== "string") {
        set.status = 400;
        return { error: "service_id must be a string" };
      }
      const result = await updatePocketAsset(params.id, patch);
      if (!result) {
        set.status = 404;
        return { error: "Pocket asset not found" };
      }
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object(
        {
          service_id: t.Optional(t.String()),
          quantity: t.Optional(t.Number()),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Pocket Assets"],
        summary: "Update a pocket asset",
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:id",
    async ({ user, set, params }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const deleted = await removePocketAsset(params.id);
      if (!deleted) {
        set.status = 404;
        return { error: "Pocket asset not found" };
      }
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["Pocket Assets"],
        summary: "Remove an asset from a pocket",
        security: [{ bearerAuth: [] }],
      },
    },
  );
```

The `POST /` keeps the `body as { ... }` cast because the handler later passes `params` directly to `addPocketAsset(params)` which is typed for `AssetType` (a domain enum).

- [ ] **Step 3: Commit**

```bash
git add apps/market/src/api/pocket-assets.ts
git commit -m "feat(market): add request schemas + Swagger detail to pocket-assets routes"
```

---

### Task 15: Schema-cover `apps/market/src/api/market.ts`

**Files:**
- Modify: `apps/market/src/api/market.ts`

One route: `POST /prices`. **Public** — no auth check.

- [ ] **Step 1: Update imports**

Change:

```ts
import { Elysia } from "elysia";
```

to:

```ts
import { Elysia, t } from "elysia";
import { PriceQueryAsset } from "./schemas";
```

- [ ] **Step 2: Replace the route definition**

Replace lines 11–43 with:

```ts
  .post(
    "/prices",
    async ({ set, body }) => {
      const { assets, currency } = body as {
        assets: { api_id: string; symbol?: string; asset_type: AssetType }[];
        currency: string;
      };
      if (!assets || !currency) {
        set.status = 400;
        return { error: "assets and currency are required" };
      }

      const assetKey = assets
        .map((a) => `${a.api_id}:${a.asset_type}`)
        .sort()
        .join(",");
      const cacheKey = `prices:${currency}:${assetKey}`;

      const cached = await cacheGet<Record<string, number | null>>(cacheKey);
      if (cached) {
        log.debug({ currency, count: assets.length }, "Price cache hit");
        return cached;
      }

      log.info({ currency, count: assets.length }, "Price cache miss, fetching");
      const prices = await fetchPrices(assets, currency);

      await cacheSet(cacheKey, prices, PRICE_CACHE_TTL);

      return prices;
    },
    {
      body: t.Object(
        {
          assets: t.Array(PriceQueryAsset),
          currency: t.String(),
        },
        { additionalProperties: true },
      ),
      detail: {
        tags: ["Market"],
        summary: "Fetch current prices for a list of assets",
      },
    },
  );
```

The `body as { assets: ...; currency: ... }` cast is kept because `asset_type: AssetType` is the domain enum the handler passes through to `fetchPrices`; the schema is loose `t.String()`.

- [ ] **Step 3: Commit**

```bash
git add apps/market/src/api/market.ts
git commit -m "feat(market): add request schema + Swagger detail to market prices route"
```

---

### Task 16: Boot both apps and verify Swagger output

**Files:**
- None modified.

This task is the gate. We boot core (port 3000) and market (port 3002), hit `/api/swagger/json` for each to confirm the doc generator doesn't throw, and visually walk the UI for at least one route per modified file.

- [ ] **Step 1: Start core**

In one terminal:

```bash
cd apps/core && bun run dev
```

Expected: log line `Core service started`. No TypeScript errors during startup. If startup fails with a TypeScript error, the failing file is the most recently modified one — go back to that task, diagnose, fix, and re-commit on top.

- [ ] **Step 2: Start market**

In a second terminal:

```bash
cd apps/market && bun run dev
```

Expected: log line `Market service started`. Same fail mode and recovery as Step 1.

- [ ] **Step 3: Confirm Swagger JSON renders for both apps**

```bash
curl -fsS http://localhost:3000/api/swagger/json | head -c 500 ; echo
curl -fsS http://localhost:3002/api/swagger/json | head -c 500 ; echo
```

Expected: both commands print JSON starting with `{"openapi":"3.…"`. A 500 or empty response indicates a malformed schema in one of the route files — open the failing app's terminal log to find the offending file and fix.

- [ ] **Step 4: Smoke an unauthenticated request to confirm validation works**

Pick a route that requires a body and send a malformed request:

```bash
curl -i -X POST http://localhost:3000/api/snapshots/ \
  -H 'Content-Type: application/json' \
  -d '{"month": 123}'
```

Expected: `HTTP/1.1 422 Unprocessable Entity` with a body explaining the type mismatch (`month` should be a string). This confirms the schema enforces input types. (If you instead see `401 Unauthorized`, schema validation runs *after* auth — adjust the request to a route that doesn't require auth, e.g. `POST /api/market/prices` with a malformed body.)

- [ ] **Step 5: Open both Swagger UIs and visually confirm**

In a browser (or Playwright):

- `http://localhost:3000/api/swagger`
- `http://localhost:3002/api/swagger`

Confirm:
- Every tag declared in each app's `swagger({...documentation.tags})` block is populated.
- Each route shows its method, summary, and (where applicable) Parameters / Request Body sections.
- Bearer-auth routes show a lock icon / Authorize affordance; cookie-only routes do not.

- [ ] **Step 6: Stop both dev servers**

Ctrl-C in each terminal. No commit on this task — it's verification only.

---

## Notes for the implementer

- **No tests to write.** Neither app has a test runner (no `test` script in `package.json`). Verification is the manual smoke and Swagger walkthrough in Task 16. The plan's `body`/`query`/`params` schemas themselves are runtime-checked: if Elysia rejects a request that previously worked, the schema is too strict and you should loosen it (typically by replacing `t.Number()` with `t.Numeric()` or marking a field optional).
- **Commit granularity.** One commit per task. Each task is independently revertible — if Task 16 surfaces a problem traced to a specific file, only that file's commit needs to be redone.
- **The `body as { ... }` casts that remain.** Where a handler passes the body through to a function with a stricter domain type (e.g. `ServiceType`, `AssetType`, `ExchangeType`), the cast is preserved on purpose — keeping the schema lax while preserving the handler's typed call to the database/exchange layer. Don't remove these casts.
- **Tag names must match the swagger config.** The `documentation.tags` array in each app's `src/index.ts` lists the canonical tag names. Use them verbatim in `detail.tags`. If you mistype, Swagger UI silently creates a new tag group.
