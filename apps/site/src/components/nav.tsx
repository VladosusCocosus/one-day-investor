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
            class="inline-flex h-9 items-center justify-center rounded-md bg-emerald-50 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-white transition-colors px-2.5 md:px-4"
            aria-label={ctaLabel}
          >
            {isLoggedIn ? (
              <svg class="h-5 w-5 md:hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
              </svg>
            ) : (
              <svg class="h-5 w-5 md:hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
            )}
            <span class="hidden md:inline">{ctaLabel}</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
