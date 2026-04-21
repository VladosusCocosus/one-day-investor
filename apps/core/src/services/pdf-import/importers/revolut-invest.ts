import { parseRevolutPdf, type RevolutDocument } from "@revolut-pdf";
import type { HoldingDraft, PdfStatementImporter } from "../types";

export const revolutInvestImporter: PdfStatementImporter = {
  provider: "revolut-invest",
  documentType: "securities",
  catalogServicePath: ["Revolut", "Invest"],

  async parse(buffer) {
    const doc = await parseRevolutPdf(buffer);
    if (doc.type !== "securities") {
      throw new Error(
        `Expected a Revolut Securities statement, got '${doc.type}'. Please upload the correct PDF.`,
      );
    }
    return doc;
  },

  toHoldings(parsed: RevolutDocument): HoldingDraft[] {
    if (parsed.type !== "securities") return [];
    const out: HoldingDraft[] = [];
    for (const section of parsed.currencies) {
      for (const h of section.holdings) {
        out.push({
          symbol: h.symbol,
          isin: h.isin,
          displayName: h.company || h.symbol,
          quantity: h.quantity,
          currency: section.currency,
        });
      }
    }
    return out;
  },
};
