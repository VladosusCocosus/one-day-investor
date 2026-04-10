# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, SEO-friendly landing page at `/` that explains One Day Investor, shows a real dashboard preview, and drives visitors to sign in. Move the existing login screen to `/login`.

**Architecture:** Client-rendered React route. `LandingPage.tsx` composes seven small components under `components/landing/`. The dashboard preview is a static PNG/WebP captured once from a dedicated HTML template via Playwright and committed to `public/`. Routing changes move login to its own URL and update `ProtectedRoute` to redirect unauthenticated visitors to `/login` instead of `/`. Zero new runtime dependencies; reuses the existing emerald theme, Lucide icons, and `Button` primitive.

**Tech Stack:** React 19, React Router v7, Vite 8, Tailwind v4, Lucide icons, `vite-plugin-svgr` (already installed), Playwright MCP (for screenshot generation only).

**Spec:** `docs/superpowers/specs/2026-04-10-landing-page-design.md`

**Testing note:** `apps/frontend` has no test framework configured (no Vitest/Jest). Per YAGNI, this plan does **not** add one. Verification for each task is `bun run --cwd apps/frontend build` passing + visual check in the dev server. Routing/auth behavior is verified manually via the 5-step smoke test in Task 10.

---

## Prerequisites — Create isolated worktree

Run these commands before starting Task 1. All tasks execute inside the worktree.

```bash
cd /Users/pavel/Projects/one-day-investor
git worktree add .worktrees/landing -b feat/landing-page main
cd .worktrees/landing
bun install
bun run --cwd apps/frontend build  # baseline: must pass
```

Expected: build exits 0, `dist/index.html` is produced.

---

## File Structure

Files created or modified by this plan:

### Created

| Path | Purpose | Task |
|---|---|---|
| `apps/frontend/src/pages/LandingPage.tsx` | Landing route component; composes all sections + JSON-LD | 1, 10 |
| `apps/frontend/src/components/landing/LandingNav.tsx` | Sticky top nav, transparent→solid on scroll, auth-aware CTA | 2 |
| `apps/frontend/src/components/landing/LandingHero.tsx` | Headline, subhead, CTAs, sparkline decoration | 3 |
| `apps/frontend/src/components/landing/LandingDashboardPreview.tsx` | `<picture>` with dashboard preview image, shadow + fade | 4 |
| `apps/frontend/src/components/landing/LandingFeatures.tsx` | H2 + 4-card feature grid (Pockets/Assets/Snapshots/Analytics) | 5 |
| `apps/frontend/src/components/landing/LandingHowItWorks.tsx` | H2 + 3 numbered steps | 6 |
| `apps/frontend/src/components/landing/LandingFinalCta.tsx` | Full-width emerald CTA card | 7 |
| `apps/frontend/src/components/landing/LandingFooter.tsx` | Single-line footer | 8 |
| `apps/frontend/scripts/dashboard-preview-template.html` | HTML template used once to generate the preview image | 4 |
| `apps/frontend/public/landing-dashboard-preview.png` | PNG fallback, ~2400×1600, target <200 KB | 4 |
| `apps/frontend/public/landing-dashboard-preview.webp` | WebP primary, ~2400×1600, target <100 KB | 4 |

### Modified

| Path | Change | Task |
|---|---|---|
| `apps/frontend/src/main.tsx` | Add `/` → `LandingPage`, add `/login` → `LoginPage` | 1 |
| `apps/frontend/src/components/ProtectedRoute.tsx` | Redirect target `/` → `/login` | 1 |

---

## Task 1: Routing — landing stub at `/`, login at `/login`

Purpose: Get the new routing shape in place with a placeholder landing, so the rest of the tasks compose into an already-wired page.

**Files:**
- Create: `apps/frontend/src/pages/LandingPage.tsx` (stub)
- Modify: `apps/frontend/src/main.tsx`
- Modify: `apps/frontend/src/components/ProtectedRoute.tsx`

- [ ] **Step 1.1: Create stub `LandingPage.tsx`**

Path: `apps/frontend/src/pages/LandingPage.tsx`

```tsx
export function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#02281c] text-white">
      <p className="text-2xl font-semibold">One Day Investor — landing (stub)</p>
    </div>
  );
}
```

- [ ] **Step 1.2: Register the new routes in `main.tsx`**

Path: `apps/frontend/src/main.tsx`

Replace the existing `createBrowserRouter` call body:

```tsx
import { LandingPage } from "./pages/LandingPage";
// ...other imports unchanged

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/assets", element: <AssetsPage /> },
          { path: "/snapshots", element: <SnapshotsPage /> },
          { path: "/analytics", element: <AnalyticsPage /> },
        ],
      },
    ],
  },
]);
```

- [ ] **Step 1.3: Update `ProtectedRoute` to redirect to `/login`**

Path: `apps/frontend/src/components/ProtectedRoute.tsx`

Change the single `<Navigate>` target:

```tsx
if (!user) {
  return <Navigate to="/login" replace />;
}
```

- [ ] **Step 1.4: Verify build passes**

Run: `bun run --cwd apps/frontend build`
Expected: exit 0, no TypeScript errors, `dist/index.html` produced.

- [ ] **Step 1.5: Verify dev server manually**

Run: `bun run --cwd apps/frontend dev`
Open http://localhost:5173/ — expect the stub landing ("One Day Investor — landing (stub)").
Open http://localhost:5173/login — expect the existing Google sign-in card.
Open http://localhost:5173/dashboard while logged out — expect redirect to `/login`.
Ctrl-C the dev server.

- [ ] **Step 1.6: Commit**

```bash
git add apps/frontend/src/pages/LandingPage.tsx apps/frontend/src/main.tsx apps/frontend/src/components/ProtectedRoute.tsx
git commit -m "feat(routing): move login to /login, add landing stub at /"
```

---

## Task 2: `LandingNav` — sticky top nav

Purpose: Build the sticky header that lives on top of the hero. Transparent over the hero, solid emerald on scroll. Auth-aware CTA: "Sign in" when logged out, "Go to dashboard" when logged in.

**Files:**
- Create: `apps/frontend/src/components/landing/LandingNav.tsx`
- Modify: `apps/frontend/src/pages/LandingPage.tsx`

- [ ] **Step 2.1: Create `LandingNav.tsx`**

Path: `apps/frontend/src/components/landing/LandingNav.tsx`

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function LandingNav() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctaLabel = user ? "Go to dashboard" : "Sign in";
  const ctaHref = user ? "/dashboard" : "/login";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full motion-safe:transition-colors",
        scrolled
          ? "bg-[#02281c]/95 backdrop-blur-md border-b border-emerald-900/40"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4 md:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-emerald-100 hover:text-white transition-colors">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-[3px]"
            style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)" }}
          />
          <span className="text-sm font-semibold tracking-[0.18em] uppercase">
            One Day Investor
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <a
            href="#features"
            className="hidden text-sm font-medium text-emerald-200 hover:text-white transition-colors md:inline"
          >
            Features
          </a>
          <Link
            to={ctaHref}
            className="inline-flex h-9 items-center rounded-md bg-emerald-50 px-4 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-white transition-colors"
          >
            {ctaLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2.2: Wire `LandingNav` into the stub `LandingPage`**

Path: `apps/frontend/src/pages/LandingPage.tsx`

```tsx
import { LandingNav } from "@/components/landing/LandingNav";

export function LandingPage() {
  return (
    <div
      className="min-h-screen text-emerald-50"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 85% 115%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), radial-gradient(ellipse 1400px 900px at 10% -10%, #0f6d4f 0%, #064e36 38%, #02281c 100%)",
      }}
    >
      <LandingNav />
      <main id="main" className="mx-auto max-w-[1200px] px-6 py-20 md:px-8">
        <p className="text-center text-emerald-200">Sections coming in later tasks...</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 2.3: Build + visual check**

Run: `bun run --cwd apps/frontend build`
Expected: exit 0.
Run: `bun run --cwd apps/frontend dev` and open `/`.
Expected: emerald gradient page with sticky nav at top — left: emerald dot + wordmark; right: `Features` link (hidden on mobile) + `Sign in` button. Scroll: nav background becomes solid emerald with backdrop blur. Ctrl-C dev server.

- [ ] **Step 2.4: Commit**

```bash
git add apps/frontend/src/components/landing/LandingNav.tsx apps/frontend/src/pages/LandingPage.tsx
git commit -m "feat(landing): sticky nav with auth-aware CTA"
```

---

## Task 3: `LandingHero` — headline, subhead, CTAs, sparkline

Purpose: The top half of the page — the product promise. No dashboard preview yet (Task 4 handles that).

**Files:**
- Create: `apps/frontend/src/components/landing/LandingHero.tsx`
- Modify: `apps/frontend/src/pages/LandingPage.tsx`

- [ ] **Step 3.1: Create `LandingHero.tsx`**

Path: `apps/frontend/src/components/landing/LandingHero.tsx`

```tsx
import { Link } from "react-router";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function HeroSparkline() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -right-8 top-0 h-full w-[520px] opacity-40 md:opacity-60"
      viewBox="0 0 520 300"
      fill="none"
    >
      <defs>
        <linearGradient id="hero-spark-stroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>
        <linearGradient id="hero-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M 0 240 C 60 220, 90 230, 130 200 S 200 150, 240 160 S 320 120, 360 90 S 440 60, 520 30 L 520 300 L 0 300 Z"
        fill="url(#hero-spark-fill)"
      />
      <path
        d="M 0 240 C 60 220, 90 230, 130 200 S 200 150, 240 160 S 320 120, 360 90 S 440 60, 520 30"
        stroke="url(#hero-spark-stroke)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LandingHero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden px-6 pt-16 pb-12 md:px-8 md:pt-24 md:pb-16"
    >
      <HeroSparkline />
      <div className="relative mx-auto max-w-[960px] text-center">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-[2px]"
            style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)" }}
          />
          One Day Investor
        </p>
        <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-emerald-50 sm:text-6xl md:text-7xl">
          A calm, visual way
          <br />
          <span className="bg-gradient-to-r from-emerald-50 via-emerald-200 to-emerald-300 bg-clip-text text-transparent">
            to watch your wealth grow.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-[640px] text-base text-emerald-200 md:text-xl">
          Track every pocket, asset, and trend in one place.
          <br className="hidden sm:block" />
          Free. No spreadsheets.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex h-12 items-center gap-3 rounded-lg bg-emerald-50 px-6 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-900/30 hover:bg-white transition-colors"
          >
            <GoogleIcon />
            Sign in with Google
          </Link>
          <a
            href="#how"
            className="inline-flex h-12 items-center rounded-lg border border-emerald-300/30 px-6 text-base font-semibold text-emerald-100 hover:bg-emerald-900/30 transition-colors"
          >
            How it works
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3.2: Wire `LandingHero` into `LandingPage`**

Path: `apps/frontend/src/pages/LandingPage.tsx`

Replace the placeholder `<main>` body:

```tsx
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";

export function LandingPage() {
  return (
    <div
      className="min-h-screen text-emerald-50"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 85% 115%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), radial-gradient(ellipse 1400px 900px at 10% -10%, #0f6d4f 0%, #064e36 38%, #02281c 100%)",
      }}
    >
      <LandingNav />
      <main id="main">
        <LandingHero />
      </main>
    </div>
  );
}
```

- [ ] **Step 3.3: Build + visual check**

Run: `bun run --cwd apps/frontend build`
Expected: exit 0.
Run dev server and open `/`.
Expected: centered hero — tiny eyebrow, giant headline ("A calm, visual way" on top, gradient "to watch your wealth grow." below), subhead, two buttons side-by-side (Google + "How it works"). Soft ascending sparkline in the background. Clicking `Sign in with Google` navigates to `/login`. Clicking `How it works` attempts `#how` (anchor not yet present — this is expected).

- [ ] **Step 3.4: Commit**

```bash
git add apps/frontend/src/components/landing/LandingHero.tsx apps/frontend/src/pages/LandingPage.tsx
git commit -m "feat(landing): centered hero with headline, CTAs, sparkline"
```

---

## Task 4: Dashboard preview — template, screenshot, component

Purpose: Generate the dashboard preview image once and build the component that renders it. The image is produced by a dedicated HTML template to avoid coupling the landing to the dev database state.

**Files:**
- Create: `apps/frontend/scripts/dashboard-preview-template.html`
- Create: `apps/frontend/public/landing-dashboard-preview.png`
- Create: `apps/frontend/public/landing-dashboard-preview.webp`
- Create: `apps/frontend/src/components/landing/LandingDashboardPreview.tsx`
- Modify: `apps/frontend/src/pages/LandingPage.tsx`

- [ ] **Step 4.1: Create the dashboard preview template**

Path: `apps/frontend/scripts/dashboard-preview-template.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Dashboard preview — One Day Investor</title>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");
      html, body { margin: 0; padding: 0; }
      body {
        width: 1600px;
        height: 1000px;
        font-family: "Inter", -apple-system, "Segoe UI", sans-serif;
        background: #f7fbf9;
        color: #0f172a;
        padding: 56px 72px;
        -webkit-font-smoothing: antialiased;
      }
      .hero-card {
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        border: 1px solid #a7f3d0;
        border-radius: 24px;
        padding: 40px 48px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        box-shadow: 0 12px 40px -20px rgba(16, 185, 129, 0.25);
      }
      .hero-label { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #059669; }
      .hero-total { font-size: 64px; font-weight: 800; letter-spacing: -0.02em; color: #064e36; margin-top: 12px; font-variant-numeric: tabular-nums; }
      .hero-delta { font-size: 18px; color: #047857; margin-top: 8px; font-weight: 600; }
      .hero-spark { width: 420px; height: 140px; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }
      .card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 4px 20px -8px rgba(15, 23, 42, 0.08);
      }
      .card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; }
      .donut-wrap { display: flex; align-items: center; gap: 40px; margin-top: 24px; }
      .donut {
        width: 200px; height: 200px; border-radius: 50%;
        background: conic-gradient(#059669 0 42%, #10b981 42% 66%, #34d399 66% 82%, #6ee7b7 82% 93%, #a7f3d0 93% 100%);
        position: relative;
      }
      .donut::after {
        content: "";
        position: absolute; inset: 34px;
        background: white; border-radius: 50%;
      }
      .donut-center {
        position: absolute; inset: 0; display: flex; flex-direction: column;
        align-items: center; justify-content: center; z-index: 1;
      }
      .donut-center-val { font-size: 28px; font-weight: 800; color: #064e36; font-variant-numeric: tabular-nums; }
      .donut-center-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; margin-top: 4px; }
      .legend { flex: 1; display: flex; flex-direction: column; gap: 14px; }
      .legend-row { display: flex; align-items: center; justify-content: space-between; font-size: 15px; }
      .legend-name { display: flex; align-items: center; gap: 12px; color: #0f172a; font-weight: 600; }
      .legend-dot { width: 12px; height: 12px; border-radius: 3px; }
      .legend-pct { color: #64748b; font-variant-numeric: tabular-nums; }
      .chart-wrap { margin-top: 24px; height: 220px; position: relative; }
      .chart-svg { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div class="hero-card">
      <div>
        <div class="hero-label">Total portfolio · April 2026</div>
        <div class="hero-total">€ 142,380</div>
        <div class="hero-delta">+ €8,220 this month · +6.1%</div>
      </div>
      <svg class="hero-spark" viewBox="0 0 420 140">
        <defs>
          <linearGradient id="hs-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path d="M 0 110 C 40 100, 70 95, 110 85 S 180 70, 220 65 S 280 45, 320 40 S 380 20, 420 15 L 420 140 L 0 140 Z" fill="url(#hs-fill)" />
        <path d="M 0 110 C 40 100, 70 95, 110 85 S 180 70, 220 65 S 280 45, 320 40 S 380 20, 420 15" stroke="#059669" stroke-width="4" fill="none" stroke-linecap="round" />
        <circle cx="420" cy="15" r="6" fill="#059669" />
      </svg>
    </div>

    <div class="row">
      <div class="card">
        <div class="card-title">Distribution</div>
        <div class="donut-wrap">
          <div style="position:relative">
            <div class="donut"></div>
            <div class="donut-center"><div class="donut-center-val">12</div><div class="donut-center-lbl">pockets</div></div>
          </div>
          <div class="legend">
            <div class="legend-row"><span class="legend-name"><span class="legend-dot" style="background:#059669"></span>Stocks</span><span class="legend-pct">42%</span></div>
            <div class="legend-row"><span class="legend-name"><span class="legend-dot" style="background:#10b981"></span>Crypto</span><span class="legend-pct">24%</span></div>
            <div class="legend-row"><span class="legend-name"><span class="legend-dot" style="background:#34d399"></span>Cash</span><span class="legend-pct">16%</span></div>
            <div class="legend-row"><span class="legend-name"><span class="legend-dot" style="background:#6ee7b7"></span>Bonds</span><span class="legend-pct">11%</span></div>
            <div class="legend-row"><span class="legend-name"><span class="legend-dot" style="background:#a7f3d0"></span>Other</span><span class="legend-pct">7%</span></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Portfolio timeline</div>
        <div class="chart-wrap">
          <svg class="chart-svg" viewBox="0 0 600 220" preserveAspectRatio="none">
            <defs>
              <linearGradient id="tl-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#10b981" stop-opacity="0.3" />
                <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
              </linearGradient>
            </defs>
            <!-- grid -->
            <line x1="0" y1="50" x2="600" y2="50" stroke="#e5e7eb" stroke-dasharray="3 4" />
            <line x1="0" y1="110" x2="600" y2="110" stroke="#e5e7eb" stroke-dasharray="3 4" />
            <line x1="0" y1="170" x2="600" y2="170" stroke="#e5e7eb" stroke-dasharray="3 4" />
            <!-- area -->
            <path d="M 0 180 L 50 170 L 100 165 L 150 150 L 200 140 L 250 120 L 300 125 L 350 100 L 400 95 L 450 75 L 500 60 L 550 40 L 600 30 L 600 220 L 0 220 Z" fill="url(#tl-fill)" />
            <!-- line -->
            <polyline points="0,180 50,170 100,165 150,150 200,140 250,120 300,125 350,100 400,95 450,75 500,60 550,40 600,30" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <!-- endpoint -->
            <circle cx="600" cy="30" r="5" fill="#059669" />
          </svg>
        </div>
      </div>
    </div>
  </body>
</html>
```

- [ ] **Step 4.2: Serve the template and screenshot it via Playwright MCP**

First, start a local HTTP server from the worktree's frontend directory:

```bash
cd apps/frontend && nohup python3 -m http.server 8765 > /tmp/landing-preview.log 2>&1 &
disown
```

Then use the Playwright MCP:
- `browser_resize(width: 1600, height: 1000)`
- `browser_navigate(url: "http://localhost:8765/scripts/dashboard-preview-template.html")`
- `browser_take_screenshot(filename: "landing-dashboard-preview.png", type: "png")`

The screenshot will be saved to the project root. Move it to the public directory:

```bash
mv /Users/pavel/Projects/one-day-investor/.worktrees/landing/landing-dashboard-preview.png apps/frontend/public/landing-dashboard-preview.png
```

(Path may be slightly different — check the Playwright MCP output for the actual file location and move from there.)

Stop the server:

```bash
pkill -f "python3 -m http.server 8765"
```

Verify dimensions:

```bash
file apps/frontend/public/landing-dashboard-preview.png
```

Expected: `PNG image data, 1600 x 1000, 8-bit/color RGB, non-interlaced`

- [ ] **Step 4.3: Convert PNG to WebP**

```bash
bunx @squoosh/cli --webp '{"quality":82}' -d apps/frontend/public apps/frontend/public/landing-dashboard-preview.png 2>/dev/null || \
  (command -v cwebp >/dev/null && cwebp -q 82 apps/frontend/public/landing-dashboard-preview.png -o apps/frontend/public/landing-dashboard-preview.webp) || \
  echo "Neither @squoosh/cli nor cwebp available — skip WebP; component will fall back to PNG"
```

Verify (optional): `file apps/frontend/public/landing-dashboard-preview.webp` should show `RIFF ... WebP`.

If WebP generation fails, that's acceptable — the `<picture>` element in Step 4.4 gracefully falls back to PNG and the build still passes. The component only references files that exist.

- [ ] **Step 4.4: Create `LandingDashboardPreview.tsx`**

Path: `apps/frontend/src/components/landing/LandingDashboardPreview.tsx`

```tsx
export function LandingDashboardPreview() {
  return (
    <div className="relative mx-auto mt-14 max-w-[1100px] px-6 md:mt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-8 h-40"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.25) 0%, transparent 70%)",
        }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-emerald-800/40 bg-white shadow-2xl shadow-emerald-950/50 ring-1 ring-white/10">
        <picture>
          <source srcSet="/landing-dashboard-preview.webp" type="image/webp" />
          <img
            src="/landing-dashboard-preview.png"
            alt="The One Day Investor dashboard showing portfolio total, distribution donut, and timeline chart."
            width={1600}
            height={1000}
            loading="eager"
            fetchPriority="high"
            className="block h-auto w-full"
          />
        </picture>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.5: Wire `LandingDashboardPreview` into `LandingPage`**

Path: `apps/frontend/src/pages/LandingPage.tsx`

Add the component after `<LandingHero />`:

```tsx
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingDashboardPreview } from "@/components/landing/LandingDashboardPreview";

export function LandingPage() {
  return (
    <div
      className="min-h-screen text-emerald-50"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 85% 115%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), radial-gradient(ellipse 1400px 900px at 10% -10%, #0f6d4f 0%, #064e36 38%, #02281c 100%)",
      }}
    >
      <LandingNav />
      <main id="main">
        <LandingHero />
        <LandingDashboardPreview />
      </main>
    </div>
  );
}
```

- [ ] **Step 4.6: Build + visual check**

Run: `bun run --cwd apps/frontend build`
Expected: exit 0. Dist includes `landing-dashboard-preview.png` (and `.webp` if generated).
Run dev server and open `/`.
Expected: under the hero, a large rounded white card with a soft emerald glow behind it, containing the dashboard preview (hero card with €142,380 + sparkline, donut + legend, timeline chart). No horizontal scrollbar.

- [ ] **Step 4.7: Commit**

```bash
git add apps/frontend/scripts/dashboard-preview-template.html apps/frontend/public/landing-dashboard-preview.png apps/frontend/public/landing-dashboard-preview.webp apps/frontend/src/components/landing/LandingDashboardPreview.tsx apps/frontend/src/pages/LandingPage.tsx
# If WebP wasn't generated, drop that path from the add list.
git commit -m "feat(landing): dashboard preview image and component"
```

---

## Task 5: `LandingFeatures` — 4-card feature grid

Purpose: The first post-hero section. H2 + four feature cards explaining Pockets / Assets / Snapshots / Analytics.

**Files:**
- Create: `apps/frontend/src/components/landing/LandingFeatures.tsx`
- Modify: `apps/frontend/src/pages/LandingPage.tsx`

- [ ] **Step 5.1: Create `LandingFeatures.tsx`**

Path: `apps/frontend/src/components/landing/LandingFeatures.tsx`

```tsx
import { Layers, Wallet, Camera, BarChart3, type LucideIcon } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const features: Feature[] = [
  {
    icon: Layers,
    title: "Pockets",
    body:
      "Group holdings however you actually think about them — by broker, by strategy, by goal. Nest pockets as deep as you need.",
  },
  {
    icon: Wallet,
    title: "Assets",
    body:
      "Track every crypto and investment holding across every pocket in one searchable table. Live prices included.",
  },
  {
    icon: Camera,
    title: "Snapshots",
    body:
      "Capture your whole portfolio on a schedule you pick. Every snapshot is a dated record you can revisit and compare.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body:
      "Distribution donut, timeline chart, largest holdings — the whole picture, always one click away.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="px-6 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Features
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
            Built for how real portfolios actually work.
          </h2>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-7 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-emerald-50">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-emerald-200/90">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5.2: Wire into `LandingPage`**

Path: `apps/frontend/src/pages/LandingPage.tsx`

Add the import and insert after `<LandingDashboardPreview />`:

```tsx
import { LandingFeatures } from "@/components/landing/LandingFeatures";
// ...
<main id="main">
  <LandingHero />
  <LandingDashboardPreview />
  <LandingFeatures />
</main>
```

- [ ] **Step 5.3: Build + visual check**

Run: `bun run --cwd apps/frontend build`
Expected: exit 0.
Dev server → open `/` → scroll past the dashboard preview.
Expected: "FEATURES" eyebrow, h2, 4 cards in a row on desktop (2×2 on tablet, 1-col on mobile). Each card has an emerald icon pill, title, body text. Clicking `Features` in the nav scrolls to this section smoothly.

- [ ] **Step 5.4: Commit**

```bash
git add apps/frontend/src/components/landing/LandingFeatures.tsx apps/frontend/src/pages/LandingPage.tsx
git commit -m "feat(landing): features grid with 4 cards"
```

---

## Task 6: `LandingHowItWorks` — 3 numbered steps

**Files:**
- Create: `apps/frontend/src/components/landing/LandingHowItWorks.tsx`
- Modify: `apps/frontend/src/pages/LandingPage.tsx`

- [ ] **Step 6.1: Create `LandingHowItWorks.tsx`**

Path: `apps/frontend/src/components/landing/LandingHowItWorks.tsx`

```tsx
type Step = { title: string; body: string };

const steps: Step[] = [
  {
    title: "Sign in with Google",
    body: "One click. No new password, no email verification dance.",
  },
  {
    title: "Organize into pockets",
    body:
      "Add the brokers, wallets, and accounts you already use. Group them however makes sense to you.",
  },
  {
    title: "Snapshot, then watch it grow",
    body:
      "Record monthly totals. See trends, distribution, and the one chart that matters most — your portfolio over time.",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how" className="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            How it works
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
            Three steps to a portfolio you can actually read.
          </h2>
        </div>
        <ol className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <li key={step.title} className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15 text-xl font-bold text-emerald-200 ring-1 ring-inset ring-emerald-300/40">
                {i + 1}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-emerald-50">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-200/90">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

- [ ] **Step 6.2: Wire into `LandingPage`**

Path: `apps/frontend/src/pages/LandingPage.tsx`

```tsx
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
// ...
<main id="main">
  <LandingHero />
  <LandingDashboardPreview />
  <LandingFeatures />
  <LandingHowItWorks />
</main>
```

- [ ] **Step 6.3: Build + visual check**

Run: `bun run --cwd apps/frontend build`
Expected: exit 0.
Dev server → open `/` → scroll past Features.
Expected: "HOW IT WORKS" eyebrow, h2, three numbered steps in a row on desktop (1 column on mobile). Each step has a circled number, a title, and a body. Clicking `How it works` in the hero (anchor `#how`) scrolls to this section.

- [ ] **Step 6.4: Commit**

```bash
git add apps/frontend/src/components/landing/LandingHowItWorks.tsx apps/frontend/src/pages/LandingPage.tsx
git commit -m "feat(landing): how-it-works three-step section"
```

---

## Task 7: `LandingFinalCta` — full-width closing CTA

**Files:**
- Create: `apps/frontend/src/components/landing/LandingFinalCta.tsx`
- Modify: `apps/frontend/src/pages/LandingPage.tsx`

- [ ] **Step 7.1: Create `LandingFinalCta.tsx`**

Path: `apps/frontend/src/components/landing/LandingFinalCta.tsx`

```tsx
import { Link } from "react-router";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function LandingFinalCta() {
  return (
    <section id="cta" className="px-6 py-24 md:px-8 md:py-32">
      <div
        className="mx-auto max-w-[1100px] overflow-hidden rounded-3xl border border-emerald-700/40 px-8 py-16 text-center shadow-2xl shadow-emerald-950/50 md:px-16 md:py-24"
        style={{
          background:
            "radial-gradient(ellipse at top left, #0f6d4f 0%, #064e36 45%, #02281c 100%)",
        }}
      >
        <h2 className="text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
          Start watching your wealth grow.
        </h2>
        <div className="mt-10 flex justify-center">
          <Link
            to="/login"
            className="inline-flex h-12 items-center gap-3 rounded-lg bg-emerald-50 px-6 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-900/40 hover:bg-white transition-colors"
          >
            <GoogleIcon />
            Sign in with Google
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 7.2: Wire into `LandingPage`**

```tsx
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
// ...
<main id="main">
  <LandingHero />
  <LandingDashboardPreview />
  <LandingFeatures />
  <LandingHowItWorks />
  <LandingFinalCta />
</main>
```

- [ ] **Step 7.3: Build + visual check**

Run: `bun run --cwd apps/frontend build`
Dev server → scroll to bottom → expect an emerald gradient card filling most of the width with centered headline and the Google sign-in button.

- [ ] **Step 7.4: Commit**

```bash
git add apps/frontend/src/components/landing/LandingFinalCta.tsx apps/frontend/src/pages/LandingPage.tsx
git commit -m "feat(landing): final CTA card"
```

---

## Task 8: `LandingFooter` — single-line footer

**Files:**
- Create: `apps/frontend/src/components/landing/LandingFooter.tsx`
- Modify: `apps/frontend/src/pages/LandingPage.tsx`

- [ ] **Step 8.1: Create `LandingFooter.tsx`**

Path: `apps/frontend/src/components/landing/LandingFooter.tsx`

```tsx
export function LandingFooter() {
  return (
    <footer className="border-t border-emerald-900/40 px-6 py-10 md:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 text-xs text-emerald-300 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ background: "linear-gradient(135deg, #6ee7b7, #10b981)" }}
          />
          <span className="font-semibold tracking-[0.18em] uppercase">One Day Investor</span>
        </div>
        <div className="flex items-center gap-5">
          <span>© 2026 One Day Investor</span>
          <span aria-hidden="true">·</span>
          <a
            href="https://odinvestor.net"
            className="hover:text-emerald-100 transition-colors"
          >
            odinvestor.net
          </a>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 8.2: Wire into `LandingPage`**

```tsx
import { LandingFooter } from "@/components/landing/LandingFooter";
// ...
<LandingFooter />
```

Place it **outside** `<main>`, after `</main>`.

- [ ] **Step 8.3: Build + visual check**

Run: `bun run --cwd apps/frontend build`
Dev server → scroll to very bottom → expect a thin line with the wordmark on left and "© 2026 · odinvestor.net" on right. Stacks to two rows on mobile.

- [ ] **Step 8.4: Commit**

```bash
git add apps/frontend/src/components/landing/LandingFooter.tsx apps/frontend/src/pages/LandingPage.tsx
git commit -m "feat(landing): footer"
```

---

## Task 9: JSON-LD structured data + skip link + a11y polish

Purpose: Add the SEO-visible structured data block, the skip-to-content link, and verify semantic HTML is correct. No new files.

**Files:**
- Modify: `apps/frontend/src/pages/LandingPage.tsx`

- [ ] **Step 9.1: Update `LandingPage.tsx` with JSON-LD + skip link**

Path: `apps/frontend/src/pages/LandingPage.tsx`

Full file:

```tsx
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingDashboardPreview } from "@/components/landing/LandingDashboardPreview";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "One Day Investor",
  url: "https://odinvestor.net",
  description: "A calm, visual way to watch your wealth grow.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export function LandingPage() {
  return (
    <div
      className="min-h-screen text-emerald-50"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 85% 115%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), radial-gradient(ellipse 1400px 900px at 10% -10%, #0f6d4f 0%, #064e36 38%, #02281c 100%)",
      }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-emerald-50 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-950"
      >
        Skip to content
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingNav />
      <main id="main">
        <LandingHero />
        <LandingDashboardPreview />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 9.2: Build + verify structured data**

Run: `bun run --cwd apps/frontend build`
Expected: exit 0.

Run dev server → open `/` → open DevTools → Elements tab → confirm there is a `<script type="application/ld+json">` with the expected JSON.

Copy the JSON content into https://validator.schema.org/ — it must report no errors.

- [ ] **Step 9.3: Verify skip link**

Reload `/`, press `Tab` once. A `Skip to content` button should appear visually at the top-left of the viewport. Press Enter — focus should jump to the `<main>` area.

- [ ] **Step 9.4: Verify semantic structure**

In DevTools Elements tab, confirm:
- Exactly one `<h1>` on the page (inside `LandingHero`)
- `<h2>` for Features, How it works, and Final CTA titles
- `<h3>` for feature card titles and step titles
- `<header>`, `<main id="main">`, `<footer>` present
- All "Sign in with Google" buttons are real `<a>` tags with `href="/login"`

- [ ] **Step 9.5: Commit**

```bash
git add apps/frontend/src/pages/LandingPage.tsx
git commit -m "feat(landing): JSON-LD structured data and skip-to-content link"
```

---

## Task 10: Final verification — build, auth flow smoke test, responsive

Purpose: End-to-end verification that everything works together. No code changes unless problems surface.

- [ ] **Step 10.1: Clean build**

```bash
rm -rf apps/frontend/dist
bun run --cwd apps/frontend build
```

Expected: exit 0. Check build output for:
- `dist/index.html` exists and still contains `<meta property="og:image" content="https://odinvestor.net/og-image.png" />` (metadata from the earlier work should be untouched).
- `dist/landing-dashboard-preview.png` present (and `.webp` if generated).

- [ ] **Step 10.2: Preview build**

```bash
bun run --cwd apps/frontend preview
```

Open http://localhost:4173/ (or whichever port `preview` reports).

- [ ] **Step 10.3: Auth flow smoke test**

With the preview server running, verify each of these manually:

1. **Logged out, visit `/`** → landing page renders. Nav CTA says "Sign in". Click it → lands on `/login`.
2. **Logged out, visit `/dashboard`** → redirects to `/login`.
3. **Logged out, click "Sign in with Google" in hero** → lands on `/login`.
4. **Log in via Google** → lands on `/dashboard`.
5. **Logged in, visit `/`** → landing page renders. Nav CTA says "Go to dashboard". Click it → lands on `/dashboard`.
6. **Logged in, visit `/login`** → redirects to `/dashboard` (existing behavior, verify it still works).
7. **Log out** → lands on `/` (landing).

- [ ] **Step 10.4: Responsive spot check**

Resize the browser window (or use DevTools device emulation):
- **375px wide** (mobile): hero text remains readable, features grid = 1 column, how-it-works = 1 column, nav hides "Features" link, dashboard preview scales full-width with padding, footer stacks to 2 rows.
- **768px wide** (tablet): features grid = 2×2, how-it-works stays horizontal or wraps gracefully.
- **1440px wide** (desktop): layout matches the design — hero centered with max-width ~960px, content container ~1200px, features = 4 columns.

No horizontal scrollbar at any width.

- [ ] **Step 10.5: Lighthouse check (desktop)**

With `bun run preview` running, either run Lighthouse from Chrome DevTools (Lighthouse tab → "Analyze page load" → Desktop + Performance/Accessibility/Best Practices/SEO) or via CLI:

```bash
bunx lighthouse http://localhost:4173/ --only-categories=performance,accessibility,best-practices,seo --preset=desktop --view
```

Targets:
- Performance ≥ 95
- Accessibility ≥ 95
- Best Practices ≥ 95
- SEO = 100

If a score is below target, investigate the top issue reported by Lighthouse and fix it before proceeding. Common fixes:
- Performance below target → confirm `fetchpriority="high"` and explicit `width`/`height` on the preview image; confirm WebP is actually being served.
- Accessibility below target → confirm every interactive element has an accessible name; confirm color contrast in features cards.
- SEO below target → confirm `<meta name="description">` is present (it is — from the metadata work); confirm all links have discernible text.

- [ ] **Step 10.6: Commit any fixes**

If Step 10.5 required any changes, commit them:

```bash
git add <files>
git commit -m "fix(landing): <what you fixed>"
```

If no fixes were needed, skip this step.

- [ ] **Step 10.7: Push the branch and finish**

```bash
git log --oneline main..feat/landing-page
# Expected: 9–10 commits, one per task.
```

Ready for review. Optional: open a PR with `gh pr create` (only if the user asks).

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Routing: `/` → LandingPage, `/login` → LoginPage (Task 1)
- ✅ ProtectedRoute redirect `/` → `/login` (Task 1)
- ✅ Logged-in `/login` → `/dashboard` — unchanged, verified in Task 10.3
- ✅ Logout → `/` — existing behavior, verified in Task 10.3
- ✅ Logged-in user on `/` sees landing with "Go to dashboard" — Task 2 (LandingNav auth-aware CTA)
- ✅ Sticky nav, transparent→solid (Task 2)
- ✅ Centered hero with sparkline, h1, subhead, 2 CTAs (Task 3)
- ✅ Dashboard preview as `<picture>` with WebP + PNG (Task 4)
- ✅ Features: 4 cards with Lucide icons (Task 5)
- ✅ How it works: 3 numbered steps (Task 6)
- ✅ Final CTA (Task 7)
- ✅ Footer (Task 8)
- ✅ JSON-LD structured data + skip link + semantic HTML (Task 9)
- ✅ Real `<Link to="/login">` everywhere — Tasks 2, 3, 7
- ✅ Responsive breakpoints — verified in Task 10.4
- ✅ Accessibility (skip link, focus rings, alt text, aria-hidden on decorative SVGs) — Tasks 3, 4, 9
- ✅ Performance targets — verified in Task 10.5

**Placeholder scan:** No "TBD", "TODO", "implement later", "handle edge cases", or "similar to Task N" patterns. Every step contains the actual code or command.

**Type consistency:** All component exports named `Landing{Section}`. All props names consistent. The `Feature` and `Step` types in Tasks 5 and 6 are local to their files — no cross-task type references.
