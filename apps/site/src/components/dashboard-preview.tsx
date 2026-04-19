import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dashboard.odinvestor.net";

export function DashboardPreview({ locale }: { locale: Locale }) {
  return (
    <div class="relative mx-auto mt-14 max-w-[1100px] px-6 md:mt-20">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 -top-8 h-40"
        style="background: radial-gradient(ellipse at center, rgba(16, 185, 129, 0.25) 0%, transparent 70%);"
      ></div>
      <div class="relative overflow-hidden rounded-2xl border border-emerald-800/40 bg-white shadow-2xl shadow-emerald-950/50 ring-1 ring-white/10">
        <picture>
          <source srcset={`${DASHBOARD_URL}/landing-dashboard-preview.webp`} type="image/webp" />
          <img
            src={`${DASHBOARD_URL}/landing-dashboard-preview.png`}
            alt={t("dashboard_preview.alt", locale)}
            width="1600"
            height="680"
            loading="eager"
            fetchpriority="high"
            class="block h-auto w-full"
          />
        </picture>
      </div>
    </div>
  );
}
