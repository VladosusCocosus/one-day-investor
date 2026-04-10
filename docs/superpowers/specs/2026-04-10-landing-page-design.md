# Landing Page at `/` — Design Spec

**Date:** 2026-04-10
**Status:** Approved, ready for implementation plan
**Repo:** `one-day-investor`
**Frontend:** `apps/frontend` (Vite + React + Tailwind + React Router)

## Context

The frontend currently serves `LoginPage` at `/`. There is no public marketing surface — crawlers that hit `odinvestor.net` see only a Google sign-in button, which tells them nothing about the product and wastes the domain's SEO potential. All other routes are auth-gated and irrelevant to crawlers.

This spec defines a public, SEO-friendly landing page at `/` that explains what One Day Investor is, shows the product, and drives visitors to sign in.

## Goals

1. **First-time visitors understand the product within 5 seconds of landing.** The headline, subhead, and a real dashboard preview make the value proposition obvious without scrolling.
2. **Crawlers can read and index the page.** Real semantic HTML, real text, one `<h1>`, structured data, real anchor links.
3. **Converts intent into sign-in.** Primary CTA (`Sign in with Google`) is visible in the hero, repeated in a nav button, and closes the page with a full-width final CTA.
4. **Matches the in-app emerald brand.** Continuity between the OG image, favicon, and landing — visitors should feel they've arrived in the same place the social preview promised.
5. **Ships without new build infrastructure.** No SSR, no prerendering plugins, no new dependencies.

## Non-Goals (explicitly out of scope)

- `robots.txt` / `sitemap.xml` generation — follow-up.
- Pre-rendering at build time (`vite-react-ssg`, `vite-plugin-prerender`, etc.) — Google runs JS, meta tags are already static; not needed for MVP.
- A/B testing, analytics pixels, heatmap tools.
- Blog, changelog, pricing, or any other marketing pages.
- i18n / multi-language.
- Auto-capturing the dashboard preview screenshot on every build — captured once, committed as a static asset, re-captured manually when the dashboard visually changes.
- Waitlist / email capture (product is fully open; CTA is "Sign in with Google").

## Decisions (locked)

| # | Decision | Value | Rationale |
|---|---|---|---|
| 1 | Login route | Move `LoginPage` from `/` to `/login` | Gives auth its own URL for redirects, logouts, deep links |
| 2 | Product status | Fully open, Google OAuth | Primary CTA is "Sign in with Google" everywhere |
| 3 | Page scope | Standard SaaS: Hero → Features → How it works → Final CTA → Footer | Enough content for SEO, not overwhelming |
| 4 | Hero layout | Centered headline + CTAs, large dashboard preview rising from fold | Proves the "visual" promise immediately, Linear/Vercel feel |
| 5 | Rendering | Client-rendered React route (Approach 1) | Zero new infrastructure, Google indexes JS, meta tags already static |
| 6 | Logged-in users on `/` | Show landing anyway, swap "Sign in" → "Go to dashboard" in nav | No auto-redirect — users may intentionally revisit the landing to share it |

## Routing Changes

```
BEFORE                              AFTER
/            LoginPage              /            LandingPage  (public)
/dashboard   ProtectedRoute         /login       LoginPage    (moved, public)
/profile     ProtectedRoute         /dashboard   ProtectedRoute  (unchanged)
/assets      ProtectedRoute         /profile     ProtectedRoute  (unchanged)
/snapshots   ProtectedRoute         /assets      ProtectedRoute  (unchanged)
/analytics   ProtectedRoute         /snapshots   ProtectedRoute  (unchanged)
                                    /analytics   ProtectedRoute  (unchanged)
```

### Auth flow rules

- **Unauthenticated access to a protected route** → redirect to `/login` (was: redirect to `/`).
- **Successful login** → navigate to `/dashboard` (unchanged).
- **Logout** → navigate to `/` (landing), not `/login`.
- **Logged-in user visits `/login`** → redirect to `/dashboard` (LoginPage already does this via `<Navigate to="/dashboard" />`).
- **Logged-in user visits `/`** → render the landing. Nav CTA swaps from "Sign in" to "Go to dashboard". No automatic redirect.

### Files touched for routing

- `src/main.tsx` — add `/` → `LandingPage`, add `/login` → `LoginPage`.
- `src/components/ProtectedRoute.tsx` — change `<Navigate to="/" />` to `<Navigate to="/login" />`.
- `src/pages/LoginPage.tsx` — no change (the `if (user) return <Navigate to="/dashboard" />` branch is already correct).

## Page Structure

The landing page has six vertical sections. All use real semantic HTML so crawlers can parse them.

```
<header>                        — sticky nav
<main>
  <section id="hero">           — headline, subhead, CTAs, dashboard preview
  <section id="features">       — 4-card feature grid
  <section id="how">            — 3 numbered steps
  <section id="cta">             — final full-width CTA card
</main>
<footer>                        — single-line footer
```

### Section-by-section

#### 1. Nav (`<header>`)

- Sticky, top of viewport.
- Transparent background on top of the hero; becomes solid emerald on scroll (`motion-safe` transition).
- Contents:
  - Left: wordmark (small emerald dot + "One Day Investor")
  - Right: `Features` (scroll anchor to `#features`) + primary button ("Sign in" → `/login`; changes to "Go to dashboard" → `/dashboard` when `user` is truthy)
- Mobile: collapses to just the wordmark + primary button; `Features` link is hidden.

#### 2. Hero (`<section id="hero">`)

- Background: emerald radial gradient matching the OG image (`radial-gradient(ellipse at top left, #0f6d4f, #064e36, #02281c)`) + subtle grid texture overlay.
- Content (centered, max-width ~960px):
  - Tiny eyebrow label: `▪ ONE DAY INVESTOR` (small uppercase, emerald-300)
  - **`<h1>`**: "A calm, visual way to watch your wealth grow." (72–96px display weight 700, accent gradient on the second line)
  - Subhead (`<p>`): "Track every pocket, asset and trend in one place. Free. No spreadsheets." (~20px, emerald-200)
  - CTA row:
    - Primary: `Sign in with Google` — real `<Link to="/login">` styled as a button with Google icon
    - Secondary: `How it works` — real `<a href="#how">` styled as a ghost button
- Decorative SVG sparkline rising from bottom-right corner (same design as OG image), `aria-hidden="true"`.
- Below the CTAs, the **dashboard preview** (see §3).

#### 3. Dashboard preview (inside hero)

- A `<picture>` element inside a rounded card with a large shadow (`shadow-2xl`), rising from the bottom of the hero into the next section.
- `<picture>` contains a WebP source and a PNG fallback `<img>`, both pointing to the committed screenshots in `public/`.
- Source PNG captured at 2400×1600 (2× for Retina). WebP target <100 KB, PNG fallback target <200 KB.
- `<img>` attributes: `alt="The One Day Investor dashboard showing portfolio total, distribution donut, and timeline chart."`, `loading="eager"`, `fetchpriority="high"` (hero image — no lazy loading), explicit `width` and `height` to prevent CLS.
- The card has a soft gradient fade at the bottom so it blends into the next section.

**Capture procedure (one-time):**
1. Seed the dev database with demo data (or use an existing snapshot with realistic numbers).
2. Run the frontend dev server against that data.
3. Open `/dashboard` in the Playwright MCP, resize viewport to 1600×1000, screenshot.
4. Commit PNG to `apps/frontend/public/landing-dashboard-preview.png`.
5. Optionally produce a WebP version next to it.

#### 4. Features (`<section id="features">`)

- Eyebrow label: `FEATURES`
- **`<h2>`**: "Built for how real portfolios actually work."
- 4-card grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`):
  1. **Pockets** — Lucide `Layers` icon. "Group holdings however you actually think about them — by broker, by strategy, by goal, by anything. Nest pockets as deep as you need."
  2. **Assets** — Lucide `Wallet` icon. "Track every crypto and investment holding across every pocket in one searchable table. Live prices included."
  3. **Snapshots** — Lucide `Camera` icon. "Capture your whole portfolio on a schedule you pick. Every snapshot is a dated record you can revisit and compare."
  4. **Analytics** — Lucide `BarChart3` icon. "Distribution donut, timeline chart, largest holdings — the whole picture, always one click away."
- Card style: subtle white card on a very light emerald background, 1px border, small radius. Icons in emerald-600. Titles as `<h3>`.

#### 5. How it works (`<section id="how">`)

- Eyebrow label: `HOW IT WORKS`
- **`<h2>`**: "Three steps to a portfolio you can actually read."
- Numbered vertical list, three items (on desktop: horizontal 3-column; on mobile: stacked):
  1. **Sign in with Google** — "One click. No new password, no email verification dance."
  2. **Organize into pockets** — "Add the brokers, wallets, and accounts you already use. Group them however makes sense to you."
  3. **Snapshot, then watch it grow** — "Record monthly totals. See trends, distribution, and the one chart that matters most — your portfolio over time."
- Big circled numbers (emerald background, cream numeral), small h3 titles, 1-sentence bodies.

#### 6. Final CTA (`<section id="cta">`)

- Full-width card with the same emerald gradient as the hero (visual bookend).
- Centered content:
  - **`<h2>`**: "Start watching your wealth grow."
  - Primary button: `Sign in with Google` → `/login`
- No subhead needed — the page has already made its case.

#### 7. Footer (`<footer>`)

- Single horizontal line on desktop, 2 rows on mobile:
  - Left: wordmark (small emerald dot + "One Day Investor")
  - Center/Right: `© 2026` · `GitHub` (link to repo if public, omit otherwise)
- Very muted — this is just the page boundary, not navigation.

## Component Breakdown

New files under `apps/frontend/src/`:

| Path | Purpose |
|---|---|
| `pages/LandingPage.tsx` | Composes all sections. Includes `<script type="application/ld+json">` for structured data. |
| `components/landing/LandingNav.tsx` | Sticky nav, transparent → solid on scroll, auth-aware CTA |
| `components/landing/LandingHero.tsx` | Headline, subhead, CTAs, sparkline decoration |
| `components/landing/LandingDashboardPreview.tsx` | The `<img>` card with shadow and gradient fade |
| `components/landing/LandingFeatures.tsx` | H2 + 4-card feature grid |
| `components/landing/LandingHowItWorks.tsx` | H2 + 3 numbered steps |
| `components/landing/LandingFinalCta.tsx` | Full-width emerald CTA card |
| `components/landing/LandingFooter.tsx` | Single-line footer |

Static assets:

| Path | Purpose |
|---|---|
| `apps/frontend/public/landing-dashboard-preview.webp` | Dashboard screenshot (WebP, primary), 2400×1600, target <100 KB |
| `apps/frontend/public/landing-dashboard-preview.png` | Dashboard screenshot (PNG fallback), 2400×1600, target <200 KB |

Files touched (not created):

| Path | Change |
|---|---|
| `src/main.tsx` | Add `/` → `LandingPage`, add `/login` → `LoginPage` |
| `src/components/ProtectedRoute.tsx` | Redirect target `/` → `/login` |
| `src/lib/metadata.ts` | No change — landing uses the default static head |

**Why split the landing into 7 components?** Each has one clear purpose, they fit comfortably in context, and `LandingPage.tsx` reads like a table of contents. Inline would be ~600 lines of JSX in one file.

**Shared primitives:** reuse existing `Button` from `@/components/ui/button`, Lucide icons (already installed), Tailwind classes, and the emerald tokens from `index.css`. **No new dependencies.**

## SEO

### Real HTML structure

- Exactly one `<h1>`: the hero headline.
- `<h2>` for each section title (Features, How it works, Final CTA, plus the implicit section that Hero counts as — its `<h1>` is the "section heading" for the hero).
- `<h3>` for feature card titles and step titles.
- Real `<a>` / `<Link>` for every navigation and CTA — no `onClick` divs.
- Semantic tags: `<header>`, `<main>`, `<section>`, `<footer>`.

### JSON-LD structured data

Embedded once in `LandingPage.tsx` via `<script type="application/ld+json">`:

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "One Day Investor",
  "url": "https://odinvestor.net",
  "description": "A calm, visual way to watch your wealth grow.",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}
```

### Meta tags

- Landing inherits the default static head from `index.html` (set in the metadata work on branch `feat/page-metadata`).
- `LandingPage` does **not** call `usePageMeta` — we want the brand-first `<title>` the static head already provides: `"One Day Investor — A calm, visual way to watch your wealth grow."`
- Canonical URL already set to `https://odinvestor.net/`.

### Internal linking

- `#features` anchor in hero → features section
- `#how` anchor in hero (secondary CTA) → how-it-works section
- Every `Sign in with Google` button is a real `<Link to="/login">` — crawlers follow these and discover `/login` as a sub-resource.

### Image SEO

- Dashboard preview `alt`: "The One Day Investor dashboard showing portfolio total, distribution donut, and timeline chart."
- Decorative SVGs: `aria-hidden="true"`, no `alt`.

## Accessibility

- **Skip link:** `<a href="#main" class="sr-only focus:not-sr-only">Skip to content</a>` as first element inside `<body>` (actually inside `LandingPage`'s root).
- **Keyboard:** all CTAs are real links/buttons. Tab order follows reading order.
- **Focus rings:** reuse the existing `focus-visible:ring-ring/50` pattern from the app's UI kit.
- **Contrast:** cream (`#ecfdf5`) on emerald-950 ≈ 12:1 (AAA). White-card sections use the app's default `text-foreground` on `bg-background`.
- **Motion:** nav transparent → solid transition uses `motion-safe:transition-colors`. No auto-playing animations.
- **Landmarks:** `<header>`, `<main id="main">`, `<footer>`.

## Responsive behavior

| Breakpoint | Behavior |
|---|---|
| `<640px` (mobile) | Hero stacks tight, features = 1 column, how-it-works = stacked, nav collapses to wordmark + button, dashboard preview scales to full width with some horizontal padding |
| `640–1024px` (tablet) | Features = 2×2 grid, how-it-works stays horizontal, rest unchanged |
| `≥1024px` (desktop) | As drawn in §Page Structure. Hero max-width ~960px, container max-width 1200px |

## Performance

- **Dashboard preview** is the critical render path. WebP target <100 KB, PNG fallback target <200 KB. Use `loading="eager" fetchpriority="high"` on the `<img>` inside `<picture>`.
- **No webfonts beyond what `index.html` already loads.**
- **No client-side data fetching** on the landing — no TanStack Query calls, no auth calls, no distribution/timeline hooks. The landing is pure presentation.
- **Target Lighthouse scores on desktop:** Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95, SEO = 100.

## Testing / Verification

Before considering complete:

1. **Build passes:** `bun run --cwd apps/frontend build` exits 0.
2. **Dev server renders:** `bun run --cwd apps/frontend dev` → `/` shows landing, `/login` shows login, `/dashboard` redirects to `/login` when logged out.
3. **Static HTML inspection:** `curl http://localhost:5173 | grep -E '<h1|<h2|<h3'` — should show the real headings (Vite dev server serves the same JS-rendered HTML Google would).
4. **Structured data valid:** paste the JSON-LD into https://validator.schema.org/ — no errors.
5. **Lighthouse on landing:** run `lighthouse http://localhost:4173/` (after `bun run preview`) — confirm targets.
6. **Keyboard nav:** Tab through the landing — every CTA reachable, focus ring visible.
7. **Responsive:** resize browser between 375px → 768px → 1440px, confirm no layout break.
8. **Auth flow smoke test:**
   - Logged out → visit `/dashboard` → lands on `/login`.
   - Logged out → click "Sign in with Google" from landing → lands on `/login`.
   - Logged in → visit `/` → sees landing with "Go to dashboard" button.
   - Logged in → visit `/login` → redirects to `/dashboard`.
   - Logout → lands on `/`.
9. **Link sanity:** every `<Link>` and `<a href>` on the landing goes somewhere real.

## Open questions

None. All decisions locked during brainstorming.

## Follow-ups (not this spec)

- `robots.txt` + `sitemap.xml` — trivial additions when the landing is live.
- Blog / changelog / pricing page.
- Pre-rendering at build time if SEO metrics prove insufficient (`vite-react-ssg` is the drop-in upgrade).
- Auto-capture the dashboard preview on every build (Playwright step in CI).
- Google Search Console verification.
