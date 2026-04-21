import { MalformedStatementError, type FlexibleCashFund, type FlexibleCashFundsStatement } from "../types";
import { detectLocale, parseDate, parseNumber } from "../locale";

const ISIN_RE = /[A-Z]{2}[A-Z0-9]{9}\d/;

export function parseSavingsStatement(text: string): FlexibleCashFundsStatement {
  const locale = detectLocale(text);

  // "Period 1 abr 2026 - 21 abr 2026"   (es)
  // "Period 1 Apr 2026 - 21 Apr 2026"   (en)
  const periodMatch = text.match(/Period\s+(\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+\d{4})\s*-\s*(\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+\d{4})/);
  if (!periodMatch) throw new MalformedStatementError("Missing Period range");

  // "Generation date: 21 abr 2026"
  const genMatch = text.match(/Generation date:\s*(\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+\d{4})/);
  if (!genMatch) throw new MalformedStatementError("Missing 'Generation date'");

  // Account number appears as "{uuid}Account Number" OR "Account Number{uuid}".
  const acctMatch = text.match(/Account Number\s*([0-9a-f\-]{16,})/i)
    ?? text.match(/([0-9a-f\-]{16,})Account Number/i);
  const accountNumber = acctMatch?.[1]?.trim() ?? "";

  // Summary block. Closing Balance is the authoritative "how much is in the fund" value.
  const closingMatch = text.match(/Closing Balance\s*([\d.,-]+)/);
  if (!closingMatch) throw new MalformedStatementError("Missing 'Closing Balance'");
  const closingBalance = parseNumber(closingMatch[1], locale);

  // Currency is present in the section header "Flexible Cash Funds - EUR"
  const sectionHeader = text.match(/Flexible Cash Funds - ([A-Z]{3})/);
  const currency = sectionHeader?.[1] ?? "EUR";

  // Fund holdings table at the end. Header: "Fund nameShare classISINCurrencyQuantityPriceValue"
  // Then the fund rows (can span multiple lines per cell). Anchor on the last ISIN occurrence;
  // the line containing an ISIN has: {ISIN}{CCY}{Quantity}{Price} {CCY}{Value}
  const summaryIdx = text.lastIndexOf("Summary");
  const tail = summaryIdx !== -1 ? text.slice(summaryIdx) : text;

  const funds: FlexibleCashFund[] = [];
  // Row shape example (no separators between columns):
  //   IE000AZVL3K0EUR5342.791.00 EUR5.342,79
  // Quantity uses dot-decimal regardless of locale; price is always \d+\.\d{2};
  // value is locale-formatted with exactly 2 decimals.
  const localeValue = locale === "es"
    ? "\\d{1,3}(?:\\.\\d{3})*,\\d{2}"
    : "\\d{1,3}(?:,\\d{3})*\\.\\d{2}";
  const fundRowRe = new RegExp(
    `(${ISIN_RE.source})([A-Z]{3})(\\d+(?:\\.\\d+)?)(\\d+\\.\\d{2})\\s+([A-Z]{3})(${localeValue})`,
    "g",
  );
  for (const m of tail.matchAll(fundRowRe)) {
    const [, isin, ccy, qtyRaw, priceRaw, , valueRaw] = m;
    funds.push({
      name: "",
      shareClass: "",
      isin,
      currency: ccy,
      quantity: parseNumber(qtyRaw, "en"),
      price: parseNumber(priceRaw, "en"),
      valueNative: parseNumber(valueRaw, locale),
    });
  }

  return {
    type: "savings",
    accountHolder: "",
    accountNumber,
    periodStart: parseDate(periodMatch[1], locale),
    periodEnd: parseDate(periodMatch[2], locale),
    generatedAt: parseDate(genMatch[1], locale),
    currency,
    closingBalance,
    funds,
  };
}
