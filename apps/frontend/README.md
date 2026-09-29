# @frontend

The One Day Investor dashboard — a React 19 SPA built with Vite.

This is the authenticated side of the product. The public marketing pages are
server-rendered separately in [`apps/site`](../site), and the blog in
[`apps/blog`](../blog).

## Running it

From the repository root, after following the
[main quick start](../../README.md#quick-start):

```bash
bun run dev:frontend                # http://localhost:5173
```

It expects `apps/core` (:3000), `apps/market` (:3002) and `apps/analytics`
(:3001) to be running for anything beyond the login screen.

```bash
bun run --cwd apps/frontend build   # production bundle into dist/
bun run --cwd apps/frontend lint
```

Unlike the backend services, the dev server also works when started directly
with `bun run --cwd apps/frontend dev` — Vite loads `.env.development` itself.

## Configuration

Dev defaults live in `.env.development` and are loaded automatically by Vite.
Production values are injected as build args in
[`docker/Dockerfile.frontend`](../../docker/Dockerfile.frontend) — Vite inlines
them at build time, so the image is environment-specific.

| Variable | Points at |
|---|---|
| `VITE_API_URL` | core service |
| `VITE_ANALYTICS_URL` | analytics service |
| `VITE_MARKET_URL` | market service |
| `VITE_BLOG_URL` | blog |
| `VITE_S3_PUBLIC_URL` | public bucket for blog images |

## Layout

```
src/
  pages/        one component per route, plus pages/admin for the blog CMS
  components/   shared presentational components
  hooks/        AuthContext and data-fetching hooks
  lib/          axios clients, one per backend service
  locales/      en / ru / es translations (react-i18next)
scripts/        HTML templates rendered to PNG by the og service
```

## Stack

React 19 · Vite · Tailwind CSS · Radix UI · TanStack Query · React Router ·
Recharts · react-i18next · axios
