import Html from "@kitajs/html";
import { t, localePath, type Locale } from "../i18n";
import { Layout } from "../layout";
import { GoogleIcon } from "@icons";

const SITE_URL = process.env.SITE_URL || "https://odinvestor.net";
const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dashboard.odinvestor.net";

function PullQuote({ children }: { children: string }) {
  return (
    <figure class="my-14 md:my-20">
      <blockquote class="mx-auto max-w-[760px] text-center">
        <p class="text-2xl font-semibold italic leading-snug tracking-tight text-emerald-100 sm:text-3xl md:text-4xl">
          {children}
        </p>
      </blockquote>
    </figure>
  );
}

export function PhilosophyPage({
  locale,
  isLoggedIn,
}: {
  locale: Locale;
  isLoggedIn?: boolean;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: t("philosophy.hero.title1", locale) + " " + t("philosophy.hero.title2", locale),
    description: t("philosophy.meta.description", locale),
    inLanguage: locale,
    author: { "@type": "Person", name: "Vlad" },
    publisher: {
      "@type": "Organization",
      name: "One Day Investor",
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}${localePath("/philosophy", locale)}`,
    },
  };

  return (
    <Layout
      title={t("philosophy.meta.title", locale)}
      description={t("philosophy.meta.description", locale)}
      canonicalPath="/philosophy"
      locale={locale}
      jsonLd={jsonLd}
      isLoggedIn={isLoggedIn}
    >
      {/* Hero */}
      <section
        id="philosophy-hero"
        aria-labelledby="philosophy-hero-heading"
        class="relative overflow-hidden px-6 pt-16 pb-20 md:px-8 md:pt-24 md:pb-28"
      >
        <div class="relative mx-auto max-w-[960px] text-center">
          <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            <span
              aria-hidden="true"
              class="h-2 w-2 rounded-[2px]"
              style="background: linear-gradient(135deg, #6ee7b7, #10b981)"
            ></span>
            {t("philosophy.hero.label", locale)}
          </p>
          <h1
            id="philosophy-hero-heading"
            class="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-emerald-50 sm:text-5xl md:text-6xl lg:text-7xl"
          >
            {t("philosophy.hero.title1", locale)}
            <br />
            <span class="bg-gradient-to-r from-emerald-50 via-emerald-200 to-emerald-300 bg-clip-text text-transparent">
              {t("philosophy.hero.title2", locale)}
            </span>
          </h1>
          <p class="mx-auto mt-6 max-w-[560px] text-base text-emerald-200 md:text-lg">
            {t("philosophy.hero.subtitle", locale)}
          </p>
        </div>
      </section>

      {/* Ritual */}
      <section
        id="philosophy-ritual"
        aria-labelledby="philosophy-ritual-heading"
        class="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32"
      >
        <div class="mx-auto max-w-[760px]">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {t("philosophy.ritual.label", locale)}
          </p>
          <h2
            id="philosophy-ritual-heading"
            class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
          >
            {t("philosophy.ritual.title", locale)}
          </h2>
          <div class="mt-10 space-y-6 text-lg leading-relaxed text-emerald-100/90">
            <p>{t("philosophy.ritual.p1", locale)}</p>
            <p>{t("philosophy.ritual.p2", locale)}</p>
            <p>{t("philosophy.ritual.p3", locale)}</p>
            <p>
              {t("philosophy.ritual.p4a", locale)}
              <strong class="font-semibold text-emerald-50">
                {t("philosophy.ritual.p4b", locale)}
              </strong>
              {t("philosophy.ritual.p4c", locale)}
            </p>
            <p>{t("philosophy.ritual.p5", locale)}</p>
          </div>
        </div>
        <PullQuote>{t("philosophy.ritual.quote", locale)}</PullQuote>
      </section>

      {/* Two gaps */}
      <section
        id="philosophy-two-gaps"
        aria-labelledby="philosophy-two-gaps-heading"
        class="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32"
      >
        <div class="mx-auto max-w-[1100px]">
          <div class="mx-auto max-w-[760px]">
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              {t("philosophy.gaps.label", locale)}
            </p>
            <h2
              id="philosophy-two-gaps-heading"
              class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
            >
              {t("philosophy.gaps.title", locale)}
            </h2>
            <p class="mt-10 text-lg leading-relaxed text-emerald-100/90">
              {t("philosophy.gaps.intro", locale)}
            </p>
          </div>

          <div class="mt-14 overflow-hidden rounded-2xl border border-emerald-900/50 bg-emerald-950/40 backdrop-blur-sm">
            <div class="grid grid-cols-1 md:grid-cols-2">
              <div class="p-8 md:border-r md:border-emerald-900/50 md:p-10">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
                  {t("philosophy.gaps.bank.label", locale)}
                </p>
                <ul class="mt-5 space-y-3 text-base text-emerald-200/90">
                  {[1, 2, 3, 4].map((n) => (
                    <li class="flex gap-3">
                      <span aria-hidden="true" class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60"></span>
                      <span>{t(`philosophy.gaps.bank.${n}`, locale)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div class="border-t border-emerald-900/50 p-8 md:border-t-0 md:p-10">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  {t("philosophy.gaps.odi.label", locale)}
                </p>
                <ul class="mt-5 space-y-3 text-base text-emerald-100">
                  {[1, 2, 3, 4].map((n) => (
                    <li class="flex gap-3">
                      <span aria-hidden="true" class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"></span>
                      <span>{t(`philosophy.gaps.odi.${n}`, locale)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <p class="mx-auto mt-10 max-w-[760px] text-lg leading-relaxed text-emerald-100/90">
            {t("philosophy.gaps.closing", locale)}
          </p>
        </div>
      </section>

      {/* The deal */}
      <section
        id="philosophy-the-deal"
        aria-labelledby="philosophy-the-deal-heading"
        class="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32"
      >
        <div class="mx-auto max-w-[1100px]">
          <div class="mx-auto max-w-[760px]">
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              {t("philosophy.deal.label", locale)}
            </p>
            <h2
              id="philosophy-the-deal-heading"
              class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
            >
              {t("philosophy.deal.title", locale)}
            </h2>
            <div class="mt-10 space-y-6 text-lg leading-relaxed text-emerald-100/90">
              <p>{t("philosophy.deal.p1", locale)}</p>
              <p>{t("philosophy.deal.p2", locale)}</p>
            </div>
          </div>

          <div class="mt-14 overflow-hidden rounded-2xl border border-emerald-900/50 bg-emerald-950/40 backdrop-blur-sm">
            <div class="grid grid-cols-1 md:grid-cols-2">
              <div class="p-8 md:border-r md:border-emerald-900/50 md:p-10">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  {t("philosophy.deal.auto.label", locale)}
                </p>
                <ul class="mt-5 space-y-3 text-base text-emerald-100">
                  {[1, 2, 3, 4].map((n) => (
                    <li class="flex gap-3">
                      <span aria-hidden="true" class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"></span>
                      <span>{t(`philosophy.deal.auto.${n}`, locale)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div class="border-t border-emerald-900/50 p-8 md:border-t-0 md:p-10">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  {t("philosophy.deal.manual.label", locale)}
                </p>
                <ul class="mt-5 space-y-3 text-base text-emerald-100">
                  {[1, 2, 3, 4].map((n) => (
                    <li class="flex gap-3">
                      <span aria-hidden="true" class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"></span>
                      <span>{t(`philosophy.deal.manual.${n}`, locale)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <p class="mx-auto mt-10 max-w-[760px] text-lg leading-relaxed text-emerald-100/90">
            {t("philosophy.deal.closing", locale)}
          </p>
        </div>
      </section>

      {/* Pockets */}
      <section
        id="philosophy-pockets"
        aria-labelledby="philosophy-pockets-heading"
        class="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32"
      >
        <div class="mx-auto max-w-[760px]">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {t("philosophy.pockets.label", locale)}
          </p>
          <h2
            id="philosophy-pockets-heading"
            class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
          >
            {t("philosophy.pockets.title", locale)}
          </h2>
          <div class="mt-10 space-y-6 text-lg leading-relaxed text-emerald-100/90">
            <p>
              {t("philosophy.pockets.p1a", locale)}
              <em class="text-emerald-50 not-italic">
                {t("philosophy.pockets.p1b", locale)}
              </em>
            </p>
            <p>{t("philosophy.pockets.p2", locale)}</p>
            <p>{t("philosophy.pockets.p3", locale)}</p>
          </div>
        </div>
      </section>

      {/* Audience */}
      <section
        id="philosophy-audience"
        aria-labelledby="philosophy-audience-heading"
        class="border-t border-emerald-900/40 px-6 py-24 md:px-8 md:py-32"
      >
        <div class="mx-auto max-w-[760px]">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {t("philosophy.audience.label", locale)}
          </p>
          <h2
            id="philosophy-audience-heading"
            class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
          >
            {t("philosophy.audience.title", locale)}
          </h2>
        </div>
        <PullQuote>{t("philosophy.audience.quote", locale)}</PullQuote>
        <div class="mx-auto max-w-[760px] space-y-6 text-lg leading-relaxed text-emerald-100/90">
          <p>{t("philosophy.audience.p1", locale)}</p>
          <p>{t("philosophy.audience.p2", locale)}</p>
          <p>{t("philosophy.audience.p3", locale)}</p>
          <p class="text-emerald-50">{t("philosophy.audience.p4", locale)}</p>
        </div>
      </section>

      {/* Closing */}
      <section
        id="philosophy-closing"
        class="px-6 py-24 md:px-8 md:py-32"
      >
        <div
          class="mx-auto max-w-[1100px] overflow-hidden rounded-3xl border border-emerald-700/40 px-8 py-16 text-center shadow-2xl shadow-emerald-950/50 md:px-16 md:py-24"
          style="background: radial-gradient(ellipse at top left, #0f6d4f 0%, #064e36 45%, #02281c 100%);"
        >
          <p class="text-xl italic text-emerald-100 md:text-2xl">
            {t("philosophy.closing.author", locale)}
          </p>
          <div class="mt-10 flex justify-center">
            <a
              href={`${DASHBOARD_URL}/login`}
              class="inline-flex h-12 items-center gap-3 rounded-lg bg-emerald-50 px-6 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-900/40 hover:bg-white transition-colors"
            >
              <span class="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5">{GoogleIcon as "safe"}</span>
              {t("philosophy.closing.cta", locale)}
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}
