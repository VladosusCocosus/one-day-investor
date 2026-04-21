import { Elysia } from "elysia";
import { findCatalogServiceByPath, findCatalogServiceById, findServicesByUserId, findPdfStatementImportById } from "@database";
import { createLogger } from "@logger";
import { resolveUser } from "../auth/session";
import {
  getImporter,
  runInvestImport,
  runSavingsPreview,
  commitMissingDeletions,
} from "../services/pdf-import";

const log = createLogger("api:pdf-import");
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

async function resolveProviderImporter(provider: unknown, userId: string) {
  if (typeof provider !== "string") return null;
  const importer = getImporter(provider);
  if (!importer) return null;
  return importer;
}

export const pdfImportApi = new Elysia({ prefix: "/api/integrations" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .post("/pdf-upload", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const form = body as Record<string, unknown>;
    const file = form.file;
    const provider = form.provider;
    const serviceId = form.service_id;

    if (!(file instanceof File)) {
      set.status = 400;
      return { error: "No file provided" };
    }
    if (file.size > MAX_BYTES) {
      set.status = 413;
      return { error: "File too large (max 5 MB)" };
    }
    if (file.type && !file.type.includes("pdf")) {
      set.status = 400;
      return { error: "File must be a PDF" };
    }
    if (typeof serviceId !== "string" || !serviceId) {
      set.status = 400;
      return { error: "service_id is required" };
    }
    const importer = await resolveProviderImporter(provider, user.id);
    if (!importer) {
      set.status = 400;
      return { error: `Unknown provider '${String(provider)}'` };
    }

    // Validate that the user's service is linked to the expected catalog path.
    const userServices = await findServicesByUserId(user.id);
    const service = userServices.find((s) => s.id === serviceId);
    if (!service) {
      set.status = 404;
      return { error: "Service not found" };
    }
    if (!service.catalog_service_id) {
      set.status = 400;
      return { error: "Service is not linked to a catalog entry" };
    }
    const catalogChild = await findCatalogServiceById(service.catalog_service_id);
    const expectedChild = await findCatalogServiceByPath(
      importer.catalogServicePath[0],
      importer.catalogServicePath[1],
    );
    if (!catalogChild || !expectedChild || catalogChild.id !== expectedChild.id) {
      set.status = 400;
      return { error: `Service does not match provider '${importer.provider}'` };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const result = await runInvestImport({
        userId: user.id,
        serviceId,
        importer,
        buffer,
      });
      return result;
    } catch (err) {
      log.error({ err, provider: importer.provider }, "invest import failed");
      set.status = 400;
      return { error: err instanceof Error ? err.message : "Import failed" };
    }
  })
  .post("/pdf-upload/confirm-deletions", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { importRowId, pocketAssetIds } = (body ?? {}) as {
      importRowId?: string;
      pocketAssetIds?: string[];
    };
    if (!importRowId || !Array.isArray(pocketAssetIds)) {
      set.status = 400;
      return { error: "importRowId and pocketAssetIds are required" };
    }
    // Guard: ensure the import belongs to this user.
    const imp = await findPdfStatementImportById(importRowId, user.id);
    if (!imp) {
      set.status = 404;
      return { error: "Import not found" };
    }
    try {
      return await commitMissingDeletions({
        userId: user.id,
        importRowId,
        pocketAssetIds,
      });
    } catch (err) {
      log.error({ err, importRowId }, "confirm-deletions failed");
      set.status = 400;
      return { error: err instanceof Error ? err.message : "Delete failed" };
    }
  });

/**
 * Flow A preview handler — exported for mounting inside the existing
 * snapshotsApi (same Elysia prefix). Parses a Flexible Cash Funds PDF,
 * uploads it under a preview prefix in S3, and returns { s3Key, parsed }
 * so the SnapshotDrawer can pre-fill the amount field and reference the
 * S3 key on snapshot submit.
 */
export async function handleSnapshotsPdfPreview(ctx: {
  user: { id: string } | null;
  set: { status?: unknown } & Record<string, unknown>;
  body: unknown;
}): Promise<unknown> {
  const { user, set, body } = ctx as {
    user: { id: string } | null;
    set: { status: number };
    body: unknown;
  };
  if (!user) {
    set.status = 401;
    return { error: "Unauthorized" };
  }
  const form = body as Record<string, unknown>;
  const file = form.file;
  const provider = form.provider;
  if (!(file instanceof File)) {
    set.status = 400;
    return { error: "No file provided" };
  }
  if (file.size > MAX_BYTES) {
    set.status = 413;
    return { error: "File too large (max 5 MB)" };
  }
  const importer = await resolveProviderImporter(provider, user.id);
  if (!importer || !importer.toAmountForSnapshot) {
    set.status = 400;
    return { error: `Unknown or non-savings provider '${String(provider)}'` };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    return await runSavingsPreview({ userId: user.id, importer, buffer });
  } catch (err) {
    log.error({ err, provider: importer.provider }, "savings preview failed");
    set.status = 400;
    return { error: err instanceof Error ? err.message : "Preview failed" };
  }
}
