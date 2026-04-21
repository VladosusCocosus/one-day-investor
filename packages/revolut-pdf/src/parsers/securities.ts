import { MalformedStatementError, type SecuritiesCurrencySection, type SecuritiesHolding, type SecuritiesStatement } from "../types";
import { detectLocale, parseDate, parseDateTime, parseNumber } from "../locale";
import { isValidIsin } from "../isin";

const ISIN_WINDOW_RE = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

function findIsinCandidatesRightToLeft(row: string): Array<{ idx: number; isin: string }> {
  // `matchAll` returns non-overlapping matches, which can hide real ISINs when
  // adjacent text accidentally forms a 12-char ISIN-like prefix (e.g. "ETF" +
  // "IE00BFMXXD5"). Scan every 12-char window and return right-to-left so the
  // caller tries the rightmost (real) anchor first — both candidates may pass
  // the check digit, but the real one is always latest in the row.
  const out: Array<{ idx: number; isin: string }> = [];
  for (let i = 0; i + 12 <= row.length; i++) {
    const slice = row.slice(i, i + 12);
    if (ISIN_WINDOW_RE.test(slice)) out.push({ idx: i, isin: slice });
  }
  return out.reverse();
}

const CCY_GLYPH_TO_CODE: Record<string, string> = {
  "US$": "USD",
  "€": "EUR",
  "£": "GBP",
  CHF: "CHF",
};

/** Strip a currency glyph prefix and return the numeric portion. */
function stripCurrencyGlyph(s: string): string {
  return s.replace(/^(US\$|€|£|CHF\s?)/, "");
}

/** Split a concatenated "SYMBOLCompanyName" prefix into ticker + company.
 *
 * Revolut PDF text has NO separator between ticker and company. We use two
 * heuristics:
 *   1. The ticker's end is marked by a lowercase letter (case transition).
 *   2. The ticker's end is marked by a non-alphanumeric character (e.g. "&" in
 *      "SPGIS&P" where the company is "S&P").
 * Whichever gives a shorter ticker wins (tickers are 1-5 chars in practice).
 * For all-caps companies like "STMicroelectronics" or "ASML Holding" neither
 * heuristic fires cleanly; we fall back to a 4-char default.
 */
function splitSymbolCompany(s: string): { symbol: string; company: string } {
  const head = s.slice(0, 10);
  const candidates: number[] = [];
  const lowerMatch = head.match(/[a-z]/);
  if (lowerMatch && lowerMatch.index !== undefined && lowerMatch.index >= 2) {
    candidates.push(lowerMatch.index - 1);
  }
  const specialMatch = head.match(/[^A-Za-z0-9.\-]/);
  if (specialMatch && specialMatch.index !== undefined && specialMatch.index >= 2) {
    candidates.push(specialMatch.index);
  }
  if (candidates.length > 0) {
    const splitIdx = Math.min(...candidates);
    return { symbol: s.slice(0, splitIdx), company: s.slice(splitIdx) };
  }
  return { symbol: s.slice(0, 4), company: s.slice(4) };
}

function buildPostIsinRegex(locale: "en" | "es"): RegExp {
  // - Quantity: high-precision decimal (e.g. 4.26803244)
  // - Price / Value: always 2 decimal places, locale-aware thousands separator
  // - Pct: decimal percentage (may have locale-specific separator too)
  const money2dp = locale === "es"
    ? "\\d{1,3}(?:\\.\\d{3})*,\\d{2}"
    : "\\d{1,3}(?:,\\d{3})*\\.\\d{2}";
  const glyph = "(?:US\\$|€|£|CHF\\s?)";
  return new RegExp(
    `^(\\d+(?:\\.\\d+)?)${glyph}(${money2dp})${glyph}(${money2dp})\\d+(?:[.,]\\d+)?%$`,
  );
}

/**
 * An ISIN has 2 letters + 10 alphanumerics. When symbol/company/ISIN are
 * concatenated with no separators, a substring of the company name (e.g.
 * "ETF" at the end of "Vanguard … ETF") can produce a spurious ISIN match.
 *
 * We iterate all 12-char candidates left-to-right and accept the first
 * whose post-ISIN segment parses cleanly as <qty><price><value><pct>.
 */
function parseHoldingRow(row: string, locale: "en" | "es"): SecuritiesHolding {
  const postRe = buildPostIsinRegex(locale);
  for (const { idx, isin } of findIsinCandidatesRightToLeft(row)) {
    if (!isValidIsin(isin)) continue;
    const after = row.slice(idx + 12);
    const afterMatch = after.match(postRe);
    if (!afterMatch) continue;

    const before = row.slice(0, idx);
    const { symbol, company } = splitSymbolCompany(before);
    const [, quantityRaw, priceRaw, valueRaw] = afterMatch;
    return {
      symbol: symbol.trim(),
      company: company.trim(),
      isin,
      quantity: parseNumber(quantityRaw, locale),
      price: parseNumber(priceRaw, locale),
      valueNative: parseNumber(valueRaw, locale),
    };
  }
  throw new MalformedStatementError(`Could not parse holding row: ${row}`);
}

function extractCurrencySection(pageText: string, locale: "en" | "es"): SecuritiesCurrencySection {
  // "USD Account summary" or "EUR Account summary"
  const summaryHeader = pageText.match(/^(USD|EUR|GBP|CHF) Account summary/m);
  if (!summaryHeader) throw new MalformedStatementError("Missing '<ccy> Account summary' section header");
  const currency = summaryHeader[1];

  // Ending values in the summary block. Example lines:
  //   Positions ValueUS$4,452.12US$5,450.41   (starting, ending)
  //   Cash value*US$0.65US$0.08
  //   TotalUS$4,452.77US$5,450.49
  // We want the ENDING (second) value.
  const moneyRe = "(?:US\\$|€|£|CHF)([\\d,]+(?:\\.\\d+)?)";
  const positionsLine = pageText.match(new RegExp(`^Positions Value${moneyRe}${moneyRe}`, "m"));
  const cashLine = pageText.match(new RegExp(`^Cash value\\*${moneyRe}${moneyRe}`, "m"));
  const totalLine = pageText.match(new RegExp(`^Total${moneyRe}${moneyRe}`, "m"));
  if (!positionsLine || !cashLine || !totalLine) {
    throw new MalformedStatementError(`Missing summary rows for ${currency} section`);
  }

  const holdings: SecuritiesHolding[] = [];
  // Find the portfolio breakdown block: starts after header row, ends at the "Positions Value...100%" footer.
  const breakdownStart = pageText.indexOf(`${currency} Portfolio breakdown`);
  if (breakdownStart === -1) throw new MalformedStatementError(`Missing '${currency} Portfolio breakdown'`);
  const breakdownBody = pageText.slice(breakdownStart);
  const headerEnd = breakdownBody.indexOf("% of Portfolio");
  if (headerEnd === -1) throw new MalformedStatementError("Missing portfolio header");
  const afterHeader = breakdownBody.slice(headerEnd + "% of Portfolio".length);
  // Terminator: the "Positions ValueUS$...100%" footer row (no ISIN, starts with 'Positions Value')
  const terminatorIdx = afterHeader.search(/\nPositions Value(?:US\$|€|£|CHF)/);
  const holdingsBlock = terminatorIdx === -1 ? afterHeader : afterHeader.slice(0, terminatorIdx);

  const isinTest = /[A-Z]{2}[A-Z0-9]{9}\d/;
  for (const rawLine of holdingsBlock.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (!isinTest.test(line)) continue;
    holdings.push(parseHoldingRow(line, locale));
  }

  return {
    currency,
    positionsValueEnd: parseNumber(positionsLine[2], locale),
    cashValueEnd: parseNumber(cashLine[2], locale),
    totalEnd: parseNumber(totalLine[2], locale),
    holdings,
  };
}

export function parseSecuritiesStatement(text: string): SecuritiesStatement {
  const locale = detectLocale(text);

  // "Generated on the 21 Apr 2026" — uses spaces; no concatenation issue.
  const generatedAtMatch = text.match(/Generated on the\s+(\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+\d{4})/);
  if (!generatedAtMatch) throw new MalformedStatementError("Missing 'Generated on the' line");

  // "Period01 Apr 2026 - 21 Apr 2026" — no space after "Period"
  const periodMatch = text.match(/Period\s*(\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+\d{4})\s*-\s*(\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+\d{4})/);
  if (!periodMatch) throw new MalformedStatementError("Missing Period range");

  // "Account nameVLADISLAV RAZIN" — label immediately followed by value.
  const nameMatch = text.match(/Account name([^\n]+)/);
  const numberMatch = text.match(/Account number([A-Z0-9-]+)/);
  if (!nameMatch || !numberMatch) throw new MalformedStatementError("Missing Account name/number");

  // Split by page header to handle multi-currency documents (each ccy section is its own page).
  // Each page begins with "Account Statement" at the top.
  const pageChunks = text.split(/\nAccount Statement\n/g).map((c) => c.trim()).filter(Boolean);
  const currencies: SecuritiesCurrencySection[] = [];
  for (const chunk of pageChunks) {
    if (!/^(USD|EUR|GBP|CHF) Account summary/m.test(chunk)) continue;
    currencies.push(extractCurrencySection(chunk, locale));
  }
  if (currencies.length === 0) {
    throw new MalformedStatementError("No currency sections found");
  }

  return {
    type: "securities",
    accountHolder: nameMatch[1].trim(),
    accountNumber: numberMatch[1].trim(),
    periodStart: parseDate(periodMatch[1], locale),
    periodEnd: parseDate(periodMatch[2], locale),
    generatedAt: parseDateTime(generatedAtMatch[1], locale),
    currencies,
  };
}

export { CCY_GLYPH_TO_CODE, stripCurrencyGlyph };
