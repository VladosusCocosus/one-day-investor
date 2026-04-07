# Deployment Design: Hetzner Single-Server with Docker Compose

## Overview

Deploy the one-day-investor monorepo to a single Hetzner Ubuntu server using Docker Compose for services and host-level nginx + Certbot for SSL termination and reverse proxying.

## Architecture

```
Internet → Nginx (host, ports 80/443)
              ├── /api/*  → core:3000  (Docker, internal network)
              └── /*      → frontend:8080 (Docker, internal network)

PostgreSQL 16 (Docker, port 5432, internal network only)
```

All three Docker services share an internal bridge network. Only the host nginx is exposed to the internet.

## Docker Services

### db (PostgreSQL 16)

- Image: `postgres:16-alpine`
- Volume: `pgdata:/var/lib/postgresql/data` (named volume, persists across rebuilds)
- Internal network only — no port binding on host
- Configured via environment variables: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- Healthcheck: `pg_isready`

### core (Bun/Elysia backend)

- Custom `Dockerfile.core` — multi-stage build:
  1. `bun install` workspace dependencies
  2. Copy source
  3. `CMD ["bun", "run", "apps/core/src/index.ts"]`
- Exposes port 3000 on internal network
- Depends on: db (with healthcheck condition)
- Environment variables passed from `.env` file on server:
  - `POSTGRES_HOST=db` (Docker service name)
  - `POSTGRES_PORT=5432`
  - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - `FRONTEND_URL` (production domain with https)
  - `SESSION_MAX_AGE`

### frontend (Vite SPA served by nginx)

- Custom `Dockerfile.frontend` — multi-stage build:
  1. `bun install` workspace dependencies
  2. `VITE_API_URL` set as build arg → `bun run --cwd apps/frontend build`
  3. Copy `apps/frontend/dist/` into `nginx:alpine` image
  4. Custom nginx config for SPA routing (all paths → `index.html`)
- Exposes port 8080 on internal network

## Host-Level Nginx

Installed via `apt` on the Ubuntu host. Certbot handles SSL certificates via Let's Encrypt.

**Site config** (`/etc/nginx/sites-available/app`):

- Listens on 443 with SSL (Certbot-managed certs)
- Redirects HTTP 80 → HTTPS
- `location /api/` → `proxy_pass http://127.0.0.1:3000/` (strip `/api` prefix)
- `location /` → `proxy_pass http://127.0.0.1:8080/`
- Standard proxy headers: `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`
- WebSocket support headers for future use

Note: Docker Compose maps `core:3000 → 127.0.0.1:3000` and `frontend:8080 → 127.0.0.1:8080` on the host so nginx can reach them.

## Database Migrations

Migrations run as a one-off Docker command after build, before restarting services:

```sh
docker compose run --rm core bun run node-pg-migrate up \
  --database-url-var=DATABASE_URL \
  --migrations-dir=packages/database/migrations
```

This uses the same core image (which has all dependencies) to execute migrations.

## Environment Variables

Stored in `.env` on the server root of the project. Git-ignored.

Required variables:
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `FRONTEND_URL` (e.g., `https://yourdomain.com`)
- `VITE_API_URL` (e.g., `https://yourdomain.com/api`)
- `SESSION_MAX_AGE` (default: 2592000)

## CI/CD: GitHub Actions

**Trigger**: Push to `main` branch.

**Workflow** (`.github/workflows/deploy.yml`):

1. SSH into server using secrets (`SSH_HOST`, `SSH_USER`, `SSH_KEY`)
2. `cd /opt/one-day-investor && git pull origin main`
3. `docker compose build`
4. Run migrations (one-off container)
5. `docker compose up -d`
6. Verify health (curl healthcheck endpoint)

**Required GitHub Secrets**:
- `SSH_HOST` — server IP or hostname
- `SSH_USER` — deploy user (not root)
- `SSH_KEY` — private SSH key for the deploy user

## File Structure

```
Dockerfile.core
Dockerfile.frontend
docker-compose.yml
nginx/app.conf              — template for host nginx site config
.github/workflows/deploy.yml
```

## Initial Server Setup (manual, one-time)

1. Create deploy user, add SSH key
2. Install Docker Engine + Docker Compose plugin
3. Install nginx + certbot (`apt install nginx certbot python3-certbot-nginx`)
4. Clone repo to `/opt/one-day-investor`
5. Create `.env` file with production values
6. Copy `nginx/app.conf` to `/etc/nginx/sites-available/`, symlink to `sites-enabled/`
7. Run `certbot --nginx -d yourdomain.com`
8. First `docker compose up -d`
9. Update Google OAuth redirect URI to production domain

## Security Considerations

- PostgreSQL not exposed to host — only accessible via Docker internal network
- Deploy user has no sudo except for docker group membership
- `.env` file permissions: `chmod 600`
- Certbot auto-renewal via systemd timer (installed by default)
- CORS on backend restricted to `FRONTEND_URL` only
