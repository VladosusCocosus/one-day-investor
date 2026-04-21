import { parseRevolutPdf, type RevolutDocument } from "@revolut-pdf";
import type { PdfStatementImporter, SavingsDraft } from "../types";

export const revolutSavingsImporter: PdfStatementImporter = {
  provider: "revolut-savings",
  documentType: "savings",
  catalogServicePath: ["Revolut", "Savings"],

  async parse(buffer) {
    const doc = await parseRevolutPdf(buffer);
    if (doc.type !== "savings") {
      throw new Error(
        `Expected a Revolut Flexible Cash Funds statement, got '${doc.type}'. Please upload the correct PDF.`,
      );
    }
    return doc;
  },

  toAmountForSnapshot(parsed: RevolutDocument): SavingsDraft {
    if (parsed.type !== "savings") throw new Error("Expected savings document");
    return {
      amount: parsed.closingBalance,
      currency: parsed.currency,
      periodEnd: parsed.periodEnd,
      generatedAt: parsed.generatedAt,
      accountNumber: parsed.accountNumber || null,
    };
  },
};
