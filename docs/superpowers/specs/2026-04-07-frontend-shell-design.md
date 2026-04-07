# Frontend App Shell & Auth Flow Design

## Overview

Redesign the frontend to add a proper app shell with sidebar navigation, routing, and auth-gated layout. Install and use shadcn/ui as the component library. All pages are empty placeholders for now — focus is on the shell structure and auth flow.

## Tech Stack

- React 19 + React Router 7 (already installed)
- Tailwind CSS 4 (already installed)
- shadcn/ui (to be installed) — for Button, Avatar, Tooltip, and Sidebar components
- Axios (already installed) — for API calls
- Lucide React — icon library (comes with shadcn)

## Design Decisions

- **Theme:** Light only, no dark mode
- **Accent color:** Indigo (#6366f1) via shadcn CSS variables
- **Sidebar:** White background, collapsible (expanded ~240px, collapsed ~60px), with toggle button
- **Login:** Centered card on light gray background
- **Layout:** Sidebar + main content area with #f8fafc background

## Auth Flow

### Unauthenticated State
- User sees a centered login card at `/`
- Card contains: app logo (indigo square with "I"), app name "One Day Investor", tagline "Sign in to manage your portfolio", Google sign-in button
- Background: `#f8fafc` (light gray)
- No sidebar or navigation visible

### Authenticated State
- User is redirected to `/dashboard` after OAuth callback
- App shell renders with sidebar navigation
- Sidebar shows: logo + app name, nav items, user info at bottom
- All routes are protected — redirect to `/` if not authenticated

### Logout
- Logout icon button in sidebar user section
- Calls existing `POST /auth/logout` endpoint
- Redirects to `/` login page

## Routing

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/` | LoginPage | No (redirect to /dashboard if authenticated) |
| `/dashboard` | DashboardPage | Yes |
| `/profile` | ProfilePage | Yes |
| `/assets` | AssetsPage | Yes |

## Component Structure

### Layout Components

**AppLayout** — wrapper for authenticated pages
- Renders sidebar + main content area
- Handles sidebar collapse state (localStorage persisted)
- Wraps children in a flex container

**Sidebar** — left navigation
- Custom component using shadcn primitives (Button, Avatar, Tooltip), not the full shadcn Sidebar kit which is overly complex for 3 nav items
- Expanded state (~240px): logo + name, collapse toggle, nav items with icons + labels, user section with avatar + name + email + logout
- Collapsed state (~60px): logo icon only, nav icons with tooltips, user avatar only
- Active nav item: light indigo background, indigo icon + text
- Inactive: gray text, gray icon
- Collapse state saved to localStorage

**ProtectedRoute** — auth guard wrapper
- Checks `useAuth()` for user
- Shows loading spinner while checking
- Redirects to `/` if not authenticated

### Page Components (all placeholder)

**LoginPage**
- Centered card with logo, title, subtitle, Google button
- If already authenticated, redirect to `/dashboard`

**DashboardPage**
- Page title "Dashboard" with "Welcome back, {name}" subtitle
- 3 stat cards row: Total Assets, Return, Positions (all showing "—")
- Empty content card below

**ProfilePage**
- Page title "Profile"
- Empty state placeholder text

**AssetsPage**
- Page title "Assets"
- Empty state placeholder text

## Sidebar Navigation Items

| Label | Icon | Path |
|-------|------|------|
| Dashboard | LayoutDashboard (lucide) | /dashboard |
| Profile | User (lucide) | /profile |
| Assets | Layers (lucide) | /assets |

## shadcn/ui Components Needed

- **Button** — login button, logout action
- **Avatar** — user avatar in sidebar
- **Tooltip** — nav item labels when sidebar is collapsed
- **Card** — stat cards on dashboard, login card

## File Structure

```
apps/frontend/src/
├── components/
│   ├── ui/              # shadcn components (auto-generated)
│   ├── AppLayout.tsx    # sidebar + main content wrapper
│   ├── Sidebar.tsx      # navigation sidebar
│   └── ProtectedRoute.tsx # auth guard
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProfilePage.tsx
│   └── AssetsPage.tsx
├── hooks/
│   └── useAuth.ts       # existing, no changes needed
├── lib/
│   └── utils.ts         # shadcn cn() utility
├── main.tsx             # routing setup (update)
└── index.css            # tailwind + shadcn CSS variables
```

## Visual Specifications

### Colors
- Accent/Primary: Indigo `#6366f1`
- Active nav background: `#f1f5f9`
- Active nav text: `#6366f1`
- Inactive nav text: `#64748b`
- Inactive nav icon: `#94a3b8`
- Page background: `#f8fafc`
- Sidebar background: `#ffffff`
- Sidebar border: `#e5e7eb`
- Card background: `#ffffff`
- Heading text: `#0f172a`
- Body text: `#374151`
- Muted text: `#94a3b8`

### Spacing
- Sidebar padding: 16px 12px
- Main content padding: 24px
- Card padding: 16px
- Nav item padding: 8px 10px
- Nav item gap: 2px
- Card border radius: 10px
- Nav item border radius: 8px
