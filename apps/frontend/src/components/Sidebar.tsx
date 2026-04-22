import { NavLink, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, User, Layers, Camera, BarChart3, Bot, PanelLeftClose, PanelLeft, LogOut } from "lucide-react";
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
import Icon from "../assets/logo.svg?react"

const navItems = [
  { labelKey: "nav.dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { labelKey: "nav.profile", icon: User, path: "/profile" },
  { labelKey: "nav.assets", icon: Layers, path: "/assets-managment" },
  { labelKey: "nav.snapshots", icon: Camera, path: "/snapshots" },
  { labelKey: "nav.analytics", icon: BarChart3, path: "/analytics" },
  { labelKey: "nav.agents", icon: Bot, path: "/agents" },
] as const;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { t } = useTranslation();
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
          "hidden md:flex h-screen flex-col border-r border-sidebar bg-sidebar transition-[width] duration-200",
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
              <Icon width={24} height={24}/>
            {!collapsed && (
              <span className="text-[15px] font-semibold text-sidebar-foreground">
                {t("common.appNameShort")}
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
              <TooltipContent side="right">{t("sidebar.expandSidebar")}</TooltipContent>
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
                {!collapsed && <span>{t(item.labelKey)}</span>}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
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
                  {user?.name ?? t("sidebar.defaultUserLabel")}
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
                <TooltipContent side="right">{t("sidebar.signOut")}</TooltipContent>
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
              <TooltipContent side="right">{t("sidebar.signOut")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
