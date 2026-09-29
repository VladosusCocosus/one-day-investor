import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import type { NavLinkRenderProps } from "react-router";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Layers, Camera, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { Sidebar } from "./Sidebar";
import Icon from "../assets/logo.svg?react";

const SIDEBAR_KEY = "sidebar-collapsed";

const mobileNavItems = [
  { labelKey: "nav.dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { labelKey: "nav.assets", icon: Layers, path: "/assets-managment" },
  { labelKey: "nav.snapshots", icon: Camera, path: "/snapshots" },
  { labelKey: "nav.analytics", icon: BarChart3, path: "/analytics" },
] as const;

function MobileTopBar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
      <div className="flex items-center gap-2">
        <Icon width={24} height={24} />
        <span className="text-[15px] font-semibold text-gray-900">
          {t("common.appNameShort")}
        </span>
      </div>
      <button
        onClick={() => navigate("/profile")}
        className="cursor-pointer"
        aria-label={t("nav.profile")}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </button>
    </header>
  );
}

function MobileTabBar() {
  const { t } = useTranslation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {mobileNavItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }: NavLinkRenderProps) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              isActive ? "text-emerald-600" : "text-gray-400"
            }`
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  useLanguageSync();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div className="group/sidebar flex h-dvh">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileTopBar />
        <main className="flex-1 overflow-auto bg-[#f8fafc] p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
          <Outlet />
        </main>
        <MobileTabBar />
      </div>
    </div>
  );
}
