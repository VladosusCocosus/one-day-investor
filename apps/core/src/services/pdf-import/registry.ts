import type { PdfStatementImporter, ProviderSlug } from "./types";

const registry = new Map<string, PdfStatementImporter>();

export function registerImporter(importer: PdfStatementImporter): void {
  registry.set(importer.provider, importer);
}

export function getImporter(slug: string): PdfStatementImporter | null {
  return registry.get(slug) ?? null;
}

export function listImporters(): PdfStatementImporter[] {
  return [...registry.values()];
}

export function hasProvider(slug: string): slug is ProviderSlug {
  return registry.has(slug);
}
