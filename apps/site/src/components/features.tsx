import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";
import { Settings, Wallet, Camera, BarChart3 } from "lucide-static";

const featureKeys = ["pockets", "assets", "snapshots", "analytics"] as const;

const icons: Record<string, string> = {
  pockets: Settings,
  assets: Wallet,
  snapshots: Camera,
  analytics: BarChart3,
};

export function Features({ locale }: { locale: Locale }) {
  return (
    <section id="features" class="px-6 py-24 md:px-8 md:py-32">
      <div class="mx-auto max-w-[1200px]">
        <div class="mx-auto max-w-[720px] text-center">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {t("features.label", locale)}
          </p>
          <h2 class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
            {t("features.title", locale)}
          </h2>
        </div>
        <div class="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featureKeys.map((key) => (
            <div class="rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-7 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60">
              <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30 [&>svg]:h-5 [&>svg]:w-5">
                {icons[key] as "safe"}
              </div>
              <h3 class="mt-5 text-xl font-semibold text-emerald-50">
                {t(`features.${key}.title`, locale)}
              </h3>
              <p class="mt-3 text-sm leading-relaxed text-emerald-200/90">
                {t(`features.${key}.body`, locale)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
