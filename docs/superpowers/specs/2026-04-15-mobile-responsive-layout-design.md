# Mobile Responsive Layout

## Overview

Make the main application layout mobile-friendly by hiding the left sidebar on small screens and replacing it with a top bar + bottom tab bar pattern.

## Breakpoint

`md` (768px). Below: mobile layout. At and above: existing desktop sidebar layout unchanged.

## Mobile Layout Structure

### Top Bar (mobile only)

- Visible below `md` breakpoint (`md:hidden`)
- Left: Logo icon (24px gradient square) + "One Day Investor" text
- Right: User avatar (initials or image, 32px circle), clickable — navigates to `/profile`
- White background (`bg-white`), bottom border (`border-b border-gray-200`), sticky at top
- Padding: `px-4 py-3`

### Content Area

- Full width, no sidebar on mobile
- Padding: `p-4` on mobile, `p-6` on desktop (existing)
- Bottom padding increased on mobile to clear the tab bar: `pb-20` on mobile

### Bottom Tab Bar (mobile only)

- Visible below `md` breakpoint (`md:hidden`)
- Fixed at bottom of viewport
- White background, top border (`border-t border-gray-200`)
- 4 tabs equally spaced:
  1. Dashboard — grid icon — `/dashboard`
  2. Assets — wallet icon — `/assets`
  3. Snapshots — trending-up icon — `/snapshots`
  4. Analytics — bar-chart icon — `/analytics`
- Each tab: icon (20px) + label (text-xs) stacked vertically
- Active tab: primary color (`text-emerald-600`), inactive: `text-gray-400`
- Active tab determined by current route via `useLocation()`
- Safe area padding for notched devices: `pb-safe` or `env(safe-area-inset-bottom)`

### Desktop Layout (unchanged)

- Sidebar gets `hidden md:flex` — completely hidden on mobile, visible flex column on desktop
- AppLayout wrapper keeps existing horizontal flex for `md:` and up
- No changes to sidebar functionality, collapse behavior, or styling on desktop

## Files Modified

| File | Change |
|------|--------|
| `apps/frontend/src/components/Sidebar.tsx` | Add `hidden md:flex` to root element |
| `apps/frontend/src/components/AppLayout.tsx` | Add `MobileTopBar` and `MobileTabBar` components (inline in same file), responsive padding on main content |

## Not in Scope

- Swipe gestures
- Mobile-specific page layouts (grid columns already use responsive breakpoints)
- PWA features
- Landscape-specific handling
