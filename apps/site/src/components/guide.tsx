import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";

const stepCount = 6;

export function Guide({ locale }: { locale: Locale }) {
  return (
    <section
      id="how"
      aria-labelledby="guide-heading"
      class="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32"
    >
      <div class="mx-auto max-w-[1100px]">
        <div class="mx-auto max-w-[720px] text-center">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {t("guide.label", locale)}
          </p>
          <h2
            id="guide-heading"
            class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
          >
            {t("guide.title", locale)}
          </h2>
          <p class="mt-5 text-base italic text-emerald-200/80 sm:text-lg">
            {t("guide.quote", locale)}
          </p>
        </div>

        <ol class="relative mt-16 md:mt-20">
          <div
            aria-hidden="true"
            class="pointer-events-none absolute top-0 bottom-0 left-6 w-px bg-gradient-to-b from-transparent via-emerald-400/35 to-transparent md:left-1/2 md:-translate-x-1/2"
          ></div>

          {Array.from({ length: stepCount }, (_, i) => {
            const n = i + 1;
            const isLeft = i % 2 === 0;
            return (
              <li class="relative mb-8 md:mb-14 last:mb-0 md:grid md:grid-cols-[1fr_72px_1fr] md:items-center md:gap-6">
                <div
                  aria-hidden="true"
                  class="absolute left-6 -translate-x-1/2 top-6 z-10 md:static md:translate-x-0 md:col-start-2 md:row-start-1 md:justify-self-center"
                >
                  <div
                    class="flex h-11 w-11 items-center justify-center rounded-full border-2 border-emerald-300/70 text-sm font-bold text-emerald-200 shadow-[0_0_0_6px_rgba(2,40,28,0.95)]"
                    style="background: #02281c"
                  >
                    {n}
                  </div>
                </div>
                <div
                  class={`ml-16 md:ml-0 rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-6 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60 ${
                    isLeft ? "md:col-start-1 md:text-right" : "md:col-start-3 md:text-left"
                  }`}
                >
                  <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    {t("guide.step", locale)} {n}
                  </p>
                  <h3 class="mt-2 text-xl font-semibold text-emerald-50">
                    {t(`guide.step${n}.title`, locale)}
                  </h3>
                  <p class="mt-2 text-sm leading-relaxed text-emerald-200/90">
                    {t(`guide.step${n}.body`, locale)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
