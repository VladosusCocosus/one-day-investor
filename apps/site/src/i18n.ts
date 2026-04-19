import { findSessionByToken, findUserById, getSettings } from "@database";
import en from "./locales/en.json";
import ru from "./locales/ru.json";
import es from "./locales/es.json";

const messages: Record<string, Record<string, string>> = { en, ru, es };
const SUPPORTED = ["en", "ru", "es"] as const;
export type Locale = (typeof SUPPORTED)[number];

export function isLocale(v: string): v is Locale {
  return (SUPPORTED as readonly string[]).includes(v);
}

export function t(key: string, locale: Locale): string {
  return messages[locale]?.[key] ?? messages.en[key] ?? key;
}

export function localePath(path: string, locale: Locale): string {
  if (locale === "en") return path;
  return `/${locale}${path}`;
}

function parseAcceptLanguage(header: string | undefined): Locale | null {
  if (!header) return null;
  const langs = header
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang.trim().split("-")[0].toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of langs) {
    if (isLocale(lang)) return lang;
  }
  return null;
}

export async function resolveLocale(
  urlPrefix: string | undefined,
  sessionCookie: string | undefined,
  langCookie: string | undefined,
  acceptLanguage: string | undefined
): Promise<Locale> {
  // 1. URL prefix takes highest priority
  if (urlPrefix && isLocale(urlPrefix)) return urlPrefix;

  // 2. Session cookie → user settings language
  if (sessionCookie) {
    try {
      const session = await findSessionByToken(sessionCookie);
      if (session) {
        const user = await findUserById(session.user_id);
        if (user) {
          const settings = await getSettings(user.id);
          if (settings?.language && isLocale(settings.language)) {
            return settings.language;
          }
        }
      }
    } catch {
      // ignore DB errors
    }
  }

  // 3. Language cookie
  if (langCookie && isLocale(langCookie)) return langCookie;

  // 4. Accept-Language header
  const fromHeader = parseAcceptLanguage(acceptLanguage);
  if (fromHeader) return fromHeader;

  // 5. Default
  return "en";
}
