import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";

const featureKeys = ["pockets", "assets", "snapshots", "analytics"] as const;

const icons: Record<string, string> = {
  pockets: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  assets: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2.468"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`,
  snapshots: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  analytics: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
};

export function Features({ locale }: { locale: Locale }) {
  return (
    <section id="features" class="px-6 py-24 md:px-8 md:py-32">
      <div class="mx-auto max-w-[1200px]">
        <div class="mx-auto max-w-[720px] text-center">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {t("features.label", locale)}
          </p>
          <h2 class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
            {t("features.title", locale)}
          </h2>
        </div>
        <div class="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featureKeys.map((key) => (
            <div class="rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-7 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60">
              <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                {icons[key] as "safe"}
              </div>
              <h3 class="mt-5 text-xl font-semibold text-emerald-50">
                {t(`features.${key}.title`, locale)}
              </h3>
              <p class="mt-3 text-sm leading-relaxed text-emerald-200/90">
                {t(`features.${key}.body`, locale)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
