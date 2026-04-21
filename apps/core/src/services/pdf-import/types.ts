import type { RevolutDocument } from "@revolut-pdf";

export type ProviderSlug = "revolut-invest" | "revolut-savings";

export interface HoldingDraft {
  symbol: string;
  isin: string | null;
  displayName: string;
  quantity: string;           // decimal as string
  currency: string;
}

export interface SavingsDraft {
  amount: string;             // closing balance, decimal as string
  currency: string;
  periodEnd: Date;
  generatedAt: Date;
  accountNumber: string | null;
}

export interface ImportDiffResult {
  created: Array<{ symbol: string; isin: string | null; quantity: string }>;
  updated: Array<{ id: string; symbol: string; oldQuantity: string; newQuantity: string }>;
  missing: Array<{ id: string; symbol: string; quantity: string }>;
  importRowId: string;
  statementPeriod: { start: string | null; end: string | null };
  uploadedAt: Date;
}

export interface SavingsPreviewResult {
  s3Key: string;
  parsed: SavingsDraft;
}

/** The contract every provider implements. The runner is broker-agnostic. */
export interface PdfStatementImporter {
  readonly provider: ProviderSlug;
  readonly documentType: "securities" | "savings";
  /** catalog_services lookup path: ['Revolut', 'Invest'] for Revolut > Invest. */
  readonly catalogServicePath: readonly [string, string];

  parse(buffer: Buffer): Promise<RevolutDocument>;

  /** Flow B: produce a flat list of holdings to upsert into pocket_assets. */
  toHoldings?(parsed: RevolutDocument): HoldingDraft[];

  /** Flow A: produce the number that pre-fills a snapshot entry. */
  toAmountForSnapshot?(parsed: RevolutDocument): SavingsDraft;
}
