import Html from "@kitajs/html";
import { BlogNav, BlogFooter } from "./components";
import type { User } from "@types";
import type { Locale } from "./i18n";

const SITE_URL = process.env.BLOG_URL || "https://blog.odinvestor.net";

export function Layout({
  title,
  description,
  ogImage,
  canonicalPath,
  publishDate,
  modifiedDate,
  ogType,
  jsonLd,
  user,
  locale = "en",
  children,
}: {
  title: string;
  description?: string;
  ogImage?: string | null;
  canonicalPath?: string;
  publishDate?: string | null;
  modifiedDate?: string | null;
  ogType?: string;
  jsonLd?: object;
  user?: User | null;
  locale?: Locale;
  children: string;
}) {
  const ogImageUrl = ogImage
    ? `${process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT || "http://localhost:4566"}/${process.env.S3_BUCKET || "blog-images"}/${ogImage}`
    : null;
  const ogAlt = description || title;
  const fullTitle = `One Day Investor — ${title}`;
  const canonicalUrl = canonicalPath ? `${SITE_URL}${canonicalPath}` : null;

  return (
    <html lang={locale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-YSRMF124RE"></script>
        <script>
          {(`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YSRMF124RE');
          `)}
        </script>
        <link rel="icon" type="image/svg+xml" href="https://odinvestor.net/favicon.svg" />
        <link rel="apple-touch-icon" href="https://odinvestor.net/apple-touch-icon.png" />
        <title>{fullTitle}</title>
        {description && <meta name="description" content={description} />}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        <meta property="og:site_name" content="One Day Investor" />
        <meta property="og:title" content={fullTitle} />
        {description && <meta property="og:description" content={description} />}
        <meta property="og:type" content={ogType || "website"} />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        {publishDate && <meta property="article:published_time" content={publishDate} />}
        {modifiedDate && <meta property="article:modified_time" content={modifiedDate} />}
        {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
        {ogImageUrl && <meta property="og:image:secure_url" content={ogImageUrl} />}
        {ogImageUrl && <meta property="og:image:type" content="image/png" />}
        {ogImageUrl && <meta property="og:image:width" content="1200" />}
        {ogImageUrl && <meta property="og:image:height" content="630" />}
        {ogImageUrl && <meta property="og:image:alt" content={ogAlt} />}
        <meta name="twitter:card" content={ogImageUrl ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={fullTitle} />
        {description && <meta name="twitter:description" content={description} />}
        {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}
        {ogImageUrl && <meta name="twitter:image:alt" content={ogAlt} />}
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
        class="min-h-screen text-emerald-50"
        style="background: radial-gradient(ellipse 900px 700px at 85% 115%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), radial-gradient(ellipse 1400px 900px at 10% -10%, #0f6d4f 0%, #064e36 38%, #02281c 100%);"
      >
        <BlogNav user={user} currentPath={canonicalPath} locale={locale} />
        <main>{(children)}</main>
        <BlogFooter locale={locale} />
        <script>
          {(`
            (function() {
              var nav = document.getElementById('blog-nav');
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
          `)}
        </script>
      </body>
    </html>
  );
}

export function EditorLayout({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} — ODI Blog Editor</title>
        <link rel="stylesheet" href="/styles.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      </head>
      <body class="min-h-screen bg-gray-950 text-gray-100">
        <header class="border-b border-gray-800 px-6 py-4">
          <div class="mx-auto flex max-w-[1200px] items-center justify-between">
            <a href="/editor" class="flex items-center gap-2.5 text-gray-100 hover:text-white">
              <span
                class="h-3 w-3 rounded-[3px]"
                style="background: linear-gradient(135deg, #6ee7b7, #10b981)"
              ></span>
              <span class="text-sm font-semibold tracking-[0.18em] uppercase">
                Blog Editor
              </span>
            </a>
            <a
              href="/"
              class="text-sm text-gray-400 hover:text-white transition-colors"
            >
              View Blog
            </a>
          </div>
        </header>
        <main class="mx-auto max-w-[1200px] px-6 py-8">
          {(children)}
        </main>
      </body>
    </html>
  );
}
