import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";
import { GoogleIcon } from "@icons";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dashboard.odinvestor.net";

export function Hero({ locale }: { locale: Locale }) {
  return (
    <section
      id="hero"
      class="relative overflow-hidden px-6 pt-16 pb-12 md:px-8 md:pt-24 md:pb-16"
    >
      <div class="relative mx-auto max-w-[960px] text-center">
        <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          <span
            aria-hidden="true"
            class="h-2 w-2 rounded-[2px]"
            style="background: linear-gradient(135deg, #6ee7b7, #10b981)"
          ></span>
          {t("hero.tagline", locale)}
        </p>
        <h1 class="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-emerald-50 sm:text-6xl md:text-7xl">
          {t("hero.title1", locale)}
          <br />
          <span class="bg-gradient-to-r from-emerald-50 via-emerald-200 to-emerald-300 bg-clip-text text-transparent">
            {t("hero.title2", locale)}
          </span>
        </h1>
        <p class="mx-auto mt-6 max-w-[640px] text-base text-emerald-200 md:text-xl">
          {t("hero.subtitle1", locale)}
          <br class="hidden sm:block" />
          {t("hero.subtitle2", locale)}
        </p>
        <div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={`${DASHBOARD_URL}/login`}
            class="inline-flex h-12 items-center gap-3 rounded-lg bg-emerald-50 px-6 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-900/30 hover:bg-white transition-colors"
          >
            <span class="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5">{GoogleIcon as "safe"}</span>
            {t("hero.cta", locale)}
          </a>
          <a
            href="#how"
            class="inline-flex h-12 items-center rounded-lg border border-emerald-300/30 px-6 text-base font-semibold text-emerald-100 hover:bg-emerald-900/30 transition-colors"
          >
            {t("hero.secondary", locale)}
          </a>
        </div>
      </div>
    </section>
  );
}
