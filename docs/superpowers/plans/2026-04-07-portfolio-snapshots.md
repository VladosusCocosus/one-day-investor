# Portfolio Snapshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full-stack portfolio snapshot tracking — database tables, API endpoints, and frontend pages for managing services and monthly financial snapshots.

**Architecture:** Three new database tables (services, snapshots, snapshot_entries) with query modules following existing patterns. Elysia API routes for CRUD operations on services and snapshots, mounted alongside existing auth routes. Frontend pages: Dashboard shows monthly totals table, Assets page shows single-month view with grouped service cards, prev/next navigation, and snapshot creation form prefilled from previous month.

**Tech Stack:** PostgreSQL (node-pg-migrate), Elysia (API), React 19, shadcn/ui, Tailwind CSS 4, axios

---

## File Structure

```
packages/types/database/index.ts          # Add Service, Snapshot, SnapshotEntry types (modify)
packages/database/migrations/             # New migration SQL (create)
packages/database/services/index.ts       # Service CRUD queries (create)
packages/database/snapshots/index.ts      # Snapshot + entry queries (create)
packages/database/index.ts                # Re-export new modules (modify)
apps/core/src/api/services.ts             # Service API routes (create)
apps/core/src/api/snapshots.ts            # Snapshot API routes (create)
apps/core/src/api/index.ts                # API plugin combining routes (create)
apps/core/src/index.ts                    # Mount API plugin (modify)
apps/frontend/src/lib/api.ts              # Shared axios instance (create)
apps/frontend/src/hooks/AuthContext.tsx    # Use shared api instance (modify)
apps/frontend/src/hooks/useServices.ts    # Services data hook (create)
apps/frontend/src/hooks/useSnapshots.ts   # Snapshots data hook (create)
apps/frontend/src/pages/DashboardPage.tsx # Monthly totals table (modify)
apps/frontend/src/pages/AssetsPage.tsx    # Month view with grouped cards (modify)
apps/frontend/src/components/SnapshotForm.tsx  # Create/edit snapshot form (create)
apps/frontend/src/components/ServiceManager.tsx # Manage services UI (create)
```

---

### Task 1: Database migration

**Files:**
- Create: `packages/database/migrations/<timestamp>_add-portfolio-tables.sql`

- [ ] **Step 1: Create migration file**

```bash
cd packages/database && bun run migrate:create add-portfolio-tables
```

- [ ] **Step 2: Write migration SQL**

Open the created file in `packages/database/migrations/` and write:

```sql
-- Up Migration

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES services(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, name, parent_id)
);

CREATE INDEX idx_services_user_id ON services(user_id);
CREATE INDEX idx_services_parent_id ON services(parent_id);

CREATE TABLE snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, month)
);

CREATE INDEX idx_snapshots_user_id ON snapshots(user_id);

CREATE TABLE snapshot_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    UNIQUE(snapshot_id, service_id)
);

CREATE INDEX idx_snapshot_entries_snapshot_id ON snapshot_entries(snapshot_id);

-- Down Migration

DROP TABLE IF EXISTS snapshot_entries;
DROP TABLE IF EXISTS snapshots;
DROP TABLE IF EXISTS services;
```

- [ ] **Step 3: Run migration**

```bash
cd packages/database && bun run migrate:up
```

Expected: Migration applies successfully, tables created.

- [ ] **Step 4: Commit**

```bash
git add packages/database/migrations/
git commit -m "feat: add services, snapshots, and snapshot_entries tables"
```

---

### Task 2: Type definitions

**Files:**
- Modify: `packages/types/database/index.ts`

- [ ] **Step 1: Add types**

Append to `packages/types/database/index.ts`:

```typescript
export interface Service {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: Date;
}

export interface Snapshot {
  id: string;
  user_id: string;
  month: Date;
  created_at: Date;
}

export interface SnapshotEntry {
  id: string;
  snapshot_id: string;
  service_id: string;
  amount: string; // numeric comes back as string from pg
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/types/database/index.ts
git commit -m "feat: add Service, Snapshot, SnapshotEntry type definitions"
```

---

### Task 3: Services database query module

**Files:**
- Create: `packages/database/services/index.ts`
- Modify: `packages/database/index.ts`

- [ ] **Step 1: Create services query module**

Create `packages/database/services/index.ts`:

```typescript
import { pool } from "../pool";
import type { Service } from "@types";

export type { Service } from "@types";

export async function findServicesByUserId(userId: string): Promise<Service[]> {
  const result = await pool.query<Service>(
    "SELECT * FROM services WHERE user_id = $1 ORDER BY sort_order, created_at",
    [userId]
  );
  return result.rows;
}

export async function createService(params: {
  user_id: string;
  name: string;
  parent_id: string | null;
}): Promise<Service> {
  const result = await pool.query<Service>(
    "INSERT INTO services (user_id, name, parent_id) VALUES ($1, $2, $3) RETURNING *",
    [params.user_id, params.name, params.parent_id]
  );
  return result.rows[0];
}

export async function updateService(
  id: string,
  userId: string,
  params: { name?: string; parent_id?: string | null; sort_order?: number }
): Promise<Service | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(params.name);
  }
  if (params.parent_id !== undefined) {
    fields.push(`parent_id = $${idx++}`);
    values.push(params.parent_id);
  }
  if (params.sort_order !== undefined) {
    fields.push(`sort_order = $${idx++}`);
    values.push(params.sort_order);
  }

  if (fields.length === 0) return null;

  values.push(id, userId);
  const result = await pool.query<Service>(
    `UPDATE services SET ${fields.join(", ")} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteService(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM services WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
```

- [ ] **Step 2: Add to database index**

Add to `packages/database/index.ts`:

```typescript
export { pool } from "./pool";
export * from "./users";
export * from "./oauth-accounts";
export * from "./sessions";
export * from "./services";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/database && bunx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add packages/database/services/ packages/database/index.ts
git commit -m "feat: add services database query module"
```

---

### Task 4: Snapshots database query module

**Files:**
- Create: `packages/database/snapshots-data/index.ts`
- Modify: `packages/database/index.ts`

Note: We use `snapshots-data` as the directory name to avoid conflict with the existing `sessions` directory (which could be confused with `snapshots` in autocomplete). Alternative: name it `portfolio-snapshots`.

Actually, let's just use `snapshots` — no conflict with `sessions`.

- [ ] **Step 1: Create snapshots query module**

Create `packages/database/snapshots/index.ts`:

Wait — there's already a `packages/database/sessions/index.ts`. The directory `snapshots` is fine, no conflict. But the database index already exports `* from "./sessions"`. Let's verify there's no naming collision.

The sessions module exports: `createSession`, `findSessionByToken`, `deleteSessionByToken`, `Session`.
Our snapshots module will export: `createSnapshot`, `findSnapshotsByUserId`, etc. No collision.

Create `packages/database/snapshots/index.ts`:

```typescript
import { pool } from "../pool";
import type { Snapshot, SnapshotEntry } from "@types";

export type { Snapshot, SnapshotEntry } from "@types";

export interface SnapshotWithTotal {
  id: string;
  month: Date;
  total: string;
  created_at: Date;
}

export interface SnapshotWithEntries {
  id: string;
  month: Date;
  created_at: Date;
  entries: SnapshotEntry[];
}

export async function findSnapshotsByUserId(userId: string): Promise<SnapshotWithTotal[]> {
  const result = await pool.query<SnapshotWithTotal>(
    `SELECT s.id, s.month, s.created_at,
            COALESCE(SUM(e.amount), 0) AS total
     FROM snapshots s
     LEFT JOIN snapshot_entries e ON e.snapshot_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id
     ORDER BY s.month DESC`,
    [userId]
  );
  return result.rows;
}

export async function findSnapshotById(
  id: string,
  userId: string
): Promise<SnapshotWithEntries | null> {
  const snapshotResult = await pool.query<Snapshot>(
    "SELECT * FROM snapshots WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  const snapshot = snapshotResult.rows[0];
  if (!snapshot) return null;

  const entriesResult = await pool.query<SnapshotEntry>(
    "SELECT * FROM snapshot_entries WHERE snapshot_id = $1",
    [id]
  );

  return {
    id: snapshot.id,
    month: snapshot.month,
    created_at: snapshot.created_at,
    entries: entriesResult.rows,
  };
}

export async function findLatestSnapshot(userId: string): Promise<SnapshotWithEntries | null> {
  const snapshotResult = await pool.query<Snapshot>(
    "SELECT * FROM snapshots WHERE user_id = $1 ORDER BY month DESC LIMIT 1",
    [userId]
  );
  const snapshot = snapshotResult.rows[0];
  if (!snapshot) return null;

  const entriesResult = await pool.query<SnapshotEntry>(
    "SELECT * FROM snapshot_entries WHERE snapshot_id = $1",
    [snapshot.id]
  );

  return {
    id: snapshot.id,
    month: snapshot.month,
    created_at: snapshot.created_at,
    entries: entriesResult.rows,
  };
}

export async function createSnapshot(params: {
  user_id: string;
  month: Date;
  entries: { service_id: string; amount: number }[];
}): Promise<SnapshotWithEntries> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const snapshotResult = await client.query<Snapshot>(
      "INSERT INTO snapshots (user_id, month) VALUES ($1, $2) RETURNING *",
      [params.user_id, params.month]
    );
    const snapshot = snapshotResult.rows[0];

    const entries: SnapshotEntry[] = [];
    for (const entry of params.entries) {
      const entryResult = await client.query<SnapshotEntry>(
        "INSERT INTO snapshot_entries (snapshot_id, service_id, amount) VALUES ($1, $2, $3) RETURNING *",
        [snapshot.id, entry.service_id, entry.amount]
      );
      entries.push(entryResult.rows[0]);
    }

    await client.query("COMMIT");
    return {
      id: snapshot.id,
      month: snapshot.month,
      created_at: snapshot.created_at,
      entries,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateSnapshot(
  id: string,
  userId: string,
  entries: { service_id: string; amount: number }[]
): Promise<SnapshotWithEntries | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const snapshotResult = await client.query<Snapshot>(
      "SELECT * FROM snapshots WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    const snapshot = snapshotResult.rows[0];
    if (!snapshot) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("DELETE FROM snapshot_entries WHERE snapshot_id = $1", [id]);

    const newEntries: SnapshotEntry[] = [];
    for (const entry of entries) {
      const entryResult = await client.query<SnapshotEntry>(
        "INSERT INTO snapshot_entries (snapshot_id, service_id, amount) VALUES ($1, $2, $3) RETURNING *",
        [id, entry.service_id, entry.amount]
      );
      newEntries.push(entryResult.rows[0]);
    }

    await client.query("COMMIT");
    return {
      id: snapshot.id,
      month: snapshot.month,
      created_at: snapshot.created_at,
      entries: newEntries,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteSnapshot(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM snapshots WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
```

- [ ] **Step 2: Update database index**

Replace `packages/database/index.ts`:

```typescript
export { pool } from "./pool";
export * from "./users";
export * from "./oauth-accounts";
export * from "./sessions";
export * from "./services";
export * from "./snapshots";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/database && bunx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add packages/database/snapshots/ packages/database/index.ts
git commit -m "feat: add snapshots database query module with transactions"
```

---

### Task 5: Services API routes

**Files:**
- Create: `apps/core/src/api/services.ts`

- [ ] **Step 1: Create services API**

Create `apps/core/src/api/services.ts`:

```typescript
import { Elysia } from "elysia";
import {
  findServicesByUserId,
  createService,
  updateService,
  deleteService,
} from "@database";
import { resolveUser } from "../auth/session";

export const servicesApi = new Elysia({ prefix: "/api/services" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .get("/", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return findServicesByUserId(user.id);
  })
  .post("/", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { name, parent_id } = body as { name: string; parent_id: string | null };
    if (!name || typeof name !== "string") {
      set.status = 400;
      return { error: "name is required" };
    }
    return createService({
      user_id: user.id,
      name,
      parent_id: parent_id ?? null,
    });
  })
  .put("/:id", async ({ user, set, params, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const updates = body as { name?: string; parent_id?: string | null; sort_order?: number };
    const result = await updateService(params.id, user.id, updates);
    if (!result) {
      set.status = 404;
      return { error: "Service not found" };
    }
    return result;
  })
  .delete("/:id", async ({ user, set, params }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const deleted = await deleteService(params.id, user.id);
    if (!deleted) {
      set.status = 404;
      return { error: "Service not found" };
    }
    return { success: true };
  });
```

- [ ] **Step 2: Commit**

```bash
git add apps/core/src/api/services.ts
git commit -m "feat: add services CRUD API routes"
```

---

### Task 6: Snapshots API routes

**Files:**
- Create: `apps/core/src/api/snapshots.ts`

- [ ] **Step 1: Create snapshots API**

Create `apps/core/src/api/snapshots.ts`:

```typescript
import { Elysia } from "elysia";
import {
  findSnapshotsByUserId,
  findSnapshotById,
  findLatestSnapshot,
  createSnapshot,
  updateSnapshot,
  deleteSnapshot,
} from "@database";
import { resolveUser } from "../auth/session";

export const snapshotsApi = new Elysia({ prefix: "/api/snapshots" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .get("/", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return findSnapshotsByUserId(user.id);
  })
  .get("/latest", async ({ user, set }) => {
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
  })
  .get("/:id", async ({ user, set, params }) => {
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
  })
  .post("/", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { month, entries } = body as {
      month: string;
      entries: { service_id: string; amount: number }[];
    };
    if (!month || !entries) {
      set.status = 400;
      return { error: "month and entries are required" };
    }
    try {
      return await createSnapshot({
        user_id: user.id,
        month: new Date(month),
        entries,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("unique")) {
        set.status = 409;
        return { error: "Snapshot already exists for this month" };
      }
      throw err;
    }
  })
  .put("/:id", async ({ user, set, params, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { entries } = body as {
      entries: { service_id: string; amount: number }[];
    };
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
  })
  .delete("/:id", async ({ user, set, params }) => {
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
  });
```

- [ ] **Step 2: Commit**

```bash
git add apps/core/src/api/snapshots.ts
git commit -m "feat: add snapshots CRUD API routes with transaction support"
```

---

### Task 7: Mount API routes on app

**Files:**
- Create: `apps/core/src/api/index.ts`
- Modify: `apps/core/src/index.ts`

- [ ] **Step 1: Create API plugin**

Create `apps/core/src/api/index.ts`:

```typescript
import { Elysia } from "elysia";
import { servicesApi } from "./services";
import { snapshotsApi } from "./snapshots";

export const api = new Elysia({ name: "api" })
  .use(servicesApi)
  .use(snapshotsApi);
```

- [ ] **Step 2: Mount on main app**

Replace `apps/core/src/index.ts`:

```typescript
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import config from "@config";
import { auth } from "./auth";
import { api } from "./api";

const app = new Elysia()
  .use(cors({
    origin: config.get("frontendUrl"),
    credentials: true,
  }))
  .use(auth)
  .use(api)
  .get("/", () => "Hello Elysia")
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
```

- [ ] **Step 3: Verify the backend starts**

```bash
cd apps/core && bun run dev
```

Expected: Server starts without errors. Test with curl:

```bash
curl -v http://localhost:3000/api/services
```

Expected: 401 Unauthorized (no session cookie).

- [ ] **Step 4: Commit**

```bash
git add apps/core/src/api/ apps/core/src/index.ts
git commit -m "feat: mount services and snapshots API on main app"
```

---

### Task 8: Shared API instance for frontend

**Files:**
- Create: `apps/frontend/src/lib/api.ts`
- Modify: `apps/frontend/src/hooks/AuthContext.tsx`

- [ ] **Step 1: Create shared API instance**

Create `apps/frontend/src/lib/api.ts`:

```typescript
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});
```

- [ ] **Step 2: Update AuthContext to use shared instance**

Replace `apps/frontend/src/hooks/AuthContext.tsx`:

```tsx
import { createContext, useState, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<User>("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext value={{ user, loading, login, logout }}>
      {children}
    </AuthContext>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/lib/api.ts apps/frontend/src/hooks/AuthContext.tsx
git commit -m "refactor(frontend): extract shared axios API instance"
```

---

### Task 9: Frontend data hooks

**Files:**
- Create: `apps/frontend/src/hooks/useServices.ts`
- Create: `apps/frontend/src/hooks/useSnapshots.ts`

- [ ] **Step 1: Create useServices hook**

Create `apps/frontend/src/hooks/useServices.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export interface Service {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

export interface ServiceTree {
  service: Service;
  children: Service[];
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<Service[]>("/api/services");
      setServices(res.data);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const tree: ServiceTree[] = services
    .filter((s) => s.parent_id === null)
    .map((parent) => ({
      service: parent,
      children: services
        .filter((s) => s.parent_id === parent.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));

  const addService = async (name: string, parentId: string | null) => {
    const res = await api.post<Service>("/api/services", { name, parent_id: parentId });
    setServices((prev) => [...prev, res.data]);
    return res.data;
  };

  const removeService = async (id: string) => {
    await api.delete(`/api/services/${id}`);
    setServices((prev) => prev.filter((s) => s.id !== id && s.parent_id !== id));
  };

  const editService = async (id: string, name: string) => {
    const res = await api.put<Service>(`/api/services/${id}`, { name });
    setServices((prev) => prev.map((s) => (s.id === res.data.id ? res.data : s)));
    return res.data;
  };

  return { services, tree, loading, addService, removeService, editService, refetch: fetch };
}
```

- [ ] **Step 2: Create useSnapshots hook**

Create `apps/frontend/src/hooks/useSnapshots.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export interface SnapshotSummary {
  id: string;
  month: string;
  total: string;
  created_at: string;
}

export interface SnapshotEntry {
  id: string;
  service_id: string;
  amount: string;
}

export interface SnapshotDetail {
  id: string;
  month: string;
  created_at: string;
  entries: SnapshotEntry[];
}

export function useSnapshots() {
  const [summaries, setSummaries] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<SnapshotSummary[]>("/api/snapshots");
      setSummaries(res.data);
    } catch {
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const getSnapshot = async (id: string): Promise<SnapshotDetail> => {
    const res = await api.get<SnapshotDetail>(`/api/snapshots/${id}`);
    return res.data;
  };

  const getLatest = async (): Promise<SnapshotDetail | null> => {
    try {
      const res = await api.get<SnapshotDetail>("/api/snapshots/latest");
      return res.data;
    } catch {
      return null;
    }
  };

  const createSnapshot = async (month: string, entries: { service_id: string; amount: number }[]) => {
    const res = await api.post<SnapshotDetail>("/api/snapshots", { month, entries });
    await fetch(); // refresh summaries
    return res.data;
  };

  const updateSnapshot = async (id: string, entries: { service_id: string; amount: number }[]) => {
    const res = await api.put<SnapshotDetail>(`/api/snapshots/${id}`, { entries });
    await fetch();
    return res.data;
  };

  const removeSnapshot = async (id: string) => {
    await api.delete(`/api/snapshots/${id}`);
    await fetch();
  };

  return { summaries, loading, getSnapshot, getLatest, createSnapshot, updateSnapshot, removeSnapshot, refetch: fetch };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/hooks/useServices.ts apps/frontend/src/hooks/useSnapshots.ts
git commit -m "feat(frontend): add useServices and useSnapshots data hooks"
```

---

### Task 10: Dashboard page with monthly totals table

**Files:**
- Modify: `apps/frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Replace DashboardPage**

Replace `apps/frontend/src/pages/DashboardPage.tsx`:

```tsx
import { useAuth } from "@/hooks/useAuth";
import { useSnapshots } from "@/hooks/useSnapshots";
import { Card, CardContent } from "@/components/ui/card";

function formatMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function formatAmount(value: string | number): string {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function DashboardPage() {
  const { user } = useAuth();
  const { summaries, loading } = useSnapshots();

  const latest = summaries[0];
  const previous = summaries[1];
  const change = latest && previous
    ? Number(latest.total) - Number(previous.total)
    : null;
  const changePercent = change !== null && previous
    ? (change / Number(previous.total)) * 100
    : null;

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back, {user?.name ?? "there"}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Total Assets
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {latest ? `€${formatAmount(latest.total)}` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Monthly Change
            </p>
            <p className={`mt-1 text-2xl font-bold ${change !== null ? (change >= 0 ? "text-green-600" : "text-red-500") : "text-foreground"}`}>
              {change !== null
                ? `${change >= 0 ? "+" : ""}€${formatAmount(Math.abs(change))}`
                : "—"}
            </p>
            {changePercent !== null && (
              <p className={`text-xs ${changePercent >= 0 ? "text-green-600" : "text-red-500"}`}>
                {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Months Tracked
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {summaries.length || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No snapshots yet. Go to Assets to create your first snapshot.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Month</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Total</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((snapshot, i) => {
                  const prev = summaries[i + 1];
                  const diff = prev ? Number(snapshot.total) - Number(prev.total) : null;
                  return (
                    <tr key={snapshot.id} className="border-b last:border-0">
                      <td className="py-2.5">{formatMonth(snapshot.month)}</td>
                      <td className="py-2.5 text-right font-medium">
                        €{formatAmount(snapshot.total)}
                      </td>
                      <td className={`py-2.5 text-right ${diff !== null ? (diff >= 0 ? "text-green-600" : "text-red-500") : ""}`}>
                        {diff !== null
                          ? `${diff >= 0 ? "+" : ""}€${formatAmount(Math.abs(diff))}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/DashboardPage.tsx
git commit -m "feat(frontend): dashboard with monthly totals table and stat cards"
```

---

### Task 11: Service manager component

**Files:**
- Create: `apps/frontend/src/components/ServiceManager.tsx`

- [ ] **Step 1: Create ServiceManager**

Create `apps/frontend/src/components/ServiceManager.tsx`:

```tsx
import { useState } from "react";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ServiceTree } from "@/hooks/useServices";

interface ServiceManagerProps {
  tree: ServiceTree[];
  onAdd: (name: string, parentId: string | null) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onEdit: (id: string, name: string) => Promise<void>;
  onClose: () => void;
}

export function ServiceManager({ tree, onAdd, onRemove, onEdit, onClose }: ServiceManagerProps) {
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await onAdd(newName.trim(), newParentId);
    setNewName("");
    setNewParentId(null);
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    await onEdit(id, editName.trim());
    setEditingId(null);
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Manage Services</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>Done</Button>
        </div>

        {/* Existing services */}
        <div className="space-y-1 mb-4">
          {tree.map((group) => (
            <div key={group.service.id}>
              {/* Top-level service */}
              <div className="flex items-center gap-2 py-1.5">
                {editingId === group.service.id ? (
                  <>
                    <input
                      className="flex-1 text-sm border rounded px-2 py-1 bg-background"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEdit(group.service.id)}
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(group.service.id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{group.service.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => startEdit(group.service.id, group.service.name)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => onRemove(group.service.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
              {/* Children */}
              {group.children.map((child) => (
                <div key={child.id} className="flex items-center gap-2 py-1.5 pl-6">
                  {editingId === child.id ? (
                    <>
                      <input
                        className="flex-1 text-sm border rounded px-2 py-1 bg-background"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleEdit(child.id)}
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(child.id)}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-muted-foreground">{child.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => startEdit(child.id, child.name)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => onRemove(child.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Add new service */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <input
            className="flex-1 text-sm border rounded px-2 py-1.5 bg-background"
            placeholder="Service name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <select
            className="text-sm border rounded px-2 py-1.5 bg-background"
            value={newParentId ?? ""}
            onChange={(e) => setNewParentId(e.target.value || null)}
          >
            <option value="">Top level</option>
            {tree.map((g) => (
              <option key={g.service.id} value={g.service.id}>
                ↳ {g.service.name}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/ServiceManager.tsx
git commit -m "feat(frontend): add ServiceManager component for CRUD operations"
```

---

### Task 12: Snapshot form component

**Files:**
- Create: `apps/frontend/src/components/SnapshotForm.tsx`

- [ ] **Step 1: Create SnapshotForm**

Create `apps/frontend/src/components/SnapshotForm.tsx`:

```tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ServiceTree } from "@/hooks/useServices";
import type { SnapshotDetail } from "@/hooks/useSnapshots";

interface SnapshotFormProps {
  /** Pre-selected month in YYYY-MM-DD format (first of month) */
  month: string;
  /** Previous snapshot to prefill amounts from */
  prefill: SnapshotDetail | null;
  /** Service tree for grouping inputs */
  tree: ServiceTree[];
  /** Existing snapshot being edited (null for new) */
  existing: SnapshotDetail | null;
  onSave: (month: string, entries: { service_id: string; amount: number }[]) => Promise<void>;
  onCancel: () => void;
}

export function SnapshotForm({ month, prefill, tree, existing, onSave, onCancel }: SnapshotFormProps) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial: Record<string, string> = {};
    // Start from prefill (previous month)
    if (prefill) {
      for (const entry of prefill.entries) {
        initial[entry.service_id] = entry.amount;
      }
    }
    // Override with existing if editing
    if (existing) {
      for (const entry of existing.entries) {
        initial[entry.service_id] = entry.amount;
      }
    }
    setAmounts(initial);
  }, [prefill, existing]);

  const setAmount = (serviceId: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [serviceId]: value }));
  };

  const allServiceIds = tree.flatMap((g) =>
    g.children.length > 0
      ? g.children.map((c) => c.id)
      : [g.service.id]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = allServiceIds.map((id) => ({
        service_id: id,
        amount: parseFloat(amounts[id] || "0") || 0,
      }));
      await onSave(month, entries);
    } finally {
      setSaving(false);
    }
  };

  const formatMonth = new Date(month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            {existing ? "Edit" : "New"} Snapshot — {formatMonth}
          </h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {tree.map((group) => (
            <div key={group.service.id}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {group.service.name}
              </p>
              {group.children.length > 0 ? (
                <div className="space-y-2">
                  {group.children.map((child) => (
                    <div key={child.id} className="flex items-center gap-3">
                      <label className="w-32 text-sm text-foreground truncate">{child.name}</label>
                      <input
                        type="number"
                        className="flex-1 text-sm border rounded px-3 py-1.5 bg-background"
                        value={amounts[child.id] ?? ""}
                        onChange={(e) => setAmount(child.id, e.target.value)}
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="w-32 text-sm text-foreground truncate">{group.service.name}</label>
                  <input
                    type="number"
                    className="flex-1 text-sm border rounded px-3 py-1.5 bg-background"
                    value={amounts[group.service.id] ?? ""}
                    onChange={(e) => setAmount(group.service.id, e.target.value)}
                    placeholder="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/SnapshotForm.tsx
git commit -m "feat(frontend): add SnapshotForm with previous month prefill"
```

---

### Task 13: Assets page with month navigation and grouped cards

**Files:**
- Modify: `apps/frontend/src/pages/AssetsPage.tsx`

- [ ] **Step 1: Replace AssetsPage**

Replace `apps/frontend/src/pages/AssetsPage.tsx`:

```tsx
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Pencil, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useServices } from "@/hooks/useServices";
import { useSnapshots, type SnapshotDetail } from "@/hooks/useSnapshots";
import { SnapshotForm } from "@/components/SnapshotForm";
import { ServiceManager } from "@/components/ServiceManager";

function formatMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatAmount(value: string | number): string {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function AssetsPage() {
  const { tree, addService, removeService, editService, refetch: refetchServices } = useServices();
  const { summaries, loading, getSnapshot, getLatest, createSnapshot, updateSnapshot } = useSnapshots();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [detail, setDetail] = useState<SnapshotDetail | null>(null);
  const [prevDetail, setPrevDetail] = useState<SnapshotDetail | null>(null);
  const [mode, setMode] = useState<"view" | "form" | "services">("view");
  const [editingSnapshot, setEditingSnapshot] = useState<SnapshotDetail | null>(null);

  const currentSummary = summaries[currentIndex];
  const prevSummary = summaries[currentIndex + 1];

  // Load snapshot detail when currentIndex changes
  const loadDetail = useCallback(async () => {
    if (!currentSummary) {
      setDetail(null);
      return;
    }
    const d = await getSnapshot(currentSummary.id);
    setDetail(d);
  }, [currentSummary, getSnapshot]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  // Load prev detail for change calculation
  useEffect(() => {
    if (!prevSummary) {
      setPrevDetail(null);
      return;
    }
    getSnapshot(prevSummary.id).then(setPrevDetail);
  }, [prevSummary, getSnapshot]);

  const handleSave = async (month: string, entries: { service_id: string; amount: number }[]) => {
    if (editingSnapshot) {
      await updateSnapshot(editingSnapshot.id, entries);
    } else {
      await createSnapshot(month, entries);
    }
    setMode("view");
    setEditingSnapshot(null);
    setCurrentIndex(0);
    // Reload detail after save
    setTimeout(loadDetail, 100);
  };

  const handleNewSnapshot = () => {
    setEditingSnapshot(null);
    setMode("form");
  };

  const handleEditSnapshot = () => {
    setEditingSnapshot(detail);
    setMode("form");
  };

  const handleServicesClose = () => {
    setMode("view");
    refetchServices();
  };

  const change = currentSummary && prevSummary
    ? Number(currentSummary.total) - Number(prevSummary.total)
    : null;

  const newSnapshotMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  };

  if (mode === "services") {
    return (
      <div>
        <h1 className="text-xl font-bold text-foreground">Assets</h1>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Manage your services</p>
        <ServiceManager
          tree={tree}
          onAdd={async (name, parentId) => { await addService(name, parentId); }}
          onRemove={removeService}
          onEdit={editService}
          onClose={handleServicesClose}
        />
      </div>
    );
  }

  if (mode === "form") {
    return (
      <div>
        <h1 className="text-xl font-bold text-foreground">Assets</h1>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          {editingSnapshot ? "Edit snapshot" : "Create new snapshot"}
        </p>
        <SnapshotForm
          month={editingSnapshot ? editingSnapshot.month : newSnapshotMonth()}
          prefill={detail}
          tree={tree}
          existing={editingSnapshot}
          onSave={handleSave}
          onCancel={() => { setMode("view"); setEditingSnapshot(null); }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track your investment portfolio</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMode("services")}>
            <Settings className="h-4 w-4" />
          </Button>
          {detail && (
            <Button variant="ghost" size="sm" onClick={handleEditSnapshot}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          )}
          <Button size="sm" onClick={handleNewSnapshot}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Snapshot
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground text-center">Loading...</p>
      ) : summaries.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-muted-foreground">No snapshots yet</p>
            <Button size="sm" onClick={handleNewSnapshot}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create First Snapshot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Month navigation */}
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentIndex >= summaries.length - 1}
              onClick={() => setCurrentIndex((i) => i + 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                {formatMonth(currentSummary.month)}
              </p>
              <p className="text-sm text-muted-foreground">
                Total: €{formatAmount(currentSummary.total)}
                {change !== null && (
                  <span className={`ml-2 ${change >= 0 ? "text-green-600" : "text-red-500"}`}>
                    ({change >= 0 ? "+" : ""}€{formatAmount(Math.abs(change))})
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentIndex <= 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Grouped service cards */}
          {detail && (
            <div className="mt-4 grid gap-3">
              {tree.map((group) => {
                const childEntries = group.children.length > 0
                  ? group.children.map((child) => ({
                      name: child.name,
                      amount: detail.entries.find((e) => e.service_id === child.id)?.amount ?? "0",
                    }))
                  : [];
                const standaloneAmount = group.children.length === 0
                  ? detail.entries.find((e) => e.service_id === group.service.id)?.amount ?? "0"
                  : null;
                const subtotal = group.children.length > 0
                  ? childEntries.reduce((sum, e) => sum + Number(e.amount), 0)
                  : Number(standaloneAmount);

                // Skip services with no entries
                if (subtotal === 0 && !detail.entries.some((e) =>
                  e.service_id === group.service.id || group.children.some((c) => c.id === e.service_id)
                )) {
                  return null;
                }

                return (
                  <Card key={group.service.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-foreground">{group.service.name}</p>
                        <p className="text-sm font-semibold text-foreground">
                          €{formatAmount(subtotal)}
                        </p>
                      </div>
                      {childEntries.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {childEntries.map((entry) => (
                            <div key={entry.name} className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground pl-3">{entry.name}</p>
                              <p className="text-sm text-muted-foreground">€{formatAmount(entry.amount)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/AssetsPage.tsx
git commit -m "feat(frontend): assets page with month navigation, grouped cards, and snapshot management"
```

---

### Task 14: End-to-end verification

- [ ] **Step 1: Start both servers**

Terminal 1:
```bash
cd apps/core && bun run dev
```

Terminal 2:
```bash
cd apps/frontend && bun run dev
```

- [ ] **Step 2: Test service management**

1. Log in via Google OAuth
2. Navigate to Assets page
3. Click Settings gear icon
4. Add services: "Revolut" (top level), "Invest" (under Revolut), "Crypto" (under Revolut), "Bybit" (top level), "Safepal" (top level)
5. Verify services appear correctly in the list with hierarchy

- [ ] **Step 3: Test snapshot creation**

1. Click "New Snapshot" on Assets page
2. Form should appear with current month, all services listed grouped by parent
3. Enter amounts for each service
4. Click Save
5. Verify snapshot appears with grouped cards showing amounts

- [ ] **Step 4: Test month navigation**

1. Create a second snapshot for a different month
2. Use prev/next arrows to navigate between months
3. Verify totals and change amounts display correctly

- [ ] **Step 5: Test dashboard**

1. Navigate to Dashboard
2. Verify stat cards show latest total, monthly change, months tracked
3. Verify table shows all months with totals and changes
4. Verify green/red coloring for positive/negative changes

- [ ] **Step 6: Test snapshot editing**

1. Navigate to Assets, click Edit on current snapshot
2. Change an amount, save
3. Verify updated amount shows in the card view

- [ ] **Step 7: Fix any issues found, commit if needed**
