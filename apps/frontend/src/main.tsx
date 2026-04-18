import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { AuthProvider } from "./hooks/AuthContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { PhilosophyPage } from "./pages/PhilosophyPage";
import { UnsubscribePage } from "./pages/UnsubscribePage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SnapshotsPage } from "./pages/SnapshotsPage";
import { AssetsPage } from "./pages/AssetsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { lazy, Suspense } from "react";

const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((m) => ({ default: m.AdminPage }))
);
const AdminLayout = lazy(() =>
  import("./components/AdminLayout").then((m) => ({ default: m.AdminLayout }))
);
const BlogPostList = lazy(() =>
  import("./pages/admin/BlogPostList").then((m) => ({ default: m.BlogPostList }))
);
const BlogPostEditor = lazy(() =>
  import("./pages/admin/BlogPostEditor").then((m) => ({ default: m.BlogPostEditor }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

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
    path: "/philosophy",
    element: <PhilosophyPage />,
  },
  {
    path: "/unsubscribe",
    element: <UnsubscribePage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/assets-managment", element: <AssetsPage /> },
          { path: "/snapshots", element: <SnapshotsPage /> },
          { path: "/analytics", element: <AnalyticsPage /> },
        ],
      },
      {
        element: <Suspense fallback={<div />}><AdminLayout /></Suspense>,
        children: [
          { path: "/admin", element: <Suspense fallback={<div />}><AdminPage /></Suspense> },
          { path: "/admin/blog", element: <Suspense fallback={<div />}><BlogPostList /></Suspense> },
          { path: "/admin/blog/new", element: <Suspense fallback={<div />}><BlogPostEditor /></Suspense> },
          { path: "/admin/blog/:id", element: <Suspense fallback={<div />}><BlogPostEditor /></Suspense> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router}/>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
