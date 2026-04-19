import Html from "@kitajs/html";
import { t, localePath, type Locale } from "../i18n";

export function PhilosophyCard({ locale }: { locale: Locale }) {
  return (
    <section
      id="philosophy-card"
      aria-labelledby="philosophy-card-heading"
      class="px-6 py-16 md:px-8 md:py-20"
    >
      <div
        class="mx-auto max-w-[1100px] overflow-hidden rounded-3xl border border-emerald-700/40 px-8 py-14 text-center shadow-xl shadow-emerald-950/40 md:px-14 md:py-16"
        style="background: radial-gradient(ellipse at top left, #0f6d4f 0%, #064e36 45%, #02281c 100%);"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          {t("philosophy_card.label", locale)}
        </p>
        <h2
          id="philosophy-card-heading"
          class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
        >
          {t("philosophy_card.title", locale)}
        </h2>
        <p class="mx-auto mt-5 max-w-[560px] text-base text-emerald-200 md:text-lg">
          {t("philosophy_card.subtitle", locale)}
        </p>
        <div class="mt-10 flex justify-center">
          <a
            href={localePath("/philosophy", locale)}
            class="inline-flex h-12 items-center rounded-lg border border-emerald-300/40 bg-emerald-900/20 px-6 text-base font-semibold text-emerald-100 hover:bg-emerald-900/40 transition-colors"
          >
            {t("philosophy_card.cta", locale)}
          </a>
        </div>
      </div>
    </section>
  );
}
