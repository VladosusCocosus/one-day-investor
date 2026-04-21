import { UnknownDocumentError } from "./types";

export type DocumentKind = "securities" | "savings";

export function detectDocumentKind(text: string): DocumentKind {
  const head = text.slice(0, 4000);
  if (/Flexible Cash Funds Statement/i.test(head)) return "savings";
  if (/Account Statement/i.test(head) && /Revolut Securities Europe UAB/i.test(text)) {
    return "securities";
  }
  throw new UnknownDocumentError();
}
