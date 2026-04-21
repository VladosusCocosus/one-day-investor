export type RevolutDocument = SecuritiesStatement | FlexibleCashFundsStatement;

export interface SecuritiesStatement {
  type: "securities";
  accountHolder: string;
  accountNumber: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  currencies: SecuritiesCurrencySection[];
}

export interface SecuritiesCurrencySection {
  currency: string;
  positionsValueEnd: string;
  cashValueEnd: string;
  totalEnd: string;
  holdings: SecuritiesHolding[];
}

export interface SecuritiesHolding {
  symbol: string;
  company: string;
  isin: string;
  quantity: string;
  price: string;
  valueNative: string;
}

export interface FlexibleCashFundsStatement {
  type: "savings";
  accountHolder: string;
  accountNumber: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  currency: string;
  closingBalance: string;
  funds: FlexibleCashFund[];
}

export interface FlexibleCashFund {
  name: string;
  shareClass: string;
  isin: string;
  currency: string;
  quantity: string;
  price: string;
  valueNative: string;
}

export type Locale = "en" | "es";

export class UnknownDocumentError extends Error {
  constructor(message = "Could not recognise this as a Revolut PDF statement") {
    super(message);
    this.name = "UnknownDocumentError";
  }
}

export class LocaleDetectionError extends Error {
  constructor(message = "Could not detect document locale") {
    super(message);
    this.name = "LocaleDetectionError";
  }
}

export class MalformedStatementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedStatementError";
  }
}
