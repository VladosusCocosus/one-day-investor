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
