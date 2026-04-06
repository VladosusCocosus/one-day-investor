# Auth Module Design

## Overview

Authentication module for one-day-investor using Google OAuth2 (via Arctic) with database-backed sessions. Designed for multi-provider support — users and OAuth accounts are separate, so adding providers later is trivial.

## Database Schema

### users

| Column     | Type        | Constraints                    |
|------------|-------------|--------------------------------|
| id         | UUID        | PRIMARY KEY, gen_random_uuid() |
| email      | TEXT        | UNIQUE NOT NULL                |
| name       | TEXT        |                                |
| avatar_url | TEXT        |                                |
| created_at | TIMESTAMPTZ | DEFAULT now()                  |
| updated_at | TIMESTAMPTZ | DEFAULT now()                  |

### oauth_accounts

| Column           | Type        | Constraints                          |
|------------------|-------------|--------------------------------------|
| id               | UUID        | PRIMARY KEY, gen_random_uuid()       |
| user_id          | UUID        | REFERENCES users ON DELETE CASCADE   |
| provider         | TEXT        | NOT NULL                             |
| provider_user_id | TEXT        | NOT NULL                             |
| created_at       | TIMESTAMPTZ | DEFAULT now()                        |

- UNIQUE(provider, provider_user_id)

### sessions

| Column     | Type        | Constraints                        |
|------------|-------------|------------------------------------|
| id         | UUID        | PRIMARY KEY, gen_random_uuid()     |
| user_id    | UUID        | REFERENCES users ON DELETE CASCADE |
| token      | TEXT        | UNIQUE NOT NULL                    |
| expires_at | TIMESTAMPTZ | NOT NULL                           |
| created_at | TIMESTAMPTZ | DEFAULT now()                      |

## File Structure

```
apps/core/src/
  auth/
    index.ts          — Elysia plugin grouping all auth routes
    google.ts         — Arctic Google config, /auth/google + /auth/google/callback
    session.ts        — session middleware (resolve user from cookie per request)
    logout.ts         — POST /auth/logout

packages/database/
  migrations/1775510037059_initial-migration.sql
  users/index.ts
  oauth-accounts/index.ts
  sessions/index.ts
```

## Auth Flow

1. `GET /auth/google` — Arctic creates authorization URL with state + PKCE, redirects to Google.
2. `GET /auth/google/callback` — Arctic exchanges code for tokens, fetches user info from Google's userinfo endpoint.
3. Lookup `oauth_accounts` by (google, provider_user_id). If not found, create `users` + `oauth_accounts` rows. If found, fetch existing user.
4. Create `sessions` row with random token. Set HTTP-only cookie. Redirect to frontend.
5. Session middleware on every request: read cookie → find session by token → if valid and not expired, attach user to Elysia context.
6. `POST /auth/logout` — delete session row, clear cookie.
7. `GET /auth/me` — return user from context, or 401.

## Endpoints

| Method | Path                     | Description                        | Auth Required |
|--------|--------------------------|------------------------------------|---------------|
| GET    | /auth/google             | Redirect to Google OAuth           | No            |
| GET    | /auth/google/callback    | Handle OAuth callback              | No            |
| POST   | /auth/logout             | Destroy session                    | Yes           |
| GET    | /auth/me                 | Return current user                | Yes           |

## Dependencies

- `arctic` — Google OAuth2 helper (lightweight, by Lucia's author)
- Session token: `crypto.randomUUID()`
- Google user info: `https://openidconnect.googleapis.com/v1/userinfo`

## Configuration

New env vars added to `packages/config` convict schema and `.env`:

| Variable             | Default                                        |
|----------------------|------------------------------------------------|
| GOOGLE_CLIENT_ID     | (required)                                     |
| GOOGLE_CLIENT_SECRET | (required)                                     |
| GOOGLE_REDIRECT_URI  | http://localhost:3000/auth/google/callback      |
| SESSION_MAX_AGE      | 2592000 (30 days in seconds)                   |

## Security

- HTTP-only, SameSite=Lax, Secure (in production) cookies
- PKCE for OAuth2 flow
- State parameter validated on callback to prevent CSRF
- Session tokens are opaque random UUIDs (not predictable)
- Expired sessions rejected by middleware
