import Html from "@kitajs/html";
import { t, localePath, type Locale } from "./i18n";
import { PageShell, LangSelect } from "@ui";
import { XTwitterIcon, LinkedInIcon, InstagramIcon } from "@icons";
import { Grid2x2, LogIn } from "lucide-static";

const SITE_URL = process.env.SITE_URL || "https://odinvestor.net";
const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dashboard.odinvestor.net";
const BLOG_URL = process.env.BLOG_URL || "https://blog.odinvestor.net";

export function Layout({
  title,
  description,
  canonicalPath,
  locale,
  jsonLd,
  isLoggedIn,
  children,
}: {
  title: string;
  description?: string;
  canonicalPath: string;
  locale: Locale;
  jsonLd?: object;
  isLoggedIn?: boolean;
  children: string;
}) {
  const fullTitle = `One Day Investor — ${title}`;
  const canonicalUrl = `${SITE_URL}${localePath(canonicalPath, locale)}`;
  const isLanding = canonicalPath === "/";

  const ctaLabel = isLoggedIn ? t("nav.dashboard", locale) : t("nav.signIn", locale);
  const ctaHref = isLoggedIn ? `${DASHBOARD_URL}/dashboard` : `${DASHBOARD_URL}/login`;
  const ctaIcon = isLoggedIn ? Grid2x2 : LogIn;

  const langOptions = (["en", "ru", "es"] as const).map((l) => ({
    value: l,
    label: l.toUpperCase(),
    href: localePath(canonicalPath, l),
  }));

  const navContent = (
    <>
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
      <LangSelect locale={locale} options={langOptions} />
    </>
  );

  return (
    <html lang={locale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-YSRMF124RE"></script>
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YSRMF124RE');
          `}
        </script>
        <link rel="icon" type="image/svg+xml" href={`${DASHBOARD_URL}/favicon.svg`} />
        <link rel="apple-touch-icon" href={`${DASHBOARD_URL}/apple-touch-icon.png`} />
        <title>{fullTitle}</title>
        {description && <meta name="description" content={description} />}
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${localePath(canonicalPath, "en")}`} />
        <link rel="alternate" hreflang="ru" href={`${SITE_URL}${localePath(canonicalPath, "ru")}`} />
        <link rel="alternate" hreflang="es" href={`${SITE_URL}${localePath(canonicalPath, "es")}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${canonicalPath}`} />
        <meta property="og:site_name" content="One Day Investor" />
        <meta property="og:title" content={fullTitle} />
        {description && <meta property="og:description" content={description} />}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:locale" content={locale === "ru" ? "ru_RU" : locale === "es" ? "es_ES" : "en_US"} />
        <meta property="og:image" content={`${DASHBOARD_URL}/og-image.png`} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={description || title} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={fullTitle} />
        {description && <meta name="twitter:description" content={description} />}
        <meta name="twitter:image" content={`${DASHBOARD_URL}/og-image.png`} />
        <meta name="twitter:image:alt" content={description || title} />
        {jsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        )}
        <link rel="stylesheet" href="/styles.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      </head>
      <body
        class="min-h-dvh text-emerald-50"
        style="background: radial-gradient(ellipse 900px 700px at 85% 115%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), radial-gradient(ellipse 1400px 900px at 10% -10%, #0f6d4f 0%, #064e36 38%, #02281c 100%);"
      >
        <a
          href="#main"
          class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-emerald-50 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-950"
        >
          {t("skip_to_content", locale)}
        </a>
        <PageShell
          nav={{
            id: "site-nav",
            logoText: "One Day Investor",
            logoHref: localePath("/", locale),
            navContent: String(navContent),
            ctaHref,
            ctaLabel,
            ctaIconHtml: String(ctaIcon),
          }}
          footer={{
            logoText: "One Day Investor",
            tagline: t("footer.tagline", locale),
            socialLinks: [
              { href: "https://x.com/razin36986", iconHtml: XTwitterIcon, label: "X (Twitter)" },
              { href: "https://www.linkedin.com/in/vladislav-razin-7b3420240/", iconHtml: LinkedInIcon, label: "LinkedIn" },
              { href: "https://www.instagram.com/cocosik86/", iconHtml: InstagramIcon, label: "Instagram" },
            ],
            copyrightText: t("footer.copyright", locale),
          }}
        >
          {children as "safe"}
        </PageShell>
        <script>
          {`
            (function() {
              var nav = document.getElementById('site-nav');
              if (!nav) return;
              function onScroll() {
                if (window.scrollY > 24) {
                  nav.style.background = 'rgba(2, 40, 28, 0.95)';
                  nav.style.backdropFilter = 'blur(12px)';
                  nav.style.webkitBackdropFilter = 'blur(12px)';
                  nav.style.borderBottom = '1px solid rgba(6, 78, 54, 0.4)';
                } else {
                  nav.style.background = 'transparent';
                  nav.style.backdropFilter = 'none';
                  nav.style.webkitBackdropFilter = 'none';
                  nav.style.borderBottom = '1px solid transparent';
                }
              }
              onScroll();
              window.addEventListener('scroll', onScroll, { passive: true });
            })();
          `}
        </script>
      </body>
    </html>
  );
}
