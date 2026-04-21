// @ts-expect-error — pdf-parse ships a package entry that triggers a debug harness;
// the internal file avoids that and matches @types/pdf-parse.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { detectDocumentKind } from "./detect";
import { parseSecuritiesStatement } from "./parsers/securities";
import { parseSavingsStatement } from "./parsers/savings";
import type { RevolutDocument } from "./types";

export async function parseRevolutPdf(buffer: Buffer): Promise<RevolutDocument> {
  const parsed = await pdfParse(buffer);
  const text = parsed.text;
  const kind = detectDocumentKind(text);
  if (kind === "securities") return parseSecuritiesStatement(text);
  return parseSavingsStatement(text);
}

export type {
  RevolutDocument,
  SecuritiesStatement,
  SecuritiesCurrencySection,
  SecuritiesHolding,
  FlexibleCashFundsStatement,
  FlexibleCashFund,
  Locale,
} from "./types";
export { UnknownDocumentError, LocaleDetectionError, MalformedStatementError } from "./types";
