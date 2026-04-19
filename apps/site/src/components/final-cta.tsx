import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";
import { GoogleIcon } from "@icons";

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
            <span class="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5">{GoogleIcon as "safe"}</span>
            {t("cta.button", locale)}
          </a>
        </div>
      </div>
    </section>
  );
}
