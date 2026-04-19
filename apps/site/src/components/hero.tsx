import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";

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
            <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
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
