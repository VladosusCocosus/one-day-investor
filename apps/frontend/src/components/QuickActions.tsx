import { Link } from "react-router";
import { BarChart3, Camera, Coins, Wallet } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface QuickAction {
  label: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const ACTIONS: QuickAction[] = [
  { label: "Add asset", to: "/assets-managment", icon: Coins },
  { label: "Add pocket", to: "/profile", icon: Wallet },
  { label: "Snapshot", to: "/snapshots", icon: Camera },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
];

export function QuickActions() {
  return (
    <nav
      aria-label="Quick actions"
      className="flex gap-1 rounded-full border bg-card p-1.5 max-sm:grid max-sm:grid-cols-2 max-sm:gap-1.5 max-sm:rounded-xl"
    >
      {ACTIONS.map(({ label, to, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
