import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";
import { XTwitterIcon, LinkedInIcon, InstagramIcon } from "@icons";

export function Footer({ locale }: { locale: Locale }) {
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
              One Day Investor
            </span>
          </div>
          <p class="max-w-[420px] text-sm leading-relaxed text-emerald-200/70">
            {t("footer.tagline", locale)}
          </p>
          <div class="flex items-center gap-5">
            <a
              href="https://x.com/razin36986"
              target="_blank"
              rel="noopener noreferrer"
              class="text-emerald-300/70 transition-colors hover:text-emerald-200 [&>svg]:h-[18px] [&>svg]:w-[18px]"
              aria-label="X (Twitter)"
            >
              {XTwitterIcon as "safe"}
            </a>
            <a
              href="https://www.linkedin.com/in/vladislav-razin-7b3420240/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-emerald-300/70 transition-colors hover:text-emerald-200 [&>svg]:h-[18px] [&>svg]:w-[18px]"
              aria-label="LinkedIn"
            >
              {LinkedInIcon as "safe"}
            </a>
            <a
              href="https://www.instagram.com/cocosik86/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-emerald-300/70 transition-colors hover:text-emerald-200 [&>svg]:h-[18px] [&>svg]:w-[18px]"
              aria-label="Instagram"
            >
              {InstagramIcon as "safe"}
            </a>
          </div>
          <div class="text-xs text-emerald-300/50">{t("footer.copyright", locale)}</div>
        </div>
      </div>
    </footer>
  );
}
