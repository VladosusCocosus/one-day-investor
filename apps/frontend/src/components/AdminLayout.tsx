import { NavLink, Outlet } from "react-router";
import { Mail, FileText, ArrowLeft } from "lucide-react";

const navItems = [
  { label: "Notifications", icon: Mail, path: "/admin" },
  { label: "Blog", icon: FileText, path: "/admin/blog" },
];

export function AdminLayout() {
  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-white">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
          <span className="text-sm font-bold text-foreground">Admin</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-2 py-3 border-t border-border">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
