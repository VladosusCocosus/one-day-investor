import { registerImporter } from "./registry";
import { revolutInvestImporter } from "./importers/revolut-invest";
import { revolutSavingsImporter } from "./importers/revolut-savings";

registerImporter(revolutInvestImporter);
registerImporter(revolutSavingsImporter);

export { getImporter, hasProvider, listImporters, registerImporter } from "./registry";
export {
  runInvestImport,
  runSavingsPreview,
  commitMissingDeletions,
} from "./runner";
export type {
  HoldingDraft,
  ImportDiffResult,
  PdfStatementImporter,
  ProviderSlug,
  SavingsDraft,
  SavingsPreviewResult,
} from "./types";
