import Html from "@kitajs/html";
import { Layout } from "../layout";
import { t, localePath, type Locale } from "../i18n";

export function NotFoundPage({ locale }: { locale: Locale }) {
  return (
    <Layout
      title={t("notFound.title", locale)}
      description={t("notFound.description", locale)}
      canonicalPath="/404"
      locale={locale}
    >
      <div class="flex flex-col items-center justify-center px-6 py-32 text-center">
        <p class="text-7xl font-bold text-emerald-400/30">404</p>
        <h1 class="mt-4 text-2xl font-semibold text-emerald-50">
          {t("notFound.title", locale)}
        </h1>
        <p class="mt-2 text-sm text-emerald-200/70">
          {t("notFound.description", locale)}
        </p>
        <a
          href={localePath("/", locale)}
          class="mt-8 inline-flex h-10 items-center rounded-md bg-emerald-50 px-5 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-white transition-colors"
        >
          {t("notFound.cta", locale)}
        </a>
      </div>
    </Layout>
  );
}
