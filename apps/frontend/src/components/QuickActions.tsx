import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { BarChart3, Camera, Coins, Wallet } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface QuickAction {
  labelKey: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const ACTIONS: QuickAction[] = [
  { labelKey: "quickActions.addAsset", to: "/assets-managment", icon: Coins },
  { labelKey: "quickActions.addPocket", to: "/profile", icon: Wallet },
  { labelKey: "quickActions.snapshot", to: "/snapshots", icon: Camera },
  { labelKey: "quickActions.analytics", to: "/analytics", icon: BarChart3 },
];

export function QuickActions() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label="Quick actions"
      className="flex gap-1 rounded-full border bg-card p-1.5 max-sm:grid max-sm:grid-cols-2 max-sm:gap-1.5 max-sm:rounded-xl"
    >
      {ACTIONS.map(({ labelKey, to, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon className="h-4 w-4" />
          <span>{t(labelKey)}</span>
        </Link>
      ))}
    </nav>
  );
}
