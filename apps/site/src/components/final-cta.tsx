import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dashboard.odinvestor.net";

export function FinalCta({ locale }: { locale: Locale }) {
  return (
    <section id="cta" class="px-6 py-24 md:px-8 md:py-32">
      <div
        class="mx-auto max-w-[1100px] overflow-hidden rounded-3xl border border-emerald-700/40 px-8 py-16 text-center shadow-2xl shadow-emerald-950/50 md:px-16 md:py-24"
        style="background: radial-gradient(ellipse at top left, #0f6d4f 0%, #064e36 45%, #02281c 100%);"
      >
        <h2 class="text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
          {t("cta.title", locale)}
        </h2>
        <div class="mt-10 flex justify-center">
          <a
            href={`${DASHBOARD_URL}/login`}
            class="inline-flex h-12 items-center gap-3 rounded-lg bg-emerald-50 px-6 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-900/40 hover:bg-white transition-colors"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t("cta.button", locale)}
          </a>
        </div>
      </div>
    </section>
  );
}
