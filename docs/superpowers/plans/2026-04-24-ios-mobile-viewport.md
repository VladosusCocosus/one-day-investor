# iOS Mobile Viewport & Safe-Area Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix iOS Safari mobile layout defects in `apps/frontend` so sticky headers, the bottom tab bar, pull-to-refresh, and dynamic viewport height behave correctly on iPhone (both Safari and PWA).

**Architecture:** HTML + CSS only. Five edits across four files: (1) enable safe-area insets via `viewport-fit=cover`, (2) disable document-level pull-to-refresh, (3) migrate `100vh` → `100dvh`, (4) add safe-area padding to the mobile top bar and `<main>`.

**Tech Stack:** React 19, Vite, Tailwind CSS 4, TypeScript. No test runner in this app — verification is `tsc` + `vite build` + manual device test.

**Reference spec:** `docs/superpowers/specs/2026-04-24-ios-mobile-viewport-design.md`

**Working directory for all `bun` / `git` commands:** `/Users/pavel/Projects/one-day-investor`

---

### Task 1: Enable safe-area insets on the viewport

**Files:**
- Modify: `apps/frontend/index.html:5`

**Why this is first:** Every subsequent `env(safe-area-inset-*)` reference in the code is a no-op until this lands. Doing this first means later tasks can be verified end-to-end on device as they're committed.

- [ ] **Step 1: Add `viewport-fit=cover` to the viewport meta tag**

Change line 5 of `apps/frontend/index.html` from:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

to:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/index.html
git commit -m "fix(frontend): enable viewport-fit=cover for iOS safe-area insets"
```

---

### Task 2: Disable document-level pull-to-refresh

**Files:**
- Modify: `apps/frontend/src/index.css` (extend existing `@layer base` block that starts at line 53)

- [ ] **Step 1: Add `overscroll-behavior-y: none` to html and body**

The existing `@layer base` block at lines 53–61 already targets `*` and `body`. Extend it so the final block reads:

```css
@layer base {
  * {
    border-color: var(--color-border);
  }
  html,
  body {
    overscroll-behavior-y: none;
  }
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/index.css
git commit -m "fix(frontend): disable document overscroll to stop iOS pull-to-refresh"
```

---

### Task 3: Use dynamic viewport height on the root layout

**Files:**
- Modify: `apps/frontend/src/components/AppLayout.tsx:90`

- [ ] **Step 1: Replace `h-screen` with `h-dvh` on the root container**

Change line 90 from:

```tsx
    <div className="group/sidebar flex h-screen">
```

to:

```tsx
    <div className="group/sidebar flex h-dvh">
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/AppLayout.tsx
git commit -m "fix(frontend): use dynamic viewport height (dvh) on app layout root"
```

---

### Task 4: Reserve safe-area-aware bottom padding on `<main>`

**Files:**
- Modify: `apps/frontend/src/components/AppLayout.tsx:94`

- [ ] **Step 1: Replace `pb-20` on `<main>` with an inset-aware calc**

Change line 94 from:

```tsx
        <main className="flex-1 overflow-auto bg-[#f8fafc] p-4 pb-20 md:p-6 md:pb-6">
```

to:

```tsx
        <main className="flex-1 overflow-auto bg-[#f8fafc] p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
```

The `5rem` value matches the original `pb-20` (both equal `80px`). The added `env(safe-area-inset-bottom)` gives content breathing room above the home indicator on iPhones that have one.

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/AppLayout.tsx
git commit -m "fix(frontend): add home-indicator inset to main content bottom padding"
```

---

### Task 5: Add safe-area top padding to the mobile top bar

**Files:**
- Modify: `apps/frontend/src/components/AppLayout.tsx:35`

- [ ] **Step 1: Split `py-3` into explicit `pb-3` + arbitrary `pt-*` on `MobileTopBar`**

Change line 35 from:

```tsx
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
```

to:

```tsx
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
```

The `0.75rem` preserves the original top padding (`py-3` = `0.75rem`); the inset is added on top so the notch and status bar never overlap the header content in landscape or in the standalone PWA.

We split `py-3` into an explicit `pb-3` plus an arbitrary `pt-*` so only one Tailwind rule targets `padding-top` — otherwise generated-CSS order would decide which wins, which is fragile.

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/AppLayout.tsx
git commit -m "fix(frontend): add safe-area-inset-top padding to mobile top bar"
```

---

### Task 6: Migrate `SnapshotListRail` height calc to `dvh`

**Files:**
- Modify: `apps/frontend/src/components/SnapshotListRail.tsx:74`

- [ ] **Step 1: Replace `100vh` with `100dvh` in the max-height calc**

Change line 74 from:

```tsx
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
```

to:

```tsx
      <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto">
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/components/SnapshotListRail.tsx
git commit -m "fix(frontend): use dvh in SnapshotListRail max-height calc"
```

---

### Task 7: Verify build, lint, and type check

**Files:**
- None modified.

- [ ] **Step 1: Run type check + production build**

From the repo root:

```bash
cd apps/frontend && bun run build
```

Expected: the build completes. `tsc -b` reports no type errors; `vite build` writes `dist/` with no warnings about the new Tailwind arbitrary values.

- [ ] **Step 2: Run linter**

```bash
cd apps/frontend && bun run lint
```

Expected: zero errors. (Lint scope is TS/JS; CSS/HTML edits are not linted.)

- [ ] **Step 3: If anything fails, fix inline and re-run**

Fix any reported issue, stage the fix, and commit with a message like `fix(frontend): address <tool> <error>`. Re-run the failing command until it passes.

---

### Task 8: Manual device verification

**Files:**
- None modified. This task gates correctness — safe-area insets return `0` in devtools, so device testing is authoritative.

- [ ] **Step 1: Start the dev server and open the network URL on an iPhone**

```bash
cd apps/frontend && bun run dev
```

Vite prints both a `Local:` and a `Network:` URL (e.g. `http://192.168.x.x:5173`). Open the network URL on a real iPhone connected to the same Wi-Fi. If no `Network:` URL appears, re-run Vite with `--host` (`bun run dev -- --host`). The repo's Vite config already allows all hosts, so the iPhone will connect without further configuration.

- [ ] **Step 2: Verify URL-bar behavior**

Scroll up and down on any authenticated page (e.g. `/dashboard`). Safari's URL bar should hide on scroll down and reappear on scroll up. The layout should NOT jump when this happens — the bottom tab bar stays locked to the bottom of the visible area throughout.

- [ ] **Step 3: Verify bottom nav clearance**

Open `/dashboard` and scroll to the end of the page. The last row of content must sit above the tab bar with visible whitespace (from `env(safe-area-inset-bottom)` on iPhones with a home indicator).

The tab bar itself must not be overlapped by the home indicator — the icons and labels should sit above it.

- [ ] **Step 4: Verify pull-to-refresh is disabled**

On any page, scroll to the very top and try to pull down. The page must NOT bounce and must NOT trigger Safari's refresh gesture.

- [ ] **Step 5: Verify top bar safe-area in landscape**

Rotate the phone to landscape. The mobile top bar (app name + avatar) must sit clear of the notch / camera cutout on the left edge.

- [ ] **Step 6: (Optional) Verify standalone PWA**

From Safari's Share sheet, tap "Add to Home Screen" to install the PWA. Open it from the home screen and repeat steps 2–5. Behavior should be identical (status bar / home-indicator insets applied; no URL-bar jump because a PWA has no URL bar).

- [ ] **Step 7: Report pass / fail**

If every check passes, the fix is done. If any check fails, stop and diagnose — the spec's "Risks & trade-offs" section is the first place to look.

---

## Notes for the implementer

- **No test runner in this app.** There is no `test` script in `apps/frontend/package.json`. TDD would normally drive these changes via Playwright visual regression, but that infrastructure is not set up here. The gate is manual device testing (Task 8). Do not skip it — safe-area insets are synthesized as `0` in Chrome devtools, so desktop verification cannot catch home-indicator or notch bugs.
- **Tailwind 4 arbitrary values with `env()`.** Already used in the same file (`MobileTabBar` declares `pb-[env(safe-area-inset-bottom)]`), so the pattern is known to round-trip through the Tailwind 4 JIT. No `safelist` config needed.
- **Commit granularity.** One commit per task. Each task is independently revertible if device testing surfaces a regression specific to that change.
- **Drawers (`AssetDrawer`, `PocketDrawer`, `SnapshotDrawer`) are intentionally not touched.** They don't use `vh` and aren't `position: fixed` at the viewport edge, so they inherit the correct behavior through their parents.
