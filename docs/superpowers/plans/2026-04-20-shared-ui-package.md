# Shared UI Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract duplicated Nav, Footer, and PageShell components from `apps/blog` and `apps/site` into a shared `packages/ui` package.

**Architecture:** Create a new `packages/ui` workspace package exporting three KitaJS/HTML server components. Both apps will import from `@ui` instead of defining their own nav/footer. The shared components accept all text as props (no i18n coupling).

**Tech Stack:** KitaJS/HTML, TypeScript, Bun workspaces, lucide-static, @icons

---

### Task 1: Create the `packages/ui` package

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@ui",
  "module": "index.ts",
  "type": "module",
  "private": true,
  "dependencies": {
    "@icons": "workspace:*",
    "lucide-static": "^0.509.0"
  },
  "peerDependencies": {
    "@kitajs/html": "*",
    "typescript": "^5"
  }
}
```

Write this to `packages/ui/package.json`.

- [ ] **Step 2: Create empty index.ts barrel**

```ts
export { Nav, type NavProps } from "./nav";
export { Footer, type FooterProps } from "./footer";
export { PageShell, type PageShellProps } from "./page-shell";
```

Write this to `packages/ui/index.ts`. This will have import errors until we create the component files in the next tasks.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/package.json packages/ui/index.ts
git commit -m "feat(ui): scaffold shared UI package"
```

---

### Task 2: Create the shared `Nav` component

**Files:**
- Create: `packages/ui/nav.tsx`

The Nav needs to support both apps' patterns:
- Site: logo links to locale-aware path, has middle links (Features, Philosophy, Blog) + LangSwitcher + CTA
- Blog: logo links to site root, has middle links (Blog, Philosophy) + CTA

The middle content varies too much between apps (site has LangSwitcher component), so we accept it as raw HTML children between logo and CTA.

- [ ] **Step 1: Create nav.tsx**

```tsx
import Html from "@kitajs/html";

export interface NavProps {
  /** ID for the header element (used by scroll JS) */
  id?: string;
  /** Logo text */
  logoText: string;
  /** Logo link href */
  logoHref: string;
  /** Raw HTML to render between logo and CTA (nav links, lang switcher, etc.) */
  navContent?: string;
  /** CTA button href */
  ctaHref: string;
  /** CTA button label (used as aria-label and visible text on desktop) */
  ctaLabel: string;
  /** Raw SVG/HTML for the CTA icon */
  ctaIconHtml: string;
}

export function Nav({
  id = "site-nav",
  logoText,
  logoHref,
  navContent,
  ctaHref,
  ctaLabel,
  ctaIconHtml,
}: NavProps) {
  return (
    <header
      id={id}
      class="sticky top-0 z-50 w-full transition-colors"
      style="border-bottom: 1px solid transparent;"
    >
      <div class="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4 md:px-8">
        <a
          href={logoHref}
          class="flex items-center gap-2.5 text-emerald-100 hover:text-white transition-colors"
        >
          <span
            aria-hidden="true"
            class="h-3 w-3 rounded-[3px]"
            style="background: linear-gradient(135deg, #6ee7b7, #10b981)"
          ></span>
          <span class="text-sm font-semibold tracking-[0.18em] uppercase">
            {logoText}
          </span>
        </a>
        <nav class="flex items-center gap-6">
          {navContent as "safe"}
          <a
            href={ctaHref}
            class="inline-flex h-9 items-center justify-center rounded-md bg-emerald-50 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-white transition-colors px-2.5 md:px-4"
            aria-label={ctaLabel}
          >
            <span class="h-4 w-4 md:mr-2 [&>svg]:h-4 [&>svg]:w-4">
              {ctaIconHtml as "safe"}
            </span>
            <span class="hidden md:inline">{ctaLabel}</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
```

Write this to `packages/ui/nav.tsx`.

- [ ] **Step 2: Commit**

```bash
git add packages/ui/nav.tsx
git commit -m "feat(ui): add shared Nav component"
```

---

### Task 3: Create the shared `Footer` component

**Files:**
- Create: `packages/ui/footer.tsx`

- [ ] **Step 1: Create footer.tsx**

```tsx
import Html from "@kitajs/html";

export interface SocialLink {
  href: string;
  iconHtml: string;
  label: string;
}

export interface FooterProps {
  logoText: string;
  tagline: string;
  socialLinks: SocialLink[];
  copyrightText: string;
}

export function Footer({ logoText, tagline, socialLinks, copyrightText }: FooterProps) {
  return (
    <footer class="border-t border-emerald-900/40 px-6 py-10 md:px-8">
      <div class="mx-auto max-w-[1200px]">
        <div class="flex flex-col items-center gap-6 text-center sm:gap-8">
          <div class="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              class="h-2.5 w-2.5 rounded-[2px]"
              style="background: linear-gradient(135deg, #6ee7b7, #10b981)"
            ></span>
            <span class="text-xs font-semibold tracking-[0.18em] uppercase text-emerald-300">
              {logoText}
            </span>
          </div>
          <p class="max-w-[420px] text-sm leading-relaxed text-emerald-200/70">
            {tagline}
          </p>
          <div class="flex items-center gap-5">
            {socialLinks.map((link) => (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                class="text-emerald-300/70 transition-colors hover:text-emerald-200 [&>svg]:h-[18px] [&>svg]:w-[18px]"
                aria-label={link.label}
              >
                {link.iconHtml as "safe"}
              </a>
            ))}
          </div>
          <div class="text-xs text-emerald-300/50">{copyrightText}</div>
        </div>
      </div>
    </footer>
  );
}
```

Write this to `packages/ui/footer.tsx`.

- [ ] **Step 2: Commit**

```bash
git add packages/ui/footer.tsx
git commit -m "feat(ui): add shared Footer component"
```

---

### Task 4: Create the `PageShell` component

**Files:**
- Create: `packages/ui/page-shell.tsx`

- [ ] **Step 1: Create page-shell.tsx**

```tsx
import Html from "@kitajs/html";
import { Nav, type NavProps } from "./nav";
import { Footer, type FooterProps } from "./footer";

export interface PageShellProps {
  nav: NavProps;
  footer: FooterProps;
  children: Html.Children;
}

export function PageShell({ nav, footer, children }: PageShellProps) {
  return (
    <>
      <Nav {...nav} />
      <main id="main">{children as "safe"}</main>
      <Footer {...footer} />
    </>
  );
}
```

Write this to `packages/ui/page-shell.tsx`.

- [ ] **Step 2: Commit**

```bash
git add packages/ui/page-shell.tsx
git commit -m "feat(ui): add PageShell component"
```

---

### Task 5: Install dependencies and verify compilation

- [ ] **Step 1: Add `@ui` dependency to both apps**

In `apps/site/package.json`, add `"@ui": "workspace:*"` to `dependencies`.

In `apps/blog/package.json`, add `"@ui": "workspace:*"` to `dependencies`.

- [ ] **Step 2: Install**

```bash
cd /Users/pavel/Projects/one-day-investor && bun install
```

- [ ] **Step 3: Verify the package resolves**

```bash
cd /Users/pavel/Projects/one-day-investor && bun run --eval "import { Nav, Footer, PageShell } from '@ui'; console.log('OK: Nav, Footer, PageShell imported')"
```

Expected: `OK: Nav, Footer, PageShell imported`

- [ ] **Step 4: Commit**

```bash
git add apps/site/package.json apps/blog/package.json bun.lock
git commit -m "chore: add @ui workspace dependency to blog and site"
```

---

### Task 6: Migrate `apps/site` to use `@ui`

**Files:**
- Modify: `apps/site/src/layout.tsx`
- Delete: `apps/site/src/components/nav.tsx`
- Delete: `apps/site/src/components/footer.tsx`

The site layout currently imports `Nav` and `Footer` from local components and renders them directly. We'll replace those with `PageShell` from `@ui`.

- [ ] **Step 1: Update `apps/site/src/layout.tsx`**

Replace the entire file with:

```tsx
import Html from "@kitajs/html";
import { t, localePath, type Locale } from "./i18n";
import { LangSwitcher } from "./components/lang-switcher";
import { PageShell } from "@ui";
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
      <LangSwitcher locale={locale} canonicalPath={canonicalPath} />
    </>
  );

  return (
    <html lang={locale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
        <meta property="og:image" content={`${DASHBOARD_URL}/landing-dashboard-preview.png`} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={description || title} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={fullTitle} />
        {description && <meta name="twitter:description" content={description} />}
        <meta name="twitter:image" content={`${DASHBOARD_URL}/landing-dashboard-preview.png`} />
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
        class="min-h-screen text-emerald-50"
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
```

- [ ] **Step 2: Delete old component files**

```bash
rm apps/site/src/components/nav.tsx apps/site/src/components/footer.tsx
```

- [ ] **Step 3: Remove old imports from any page files that imported Nav or Footer directly**

Check if any page files import Nav or Footer directly (they shouldn't — they use Layout). Verify with:

```bash
cd /Users/pavel/Projects/one-day-investor && grep -r "from.*components/nav\|from.*components/footer" apps/site/src/ --include="*.tsx" --include="*.ts"
```

Expected: no results (all pages use Layout, which handles Nav/Footer).

- [ ] **Step 4: Verify site compiles**

```bash
cd /Users/pavel/Projects/one-day-investor/apps/site && bun run build:css && timeout 5 bun run src/index.tsx || true
```

Expected: compiles and starts listening on port 3005 (timeout kills it).

- [ ] **Step 5: Commit**

```bash
git add -A apps/site/src/layout.tsx apps/site/src/components/
git commit -m "refactor(site): use shared @ui Nav, Footer, PageShell"
```

---

### Task 7: Migrate `apps/blog` to use `@ui`

**Files:**
- Modify: `apps/blog/src/layout.tsx`
- Modify: `apps/blog/src/components.tsx` (remove BlogNav and BlogFooter)

- [ ] **Step 1: Remove `BlogNav` and `BlogFooter` from `apps/blog/src/components.tsx`**

Delete the `BlogNav` function (lines 50-99) and `BlogFooter` function (lines 101-152) from `apps/blog/src/components.tsx`.

Also remove the now-unused imports at the top of the file. After removing BlogNav and BlogFooter, these imports are no longer needed in components.tsx:
- `Grid2x2, LogIn` from `lucide-static` (only Heart remains needed)
- `XTwitterIcon, LinkedInIcon, InstagramIcon` from `@icons` (only used in BlogFooter)
- `t, type Locale` from `./i18n` — check if still used by `SignInModal`. Yes, `SignInModal` uses `t()`, so keep this import.

The updated imports at the top of `components.tsx` should be:

```tsx
import Html from "@kitajs/html";
import { marked } from "marked";
import type { Block } from "./db";
import type { User } from "@types";
import { t, type Locale } from "./i18n";
import { Heart } from "lucide-static";
```

- [ ] **Step 2: Update `apps/blog/src/layout.tsx`**

Replace the entire file with:

```tsx
import Html from "@kitajs/html";
import { PageShell } from "@ui";
import type { User } from "@types";
import { t, type Locale } from "./i18n";
import { Grid2x2, LogIn } from "lucide-static";
import { XTwitterIcon, LinkedInIcon, InstagramIcon } from "@icons";

const SITE_URL = process.env.BLOG_URL || "https://blog.odinvestor.net";
const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dashboard.odinvestor.net";

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

  const blogUrl = process.env.BLOG_URL || "https://blog.odinvestor.net";
  const redirectParam = canonicalPath ? `?redirect_to=${encodeURIComponent(blogUrl + canonicalPath)}` : "";
  const ctaLabel = user ? t("nav.dashboard", locale) : t("nav.signIn", locale);
  const ctaHref = user
    ? `${DASHBOARD_URL}/dashboard`
    : `${DASHBOARD_URL}/login${redirectParam}`;
  const ctaIcon = user ? Grid2x2 : LogIn;

  const navContent = (
    <>
      <a
        href="/"
        class="hidden text-sm font-medium text-emerald-200 hover:text-white transition-colors md:inline"
      >
        {t("nav.blog", locale)}
      </a>
      <a
        href="https://odinvestor.net/philosophy"
        class="hidden text-sm font-medium text-emerald-200 hover:text-white transition-colors md:inline"
      >
        {t("nav.philosophy", locale)}
      </a>
    </>
  );

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
        <link rel="icon" type="image/svg+xml" href={`${DASHBOARD_URL}/favicon.svg`} />
        <link rel="apple-touch-icon" href={`${DASHBOARD_URL}/apple-touch-icon.png`} />
        <title>{fullTitle}</title>
        {description && <meta name="description" content={description} />}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        <link rel="alternate" hreflang="en" href={`${SITE_URL}${canonicalPath || "/"}`} />
        <link rel="alternate" hreflang="ru" href={`${SITE_URL}/ru${canonicalPath || "/"}`} />
        <link rel="alternate" hreflang="es" href={`${SITE_URL}/es${canonicalPath || "/"}`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${canonicalPath || "/"}`} />
        <meta property="og:site_name" content="One Day Investor" />
        <meta property="og:title" content={fullTitle} />
        {description && <meta property="og:description" content={description} />}
        <meta property="og:type" content={ogType || "website"} />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        <meta property="og:locale" content={locale === "ru" ? "ru_RU" : locale === "es" ? "es_ES" : "en_US"} />
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
        <PageShell
          nav={{
            id: "blog-nav",
            logoText: "One Day Investor",
            logoHref: "https://odinvestor.net",
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
```

- [ ] **Step 3: Verify blog compiles**

```bash
cd /Users/pavel/Projects/one-day-investor/apps/blog && bun run build:css && timeout 5 bun run src/index.tsx || true
```

Expected: compiles and starts listening on port 3003 (timeout kills it; DB connection errors are fine — we're verifying compilation).

- [ ] **Step 4: Commit**

```bash
git add apps/blog/src/layout.tsx apps/blog/src/components.tsx
git commit -m "refactor(blog): use shared @ui Nav, Footer, PageShell"
```

---

### Task 8: Remove unused imports from blog and site

**Files:**
- Modify: `apps/site/package.json` (optional: remove lucide-static if no longer used directly)
- Verify: no dangling imports remain

- [ ] **Step 1: Check for dangling imports in site**

```bash
cd /Users/pavel/Projects/one-day-investor && grep -r "from.*lucide-static\|from.*@icons" apps/site/src/ --include="*.tsx" --include="*.ts"
```

If `lucide-static` and `@icons` are only used in the now-deleted nav.tsx and footer.tsx, they can stay in package.json (they're still needed transitively by `@ui`). But if layout.tsx still imports them (it does — for building nav/footer props), no changes needed.

- [ ] **Step 2: Final verification — both apps compile**

```bash
cd /Users/pavel/Projects/one-day-investor/apps/site && timeout 5 bun run src/index.tsx 2>&1 || true
cd /Users/pavel/Projects/one-day-investor/apps/blog && timeout 5 bun run src/index.tsx 2>&1 || true
```

Expected: both compile and start.

- [ ] **Step 3: Commit cleanup if any changes**

Only commit if Step 1 revealed changes to make. Otherwise skip.
