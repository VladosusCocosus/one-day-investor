import Html from "@kitajs/html";
import { t, localePath, type Locale } from "../i18n";
import { LangSwitcher } from "./lang-switcher";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dashboard.odinvestor.net";
const BLOG_URL = process.env.BLOG_URL || "https://blog.odinvestor.net";

export function Nav({
  locale,
  canonicalPath,
  isLoggedIn,
}: {
  locale: Locale;
  canonicalPath: string;
  isLoggedIn?: boolean;
}) {
  const isLanding = canonicalPath === "/";
  const ctaLabel = isLoggedIn ? t("nav.dashboard", locale) : t("nav.signIn", locale);
  const ctaHref = isLoggedIn ? `${DASHBOARD_URL}/dashboard` : `${DASHBOARD_URL}/login`;

  return (
    <header
      id="site-nav"
      class="sticky top-0 z-50 w-full transition-colors"
      style="border-bottom: 1px solid transparent;"
    >
      <div class="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4 md:px-8">
        <a href={localePath("/", locale)} class="flex items-center gap-2.5 text-emerald-100 hover:text-white transition-colors">
          <span
            aria-hidden="true"
            class="h-3 w-3 rounded-[3px]"
            style="background: linear-gradient(135deg, #6ee7b7, #10b981)"
          ></span>
          <span class="text-sm font-semibold tracking-[0.18em] uppercase">
            One Day Investor
          </span>
        </a>
        <nav class="flex items-center gap-6">
          {isLanding && (
            <a
              href="#features"
              class="hidden text-sm font-medium text-emerald-200 hover:text-white transition-colors md:inline"
            >
              {t("nav.features", locale)}
            </a>
          )}
          <a
            href={localePath("/philosophy", locale)}
            class="hidden text-sm font-medium text-emerald-200 hover:text-white transition-colors md:inline"
          >
            {t("nav.philosophy", locale)}
          </a>
          <a
            href={BLOG_URL}
            class="hidden text-sm font-medium text-emerald-200 hover:text-white transition-colors md:inline"
          >
            {t("nav.blog", locale)}
          </a>
          <LangSwitcher locale={locale} canonicalPath={canonicalPath} />
          <a
            href={ctaHref}
            class="inline-flex h-9 items-center rounded-md bg-emerald-50 px-4 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-white transition-colors"
          >
            {ctaLabel}
          </a>
        </nav>
      </div>
    </header>
  );
}
