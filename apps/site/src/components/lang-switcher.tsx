import Html from "@kitajs/html";
import { t, localePath, type Locale } from "../i18n";

const locales: Locale[] = ["en", "ru", "es"];

export function LangSwitcher({
  locale,
  canonicalPath,
}: {
  locale: Locale;
  canonicalPath: string;
}) {
  return (
    <div class="hidden items-center gap-1 md:flex">
      {locales.map((l) => (
        <a
          href={localePath(canonicalPath, l)}
          class={`rounded px-1.5 py-0.5 text-xs font-semibold transition-colors ${
            l === locale
              ? "bg-emerald-50/15 text-emerald-100"
              : "text-emerald-300/60 hover:text-emerald-200"
          }`}
          aria-current={l === locale ? "true" : undefined}
        >
          {t(`lang.${l}`, locale)}
        </a>
      ))}
    </div>
  );
}
