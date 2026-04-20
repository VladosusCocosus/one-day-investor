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
