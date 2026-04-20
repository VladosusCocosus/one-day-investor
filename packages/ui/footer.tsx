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
