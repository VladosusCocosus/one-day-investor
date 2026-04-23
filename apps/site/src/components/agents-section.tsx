import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";
import { Bot, KeyRound, ShieldCheck, Sparkles } from "lucide-static";

const cardKeys = ["agent", "keys", "spec"] as const;

const cardIcons: Record<string, string> = {
  agent: Bot,
  keys: KeyRound,
  spec: ShieldCheck,
};

export function AgentsSection({ locale }: { locale: Locale }) {
  return (
    <section id="agents" class="px-6 py-24 md:px-8 md:py-32">
      <div class="mx-auto max-w-[1200px]">
        <div class="mx-auto max-w-[760px] text-center">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {t("agents_section.label", locale)}
          </p>
          <h2 class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
            {t("agents_section.title", locale)}
          </h2>
          <p class="mt-6 text-base leading-relaxed text-emerald-200/90">
            {t("agents_section.subtitle", locale)}
          </p>
        </div>

        <div class="mx-auto mt-14 max-w-[820px] overflow-hidden rounded-2xl border border-emerald-900/50 bg-emerald-950/60 shadow-[0_0_60px_-20px_rgba(16,185,129,0.25)] backdrop-blur-sm">
          <div class="flex items-center gap-2 border-b border-emerald-900/50 bg-emerald-950/40 px-5 py-3">
            <div class="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30 [&>svg]:h-3.5 [&>svg]:w-3.5">
              {Sparkles as "safe"}
            </div>
            <span class="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              {t("agents_section.prompt_label", locale)}
            </span>
          </div>
          <pre class="overflow-x-auto whitespace-pre-wrap break-words px-5 py-5 font-mono text-[13px] leading-relaxed text-emerald-100">{t("agents_section.prompt_body", locale)}</pre>
        </div>

        <div class="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {cardKeys.map((key) => (
            <div class="rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-7 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30 [&>svg]:h-5 [&>svg]:w-5">
                {cardIcons[key] as "safe"}
              </div>
              <h3 class="mt-5 text-lg font-semibold text-emerald-50">
                {t(`agents_section.${key}.title`, locale)}
              </h3>
              <p class="mt-2 text-sm leading-relaxed text-emerald-200/90">
                {t(`agents_section.${key}.body`, locale)}
              </p>
            </div>
          ))}
        </div>

        <div class="mt-10 text-center">
          <a
            href="/agents.json"
            class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300 transition-colors hover:text-emerald-200"
            target="_blank"
            rel="noreferrer"
          >
            {t("agents_section.cta", locale)}
          </a>
        </div>
      </div>
    </section>
  );
}
