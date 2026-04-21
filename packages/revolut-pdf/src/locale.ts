import type { Locale } from "./types";
import { LocaleDetectionError } from "./types";

const ES_MONTH_TOKENS: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

const EN_MONTH_TOKENS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export function detectLocale(text: string): Locale {
  const sample = text.slice(0, 4000).toLowerCase();
  if (/\b(ene|abr|ago|dic)\b/.test(sample)) return "es";
  if (/\b(jan|apr|aug|dec)\b/.test(sample)) return "en";
  // Number-format fallback: if we see '2.929,05' style, it's es; '5,450.41' style is en.
  if (/\d+\.\d{3},\d/.test(sample)) return "es";
  if (/\d+,\d{3}\.\d/.test(sample)) return "en";
  throw new LocaleDetectionError();
}

export function parseNumber(raw: string, locale: Locale): string {
  const cleaned = raw.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return "0";
  if (locale === "es") {
    // es-ES: '.' thousands, ',' decimal. Strip dots, then swap comma→dot.
    const noThousands = cleaned.replace(/\./g, "");
    return noThousands.replace(",", ".");
  }
  // en: ',' thousands, '.' decimal.
  return cleaned.replace(/,/g, "");
}

export function parseDate(raw: string, locale: Locale): Date {
  const trimmed = raw.trim();
  // Formats seen:
  //   en: "01 Apr 2026"
  //   es: "1 abr 2026"  or  "21 abr 2026"
  const m = trimmed.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})$/);
  if (!m) throw new Error(`Unparsable date: ${raw}`);
  const [, dayStr, monthToken, yearStr] = m;
  const day = Number.parseInt(dayStr, 10);
  const year = Number.parseInt(yearStr, 10);
  const monthKey = monthToken.toLowerCase().slice(0, 3);
  const monthMap = locale === "es" ? ES_MONTH_TOKENS : EN_MONTH_TOKENS;
  const month = monthMap[monthKey];
  if (month === undefined) throw new Error(`Unknown month token '${monthToken}' in locale ${locale}`);
  return new Date(Date.UTC(year, month, day));
}

/** Parse an ISO-ish timestamp like "01 Apr 2026 11:00:43 GMT" — only used for generatedAt */
export function parseDateTime(raw: string, locale: Locale): Date {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(GMT|UTC)?)?$/);
  if (!m) return parseDate(raw, locale);
  const [, dayStr, monthToken, yearStr, hourStr, minStr, secStr] = m;
  const day = Number.parseInt(dayStr, 10);
  const year = Number.parseInt(yearStr, 10);
  const monthKey = monthToken.toLowerCase().slice(0, 3);
  const monthMap = locale === "es" ? ES_MONTH_TOKENS : EN_MONTH_TOKENS;
  const month = monthMap[monthKey];
  if (month === undefined) throw new Error(`Unknown month token '${monthToken}'`);
  const hour = hourStr ? Number.parseInt(hourStr, 10) : 0;
  const min = minStr ? Number.parseInt(minStr, 10) : 0;
  const sec = secStr ? Number.parseInt(secStr, 10) : 0;
  return new Date(Date.UTC(year, month, day, hour, min, sec));
}
