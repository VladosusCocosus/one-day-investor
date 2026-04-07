# Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy one-day-investor to a Hetzner Ubuntu server using Docker Compose, host-level nginx with Certbot, and GitHub Actions CI/CD.

**Architecture:** Three Docker Compose services (PostgreSQL, Bun backend, nginx frontend) on an internal network. Host nginx reverse-proxies `/api/*` to backend and `/*` to frontend, with SSL via Certbot. GitHub Actions deploys on push to `main` via SSH.

**Tech Stack:** Docker Compose, Bun, PostgreSQL 16, nginx, Certbot, GitHub Actions

---

### File Structure

```
Create: Dockerfile.core              — multi-stage Bun backend image
Create: Dockerfile.frontend          — multi-stage Vite build → nginx image
Create: docker-compose.yml           — db + core + frontend services
Create: nginx/frontend.conf          — SPA routing config for frontend container
Create: nginx/app.conf               — host nginx site config template
Create: .github/workflows/deploy.yml — CI/CD pipeline
Create: .env.example                 — env var template (committed, no secrets)
Modify: .gitignore                   — add .env
```

---

### Task 1: Dockerfile.core

**Files:**
- Create: `Dockerfile.core`

- [ ] **Step 1: Create Dockerfile.core**

This is a Bun monorepo, so we copy all workspace `package.json` files first for layer caching, then install, then copy source.

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Copy workspace structure for dependency install caching
COPY package.json bun.lock ./
COPY packages/config/package.json packages/config/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY apps/core/package.json apps/core/

RUN bun install --frozen-lockfile

# Copy all source
COPY packages/ packages/
COPY apps/core/ apps/core/

EXPOSE 3000
CMD ["bun", "run", "apps/core/src/index.ts"]
```

- [ ] **Step 2: Commit**

```bash
git add Dockerfile.core
git commit -m "feat: add Dockerfile for core backend service"
```

---

### Task 2: Dockerfile.frontend

**Files:**
- Create: `Dockerfile.frontend`
- Create: `nginx/frontend.conf`

- [ ] **Step 1: Create nginx config for SPA routing inside the frontend container**

This config serves the Vite build output and routes all paths to `index.html` for client-side routing.

Create `nginx/frontend.conf`:

```nginx
server {
    listen 8080;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

- [ ] **Step 2: Create Dockerfile.frontend**

Multi-stage: build the Vite SPA with Bun, then serve with nginx. The frontend needs workspace packages (`@types` etc.) for the TypeScript build.

```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app

# Copy workspace structure for dependency install caching
COPY package.json bun.lock ./
COPY packages/config/package.json packages/config/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY apps/frontend/package.json apps/frontend/

RUN bun install --frozen-lockfile

# Copy source needed for frontend build
COPY packages/types/ packages/types/
COPY apps/frontend/ apps/frontend/

# VITE_API_URL is baked in at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN bun run --cwd apps/frontend build

# Serve with nginx
FROM nginx:alpine
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY nginx/frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile.frontend nginx/frontend.conf
git commit -m "feat: add Dockerfile and nginx config for frontend service"
```

---

### Task 3: docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create docker-compose.yml**

Three services on an internal network. Core and frontend ports are bound to `127.0.0.1` so only the host nginx can reach them. PostgreSQL is internal-only.

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - internal

  core:
    build:
      context: .
      dockerfile: Dockerfile.core
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      POSTGRES_HOST: db
      POSTGRES_PORT: 5432
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI}
      FRONTEND_URL: ${FRONTEND_URL}
      SESSION_MAX_AGE: ${SESSION_MAX_AGE:-2592000}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - internal

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        VITE_API_URL: ${VITE_API_URL}
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:8080"
    networks:
      - internal

volumes:
  pgdata:

networks:
  internal:
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add docker-compose.yml for all services"
```

---

### Task 4: Environment template and .gitignore

**Files:**
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create .env.example**

Template with all required variables, no actual secrets. Users copy this to `.env` and fill in values.

```bash
# PostgreSQL
POSTGRES_DB=one_day_investor
POSTGRES_USER=postgres
POSTGRES_PASSWORD=changeme

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# Application
FRONTEND_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com/api
SESSION_MAX_AGE=2592000
```

- [ ] **Step 2: Add .env to .gitignore**

Append to the existing `.gitignore`:

```
.env
```

- [ ] **Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "feat: add .env.example template and gitignore .env"
```

---

### Task 5: Host nginx config template

**Files:**
- Create: `nginx/app.conf`

- [ ] **Step 1: Create nginx/app.conf**

This is a template the user copies to `/etc/nginx/sites-available/` on the server. Replace `yourdomain.com` with the actual domain. Certbot will add the SSL block after running `certbot --nginx`.

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Note: After copying to the server and enabling the site, run `certbot --nginx -d yourdomain.com` which automatically adds the SSL configuration and redirect block.

- [ ] **Step 2: Commit**

```bash
git add nginx/app.conf
git commit -m "feat: add host nginx reverse proxy config template"
```

---

### Task 6: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create .github/workflows/deploy.yml**

Uses `appleboy/ssh-action` to SSH into the server and run deploy commands. Requires three GitHub repository secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY`.

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/one-day-investor
            git pull origin main
            docker compose build
            docker compose run --rm core bun run --cwd packages/database migrate:up
            docker compose up -d
            sleep 5
            curl -sf http://127.0.0.1:3000/ > /dev/null && echo "Health check passed" || echo "Health check failed"
```

- [ ] **Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions deploy workflow"
```

---

### Task 7: Verify local Docker build

- [ ] **Step 1: Create a test .env file locally**

```bash
cp .env.example .env
```

Edit `.env` and fill in the PostgreSQL values (Google OAuth can be empty for build test):

```
POSTGRES_DB=one_day_investor
POSTGRES_USER=postgres
POSTGRES_PASSWORD=testpassword
```

- [ ] **Step 2: Build all images**

Run:
```bash
docker compose build
```

Expected: All three services build successfully. Frontend image runs Vite build, core image installs Bun dependencies.

- [ ] **Step 3: Start services and verify**

Run:
```bash
docker compose up -d
```

Then:
```bash
# Check all 3 containers are running
docker compose ps

# Core backend responds
curl http://127.0.0.1:3000/

# Frontend serves HTML
curl http://127.0.0.1:8080/
```

Expected: Core returns "Hello Elysia", frontend returns HTML with the React app.

- [ ] **Step 4: Tear down**

```bash
docker compose down
```

- [ ] **Step 5: Commit any fixes if needed**

If any Dockerfile or compose changes were needed during verification, commit them:

```bash
git add -A
git commit -m "fix: adjust Docker config based on build verification"
```
