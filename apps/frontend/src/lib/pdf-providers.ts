import type { CatalogService } from "@/hooks/useCatalog";

export interface PdfProviderInfo {
  slug: "revolut-invest" | "revolut-savings";
  parentName: string;
  childName: string;
  helpText: string;
}

export const PDF_PROVIDERS: PdfProviderInfo[] = [
  {
    slug: "revolut-savings",
    parentName: "Revolut",
    childName: "Savings",
    helpText:
      "Download your Flexible Cash Funds statement from the Revolut app → Savings → Statements.",
  },
  {
    slug: "revolut-invest",
    parentName: "Revolut",
    childName: "Invest",
    helpText:
      "Download your Account Statement from the Revolut app → Invest → Statements.",
  },
];

/** Resolve the provider slug for a given catalog service (child). */
export function providerForCatalogEntry(
  allCatalog: CatalogService[],
  catalogServiceId: string | null,
): PdfProviderInfo | null {
  if (!catalogServiceId) return null;
  const child = allCatalog.find((c) => c.id === catalogServiceId);
  if (!child) return null;
  const parent = child.parent_id
    ? allCatalog.find((c) => c.id === child.parent_id)
    : null;
  if (!parent) return null;
  return (
    PDF_PROVIDERS.find(
      (p) => p.parentName === parent.name && p.childName === child.name,
    ) ?? null
  );
}
