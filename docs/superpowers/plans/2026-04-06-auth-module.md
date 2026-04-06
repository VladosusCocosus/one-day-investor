# Auth Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth2 login with database-backed sessions to the Elysia app.

**Architecture:** Arctic handles the Google OAuth2 flow. Sessions are stored in PostgreSQL via the existing `@database` package. An Elysia plugin in `apps/core/src/auth/` owns all auth routes and session middleware.

**Tech Stack:** Arctic, Elysia, PostgreSQL (pg), convict, Bun

**Spec:** `docs/superpowers/specs/2026-04-06-auth-module-design.md`

---

## File Structure

```
packages/config/index.ts              — modify: add google + session env vars
.env                                  — modify: add google + session env vars

packages/database/
  migrations/1775510037059_initial-migration.sql  — modify: users, oauth_accounts, sessions tables
  users/index.ts                      — create: user queries (findById, findByEmail, create)
  oauth-accounts/index.ts             — create: oauth account queries (findByProvider, create)
  sessions/index.ts                   — create: session queries (create, findByToken, deleteByToken)
  index.ts                            — modify: re-export new modules

apps/core/
  package.json                        — modify: add arctic, @database dependencies
  src/auth/
    google.ts                         — create: Arctic config + Google OAuth routes
    session.ts                        — create: session middleware (resolve user from cookie)
    logout.ts                         — create: logout route
    index.ts                          — create: Elysia plugin combining all auth routes
  src/index.ts                        — modify: mount auth plugin
```

---

### Task 1: Database Migration — users, oauth_accounts, sessions tables

**Files:**
- Modify: `packages/database/migrations/1775510037059_initial-migration.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Up Migration

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Down Migration

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS oauth_accounts;
DROP TABLE IF EXISTS users;
DROP EXTENSION IF EXISTS "pgcrypto";
```

- [ ] **Step 2: Run the migration**

Run from `packages/database`:
```bash
cd packages/database && bun run migrate:up
```

Expected: Tables created successfully.

- [ ] **Step 3: Verify tables exist**

```bash
docker compose exec postgres psql -U postgres -d one_day_investor -c "\dt"
```

Expected: `users`, `oauth_accounts`, `sessions` tables listed.

- [ ] **Step 4: Commit**

```bash
git add packages/database/migrations/1775510037059_initial-migration.sql
git commit -m "feat: add users, oauth_accounts, sessions tables migration"
```

---

### Task 2: Database Queries — users

**Files:**
- Create: `packages/database/users/index.ts`
- Modify: `packages/database/index.ts`

- [ ] **Step 1: Create users query module**

Create `packages/database/users/index.ts`:

```ts
import { pool } from "../pool";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] ?? null;
}

export async function createUser(params: {
  email: string;
  name: string | null;
  avatar_url: string | null;
}): Promise<User> {
  const result = await pool.query<User>(
    "INSERT INTO users (email, name, avatar_url) VALUES ($1, $2, $3) RETURNING *",
    [params.email, params.name, params.avatar_url]
  );
  return result.rows[0];
}
```

- [ ] **Step 2: Update database index to re-export**

Modify `packages/database/index.ts`:

```ts
export { pool } from "./pool";
export * from "./users";
export * from "./oauth-accounts";
export * from "./sessions";
```

Note: `oauth-accounts` and `sessions` don't exist yet — they'll be added in the next tasks. The imports will fail until Tasks 3 and 4 are complete. If this blocks you, add the exports one at a time as each module is created.

- [ ] **Step 3: Commit**

```bash
git add packages/database/users/index.ts packages/database/index.ts
git commit -m "feat: add user database queries"
```

---

### Task 3: Database Queries — oauth_accounts

**Files:**
- Create: `packages/database/oauth-accounts/index.ts`

- [ ] **Step 1: Create oauth-accounts query module**

Create `packages/database/oauth-accounts/index.ts`:

```ts
import { pool } from "../pool";

export interface OAuthAccount {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  created_at: Date;
}

export async function findOAuthAccount(
  provider: string,
  providerUserId: string
): Promise<OAuthAccount | null> {
  const result = await pool.query<OAuthAccount>(
    "SELECT * FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2",
    [provider, providerUserId]
  );
  return result.rows[0] ?? null;
}

export async function createOAuthAccount(params: {
  user_id: string;
  provider: string;
  provider_user_id: string;
}): Promise<OAuthAccount> {
  const result = await pool.query<OAuthAccount>(
    "INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES ($1, $2, $3) RETURNING *",
    [params.user_id, params.provider, params.provider_user_id]
  );
  return result.rows[0];
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/database/oauth-accounts/index.ts
git commit -m "feat: add oauth_accounts database queries"
```

---

### Task 4: Database Queries — sessions

**Files:**
- Create: `packages/database/sessions/index.ts`

- [ ] **Step 1: Create sessions query module**

Create `packages/database/sessions/index.ts`:

```ts
import { pool } from "../pool";

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export async function createSession(params: {
  user_id: string;
  token: string;
  expires_at: Date;
}): Promise<Session> {
  const result = await pool.query<Session>(
    "INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *",
    [params.user_id, params.token, params.expires_at]
  );
  return result.rows[0];
}

export async function findSessionByToken(
  token: string
): Promise<Session | null> {
  const result = await pool.query<Session>(
    "SELECT * FROM sessions WHERE token = $1 AND expires_at > now()",
    [token]
  );
  return result.rows[0] ?? null;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
}
```

- [ ] **Step 2: Verify database index exports all modules**

At this point `packages/database/index.ts` should export all three modules. Verify it matches:

```ts
export { pool } from "./pool";
export * from "./users";
export * from "./oauth-accounts";
export * from "./sessions";
```

- [ ] **Step 3: Commit**

```bash
git add packages/database/sessions/index.ts packages/database/index.ts
git commit -m "feat: add session database queries"
```

---

### Task 5: Config — add Google OAuth and session env vars

**Files:**
- Modify: `packages/config/index.ts`
- Modify: `.env`

- [ ] **Step 1: Add Google and session config to convict schema**

Add the following properties to the convict schema object in `packages/config/index.ts`, after the `postgres` block:

```ts
  google: {
    clientId: {
      doc: "Google OAuth2 client ID",
      format: String,
      default: "",
      env: "GOOGLE_CLIENT_ID",
    },
    clientSecret: {
      doc: "Google OAuth2 client secret",
      format: String,
      default: "",
      env: "GOOGLE_CLIENT_SECRET",
      sensitive: true,
    },
    redirectUri: {
      doc: "Google OAuth2 redirect URI",
      format: String,
      default: "http://localhost:3000/auth/google/callback",
      env: "GOOGLE_REDIRECT_URI",
    },
  },
  session: {
    maxAge: {
      doc: "Session max age in seconds",
      format: "int",
      default: 2592000,
      env: "SESSION_MAX_AGE",
    },
  },
```

- [ ] **Step 2: Update .env**

Add to `.env`:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
SESSION_MAX_AGE=2592000
```

- [ ] **Step 3: Verify config loads**

```bash
bun run packages/config/index.ts
```

Expected: No errors (empty strings are valid defaults for client ID/secret during dev).

- [ ] **Step 4: Commit**

```bash
git add packages/config/index.ts .env
git commit -m "feat: add google oauth and session config"
```

---

### Task 6: Install dependencies for apps/core

**Files:**
- Modify: `apps/core/package.json`

- [ ] **Step 1: Add dependencies**

Run from project root:

```bash
cd apps/core && bun add arctic @database @config
```

This adds `arctic` for Google OAuth2 and workspace references to `@database` and `@config`.

- [ ] **Step 2: Commit**

```bash
git add apps/core/package.json ../../bun.lock
git commit -m "feat: add arctic, @database, @config deps to core"
```

---

### Task 7: Auth — Google OAuth routes

**Files:**
- Create: `apps/core/src/auth/google.ts`

- [ ] **Step 1: Create Google OAuth routes**

Create `apps/core/src/auth/google.ts`:

```ts
import { Elysia } from "elysia";
import { Google } from "arctic";
import config from "@config";
import {
  findOAuthAccount,
  createOAuthAccount,
  findUserById,
  findUserByEmail,
  createUser,
  createSession,
} from "@database";

const google = new Google(
  config.get("google.clientId"),
  config.get("google.clientSecret"),
  config.get("google.redirectUri")
);

export const googleAuth = new Elysia({ prefix: "/auth" })
  .get("/google", async ({ cookie, redirect }) => {
    const state = crypto.randomUUID();
    const codeVerifier = crypto.randomUUID();
    const scopes = ["openid", "email", "profile"];
    const url = google.createAuthorizationURL(state, codeVerifier, scopes);

    cookie.oauth_state.set({
      value: state,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    cookie.code_verifier.set({
      value: codeVerifier,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return redirect(url.toString());
  })
  .get("/google/callback", async ({ query, cookie, redirect, set }) => {
    const { code, state } = query;
    const storedState = cookie.oauth_state.value;
    const codeVerifier = cookie.code_verifier.value;

    if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
      set.status = 400;
      return { error: "Invalid OAuth callback" };
    }

    // Clear OAuth cookies
    cookie.oauth_state.remove();
    cookie.code_verifier.remove();

    // Exchange code for tokens
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    // Fetch Google user info
    const googleUserRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const googleUser = (await googleUserRes.json()) as {
      sub: string;
      email: string;
      name: string;
      picture: string;
    };

    // Find or create user
    let oauthAccount = await findOAuthAccount("google", googleUser.sub);
    let userId: string;

    if (oauthAccount) {
      userId = oauthAccount.user_id;
    } else {
      let user = await findUserByEmail(googleUser.email);
      if (!user) {
        user = await createUser({
          email: googleUser.email,
          name: googleUser.name,
          avatar_url: googleUser.picture,
        });
      }
      await createOAuthAccount({
        user_id: user.id,
        provider: "google",
        provider_user_id: googleUser.sub,
      });
      userId = user.id;
    }

    // Create session
    const sessionMaxAge = config.get("session.maxAge");
    const expiresAt = new Date(Date.now() + sessionMaxAge * 1000);
    const token = crypto.randomUUID();
    await createSession({ user_id: userId, token, expires_at: expiresAt });

    cookie.session.set({
      value: token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAge,
    });

    return redirect("/");
  });
```

- [ ] **Step 2: Commit**

```bash
git add apps/core/src/auth/google.ts
git commit -m "feat: add google oauth routes with arctic"
```

---

### Task 8: Auth — Session middleware

**Files:**
- Create: `apps/core/src/auth/session.ts`

- [ ] **Step 1: Create session middleware**

Create `apps/core/src/auth/session.ts`:

```ts
import { Elysia } from "elysia";
import { findSessionByToken, findUserById, type User } from "@database";

export const sessionMiddleware = new Elysia({ name: "session" }).derive(
  async ({ cookie }): Promise<{ user: User | null }> => {
    const token = cookie.session?.value;
    if (!token) {
      return { user: null };
    }

    const session = await findSessionByToken(token);
    if (!session) {
      return { user: null };
    }

    const user = await findUserById(session.user_id);
    return { user };
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/core/src/auth/session.ts
git commit -m "feat: add session middleware"
```

---

### Task 9: Auth — Logout route and /auth/me

**Files:**
- Create: `apps/core/src/auth/logout.ts`

- [ ] **Step 1: Create logout and me routes**

Create `apps/core/src/auth/logout.ts`:

```ts
import { Elysia } from "elysia";
import { deleteSessionByToken } from "@database";
import { sessionMiddleware } from "./session";

export const logoutRoute = new Elysia({ prefix: "/auth" })
  .use(sessionMiddleware)
  .post("/logout", async ({ cookie, user, set }) => {
    const token = cookie.session?.value;
    if (token) {
      await deleteSessionByToken(token);
      cookie.session.remove();
    }
    set.status = 200;
    return { success: true };
  })
  .get("/me", ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
    };
  });
```

- [ ] **Step 2: Commit**

```bash
git add apps/core/src/auth/logout.ts
git commit -m "feat: add logout and /auth/me routes"
```

---

### Task 10: Auth — Plugin index and mount on Elysia app

**Files:**
- Create: `apps/core/src/auth/index.ts`
- Modify: `apps/core/src/index.ts`

- [ ] **Step 1: Create auth plugin index**

Create `apps/core/src/auth/index.ts`:

```ts
import { Elysia } from "elysia";
import { googleAuth } from "./google";
import { logoutRoute } from "./logout";
import { sessionMiddleware } from "./session";

export const auth = new Elysia({ name: "auth" })
  .use(sessionMiddleware)
  .use(googleAuth)
  .use(logoutRoute);
```

- [ ] **Step 2: Mount auth plugin in the app**

Replace `apps/core/src/index.ts` with:

```ts
import { Elysia } from "elysia";
import { auth } from "./auth";

const app = new Elysia()
  .use(auth)
  .get("/", () => "Hello Elysia")
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
```

- [ ] **Step 3: Verify it compiles**

```bash
cd apps/core && bun build src/index.ts --no-bundle 2>&1 | head -5
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/core/src/auth/index.ts apps/core/src/index.ts
git commit -m "feat: mount auth plugin on elysia app"
```

---

### Task 11: Smoke test — verify the full flow compiles and starts

- [ ] **Step 1: Ensure Postgres is running**

```bash
docker compose up -d
```

- [ ] **Step 2: Run the migration**

```bash
cd packages/database && bun run migrate:up
```

- [ ] **Step 3: Start the app**

```bash
cd apps/core && bun run dev &
sleep 2
```

- [ ] **Step 4: Test /auth/me returns 401**

```bash
curl -s http://localhost:3000/auth/me
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 5: Test /auth/google redirects**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/google
```

Expected: `302` (redirect to Google). Note: full flow requires valid Google OAuth credentials.

- [ ] **Step 6: Stop dev server and commit**

```bash
kill %1
git add -A
git commit -m "feat: auth module complete — google oauth, sessions, middleware"
```
