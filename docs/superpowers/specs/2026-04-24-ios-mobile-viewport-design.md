# iOS Mobile Viewport & Safe-Area Fix

**Date:** 2026-04-24
**Scope:** `apps/frontend`
**Type:** Bug fix / mobile polish

## Problem

On iOS Safari (and the installed PWA), the mobile layout of `apps/frontend` has four visible defects:

1. **Bottom nav overlap** — Safari's bottom toolbar and the home indicator can overlap the fixed mobile tab bar. The tab bar declares `pb-[env(safe-area-inset-bottom)]`, but the insets resolve to `0` because the viewport meta tag is missing `viewport-fit=cover`.
2. **URL-bar jump** — The root layout uses `h-screen` (`100vh`). On iOS, `100vh` is the large viewport (URL bar hidden), so when the URL bar is visible the layout exceeds the visible area, pushing the bottom nav partly off-screen and causing a visible shift when the bar auto-hides on scroll.
3. **Pull-to-refresh bounce** — With no `overscroll-behavior` set on the document, scrolling up at the top of a page triggers Safari's refresh gesture, reloading the SPA unexpectedly.
4. **Content hidden under the bottom nav** — `<main>` reserves `pb-20` (80 px) for the fixed nav but does not add the home-indicator inset, so the last row of content sits flush against the nav's bottom edge on iPhones with a home indicator.

A fifth, secondary issue: `SnapshotListRail` uses `max-h-[calc(100vh-12rem)]`, which inherits the same `100vh` bug.

## Non-goals

- Keyboard interaction (focusing an input pushing the layout). The user explicitly excluded this from scope.
- Safe-area work in individual drawers (`AssetDrawer`, `PocketDrawer`, `SnapshotDrawer`). Verified they don't use `vh` or fixed positioning, so they're unaffected.
- Tablet or desktop changes.
- Any JS-based viewport-height workaround (e.g. `--vh` on resize). `dvh` is supported on iOS ≥ 15.4 and is sufficient.

## Design

Pure HTML + CSS change. No new components, no hooks, no runtime JS. Five edits across four files.

### 1. `apps/frontend/index.html` — enable safe-area insets

Change the viewport meta tag to add `viewport-fit=cover`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

This is the prerequisite for `env(safe-area-inset-*)` to return non-zero values on iOS. Without it, the inset-aware padding already in `MobileTabBar` does nothing.

### 2. `apps/frontend/src/index.css` — disable pull-to-refresh

Extend the existing `@layer base` block:

```css
@layer base {
  html,
  body {
    overscroll-behavior-y: none;
  }
}
```

This disables the top-of-document overscroll that triggers Safari's pull-to-refresh. The `<main>` element scrolls inside its own `overflow-auto` container, so this only affects the document-level bounce.

### 3. `apps/frontend/src/components/AppLayout.tsx` — root height & content padding

**Root container (line 90):**

```diff
- <div className="group/sidebar flex h-screen">
+ <div className="group/sidebar flex h-dvh">
```

`100dvh` (dynamic viewport height) tracks the visible viewport as Safari hides and shows the URL bar, so the layout always matches the visible area.

**`<main>` padding (line 94):**

```diff
- <main className="flex-1 overflow-auto bg-[#f8fafc] p-4 pb-20 md:p-6 md:pb-6">
+ <main className="flex-1 overflow-auto bg-[#f8fafc] p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
```

`5rem` matches the 80 px reserved for the tab bar; adding `env(safe-area-inset-bottom)` gives content breathing room above the home indicator.

### 4. `apps/frontend/src/components/AppLayout.tsx` — top-bar safe-area

**`MobileTopBar` header (line 35):**

```diff
- <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
+ <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
```

We split the existing `py-3` into explicit `pb-3` + an arbitrary `pt-*` so only one rule targets `padding-top` (avoiding a Tailwind ordering ambiguity). `0.75rem` matches the original top padding; adding `env(safe-area-inset-top)` keeps the header content below the notch in landscape orientation and in the standalone PWA.

### 5. `apps/frontend/src/components/SnapshotListRail.tsx` — viewport height calc

**Line 74:**

```diff
- <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
+ <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto">
```

Same reasoning as the root container: `dvh` matches the visible viewport.

## Non-changes (explicit)

- **`MobileTabBar`** — already declares `pb-[env(safe-area-inset-bottom)]`. It begins working correctly once step 1 lands; no class changes needed.
- **`MobileTopBar` sticky behavior** — kept as-is. The header is a flex sibling of `<main>` inside a non-scrolling column, so `position: sticky` is effectively `top-0` here. This is fine and no rewrite is warranted.
- **Drawer components** — inspected and do not use `vh` or rely on viewport chrome. No changes.

## Testing & verification

**Local dev:** `bun run dev` in `apps/frontend`.

**Device testing (required for safe-area verification):**
- Real iPhone via local network. Verify:
  - Scrolling hides the URL bar without the layout jumping.
  - Bottom nav remains fully visible above both the URL bar and the home indicator.
  - The last content row in `<main>` is not flush against the tab bar.
  - Pull-to-refresh at the top of any page no longer triggers a reload — the page does not bounce.
  - In landscape, the top bar content sits below the notch.
- Optional: install as PWA from Safari's Share sheet; repeat the checks. Safe-area insets behave identically.

**Desktop sanity check:**
- Chrome devtools, iPhone 15 Pro viewport. Visual check for layout correctness only. Safe-area insets are synthesized as `0` in devtools, so device testing remains authoritative.

## Risks & trade-offs

- **`dvh` causes reflow when the URL bar toggles.** This is intentional — it's the behavior we need. Alternatives rejected: `svh` (permanently shorter, wastes space); `lvh` (permanently larger, reintroduces the current bug).
- **Tailwind 4 arbitrary values with `env()` inside `calc()`** — already used in `MobileTabBar.pb-[env(safe-area-inset-bottom)]`, so the Tailwind JIT/purge is known to handle this pattern.
- **Browser support** — `dvh`/`svh`/`lvh` require iOS Safari ≥ 15.4 (March 2022) and Chrome ≥ 108. Consistent with what the app already targets.
