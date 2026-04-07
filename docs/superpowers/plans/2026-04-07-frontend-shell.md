# Frontend App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible sidebar navigation, auth-gated routing, and placeholder pages using shadcn/ui components.

**Architecture:** React Router handles routing with a layout route wrapping authenticated pages. A custom sidebar component uses shadcn primitives (Button, Avatar, Tooltip, Card). Auth state from the existing `useAuth` hook determines whether to show the login page or the app shell. Sidebar collapse state persists in localStorage.

**Tech Stack:** React 19, React Router 7, Tailwind CSS 4, shadcn/ui (Button, Avatar, Tooltip, Card), Lucide React

---

## File Structure

```
apps/frontend/
├── components.json              # shadcn config (create)
├── src/
│   ├── lib/
│   │   └── utils.ts             # cn() utility (create)
│   ├── components/
│   │   ├── ui/                  # shadcn auto-generated (create via CLI)
│   │   │   ├── button.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── card.tsx
│   │   ├── AppLayout.tsx        # sidebar + outlet wrapper (create)
│   │   ├── Sidebar.tsx          # collapsible sidebar nav (create)
│   │   └── ProtectedRoute.tsx   # auth guard (create)
│   ├── pages/
│   │   ├── LoginPage.tsx        # centered login card (create)
│   │   ├── DashboardPage.tsx    # placeholder dashboard (create)
│   │   ├── ProfilePage.tsx      # placeholder profile (create)
│   │   └── AssetsPage.tsx       # placeholder assets (create)
│   ├── hooks/
│   │   └── useAuth.ts           # existing — extract AuthContext (modify)
│   ├── main.tsx                 # routing setup (modify)
│   └── index.css                # add shadcn CSS variables (modify)
```

---

### Task 1: Install shadcn/ui and dependencies

**Files:**
- Modify: `apps/frontend/package.json`
- Modify: `apps/frontend/tsconfig.app.json`
- Modify: `apps/frontend/vite.config.ts`
- Create: `apps/frontend/components.json`
- Create: `apps/frontend/src/lib/utils.ts`
- Modify: `apps/frontend/src/index.css`

shadcn/ui for Vite+React requires a path alias `@` → `./src` and the `cn()` utility. We configure everything manually rather than running `npx shadcn init` to keep full control.

- [ ] **Step 1: Install dependencies**

Run from `apps/frontend/`:
```bash
cd apps/frontend && bun add clsx tailwind-merge class-variance-authority lucide-react @radix-ui/react-avatar @radix-ui/react-tooltip @radix-ui/react-slot
```

- [ ] **Step 2: Add path alias to tsconfig.app.json**

In `apps/frontend/tsconfig.app.json`, add `baseUrl` and `paths` to compilerOptions:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "types": ["vite/client"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Add path alias to vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
      react(),
      tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 4: Create cn() utility**

Create `apps/frontend/src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 5: Create components.json**

Create `apps/frontend/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 6: Add shadcn CSS variables to index.css**

Replace `apps/frontend/src/index.css` with:

```css
@import "tailwindcss";
@import "tailwindcss/preflight.css" layer(base);

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 238.7 83.5% 66.7%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 238.7 83.5% 66.7%;
    --radius: 0.5rem;
    --sidebar: 0 0% 100%;
    --sidebar-border: 220 13% 91%;
    --sidebar-foreground: 222.2 84% 4.9%;
    --sidebar-muted: 210 40% 96.1%;
    --sidebar-muted-foreground: 215.4 16.3% 46.9%;
    --sidebar-accent: 238.7 83.5% 66.7%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@utility bg-sidebar {
  background-color: hsl(var(--sidebar));
}
@utility border-sidebar {
  border-color: hsl(var(--sidebar-border));
}
@utility text-sidebar-foreground {
  color: hsl(var(--sidebar-foreground));
}
@utility bg-sidebar-muted {
  background-color: hsl(var(--sidebar-muted));
}
@utility text-sidebar-muted-foreground {
  color: hsl(var(--sidebar-muted-foreground));
}
@utility text-sidebar-accent {
  color: hsl(var(--sidebar-accent));
}
```

Note: Tailwind CSS v4 uses `@utility` instead of `@apply` for custom utilities. The CSS variables use the HSL format without `hsl()` wrapper — shadcn components reference them as `hsl(var(--name))`.

- [ ] **Step 7: Add shadcn components via CLI**

Run from `apps/frontend/`:
```bash
cd apps/frontend && bunx --bun shadcn@latest add button avatar tooltip card --yes
```

This creates files in `src/components/ui/`.

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/
git commit -m "feat(frontend): install shadcn/ui with button, avatar, tooltip, card components"
```

---

### Task 2: Create AuthContext provider

The current `useAuth` hook fetches auth state independently per component. We need a shared context so multiple components (Sidebar, ProtectedRoute, pages) share one auth state without duplicate API calls.

**Files:**
- Create: `apps/frontend/src/hooks/AuthContext.tsx`
- Modify: `apps/frontend/src/hooks/useAuth.ts`
- Modify: `apps/frontend/src/main.tsx`

- [ ] **Step 1: Create AuthContext**

Create `apps/frontend/src/hooks/AuthContext.tsx`:

```tsx
import { createContext, useState, useEffect, type ReactNode } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<User>("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext value={{ user, loading, login, logout }}>
      {children}
    </AuthContext>
  );
}
```

- [ ] **Step 2: Simplify useAuth to consume context**

Replace `apps/frontend/src/hooks/useAuth.ts` with:

```typescript
import { use } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue } from "./AuthContext";

export type { AuthContextValue };

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

- [ ] **Step 3: Wrap router with AuthProvider in main.tsx**

Replace `apps/frontend/src/main.tsx` with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { AuthProvider } from "./hooks/AuthContext";
import { Home } from "./pages/Home";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Home />,
    },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router}/>
    </AuthProvider>
  </StrictMode>,
)
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

Expected: no errors. The existing Home page should still work since `useAuth` has the same return type.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/hooks/ apps/frontend/src/main.tsx
git commit -m "refactor(frontend): extract auth state into shared AuthContext provider"
```

---

### Task 3: Create LoginPage

Replace the current Home page with a polished login card using shadcn Card and Button.

**Files:**
- Create: `apps/frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: Create LoginPage component**

Create `apps/frontend/src/pages/LoginPage.tsx`:

```tsx
import { Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginPage() {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <Card className="w-[380px] shadow-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--primary))]">
            <span className="text-xl font-bold text-white">I</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">One Day Investor</h1>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">
            Sign in to manage your portfolio
          </p>
          <Button
            variant="outline"
            className="w-full gap-2.5 py-5 text-sm font-medium cursor-pointer"
            onClick={login}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/LoginPage.tsx
git commit -m "feat(frontend): add LoginPage with centered card and Google sign-in"
```

---

### Task 4: Create ProtectedRoute component

**Files:**
- Create: `apps/frontend/src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Create ProtectedRoute**

Create `apps/frontend/src/components/ProtectedRoute.tsx`:

```tsx
import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/ProtectedRoute.tsx
git commit -m "feat(frontend): add ProtectedRoute auth guard component"
```

---

### Task 5: Create Sidebar component

**Files:**
- Create: `apps/frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar**

Create `apps/frontend/src/components/Sidebar.tsx`:

```tsx
import { NavLink, useNavigate } from "react-router";
import { LayoutDashboard, User, Layers, PanelLeftClose, PanelLeft, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Profile", icon: User, path: "/profile" },
  { label: "Assets", icon: Layers, path: "/assets" },
] as const;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-sidebar bg-sidebar transition-[width] duration-200",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center px-3 pt-4 pb-5",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
              <span className="text-xs font-bold text-white">I</span>
            </div>
            {!collapsed && (
              <span className="text-[15px] font-semibold text-sidebar-foreground">
                Investor
              </span>
            )}
          </div>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-sidebar-muted-foreground"
              onClick={onToggle}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-[60px] top-4 -ml-3 h-6 w-6 rounded-full border bg-background text-muted-foreground shadow-sm opacity-0 transition-opacity group-hover/sidebar:opacity-100 hover:opacity-100"
                  onClick={onToggle}
                >
                  <PanelLeft className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const link = (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-muted text-sidebar-accent"
                      : "text-sidebar-muted-foreground hover:bg-sidebar-muted/50 hover:text-sidebar-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User section */}
        <div
          className={cn(
            "border-t border-sidebar mx-2 px-2 py-3",
            collapsed ? "flex flex-col items-center gap-2" : "flex items-center gap-2.5"
          )}
        >
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={user?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-sidebar-foreground">
                  {user?.name ?? "User"}
                </p>
                <p className="truncate text-[11px] text-sidebar-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 text-sidebar-muted-foreground"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            </>
          )}
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-sidebar-muted-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/Sidebar.tsx
git commit -m "feat(frontend): add collapsible Sidebar with nav items and user section"
```

---

### Task 6: Create AppLayout component

**Files:**
- Create: `apps/frontend/src/components/AppLayout.tsx`

- [ ] **Step 1: Create AppLayout**

Create `apps/frontend/src/components/AppLayout.tsx`:

```tsx
import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";

const SIDEBAR_KEY = "sidebar-collapsed";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div className="group/sidebar flex h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main className="flex-1 overflow-auto bg-[#f8fafc] p-6">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/AppLayout.tsx
git commit -m "feat(frontend): add AppLayout with sidebar and main content area"
```

---

### Task 7: Create placeholder page components

**Files:**
- Create: `apps/frontend/src/pages/DashboardPage.tsx`
- Create: `apps/frontend/src/pages/ProfilePage.tsx`
- Create: `apps/frontend/src/pages/AssetsPage.tsx`

- [ ] **Step 1: Create DashboardPage**

Create `apps/frontend/src/pages/DashboardPage.tsx`:

```tsx
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  { label: "Total Assets", value: "—" },
  { label: "Return", value: "—" },
  { label: "Positions", value: "—" },
];

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back, {user?.name ?? "there"}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Content will go here</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create ProfilePage**

Create `apps/frontend/src/pages/ProfilePage.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";

export function ProfilePage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your account settings
      </p>

      <Card className="mt-6">
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Profile settings will go here</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create AssetsPage**

Create `apps/frontend/src/pages/AssetsPage.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";

export function AssetsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Assets</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track your investment portfolio
      </p>

      <Card className="mt-6">
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Asset management will go here</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/
git commit -m "feat(frontend): add Dashboard, Profile, and Assets placeholder pages"
```

---

### Task 8: Wire up routing and delete old Home page

**Files:**
- Modify: `apps/frontend/src/main.tsx`
- Delete: `apps/frontend/src/pages/Home.tsx`

- [ ] **Step 1: Update main.tsx with full routing**

Replace `apps/frontend/src/main.tsx` with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { AuthProvider } from "./hooks/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AssetsPage } from "./pages/AssetsPage";

const router = createBrowserRouter([
  {
    path: "/",
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
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router}/>
    </AuthProvider>
  </StrictMode>,
)
```

- [ ] **Step 2: Delete old Home page**

```bash
rm apps/frontend/src/pages/Home.tsx
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/frontend && bunx tsc -b --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/main.tsx && git rm apps/frontend/src/pages/Home.tsx
git commit -m "feat(frontend): wire up auth-gated routing with sidebar layout"
```

---

### Task 9: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
cd apps/frontend && bun run dev
```

- [ ] **Step 2: Test unauthenticated flow**

Open the app URL in browser. Verify:
- Centered login card appears with app logo, title, tagline, and Google button
- No sidebar visible
- Navigating to `/dashboard` redirects back to `/`

- [ ] **Step 3: Test authenticated flow**

Click "Continue with Google" and complete OAuth. Verify:
- Redirected to `/dashboard`
- Sidebar appears with Dashboard, Profile, Assets nav items
- Dashboard shows stat cards and placeholder content
- User avatar, name, and email visible at sidebar bottom
- Clicking Profile navigates to `/profile`, active state updates in sidebar
- Clicking Assets navigates to `/assets`, active state updates in sidebar

- [ ] **Step 4: Test sidebar collapse**

- Click the collapse toggle (◀ icon)
- Sidebar collapses to icon-only rail
- Hover over nav icons shows tooltips with labels
- Refresh page — sidebar stays collapsed (localStorage)
- Expand sidebar — stays expanded on refresh

- [ ] **Step 5: Test logout**

Click logout icon in sidebar. Verify:
- Redirected to login page
- Navigating to `/dashboard` redirects back to `/`

- [ ] **Step 6: Fix any issues found, then final commit if needed**
