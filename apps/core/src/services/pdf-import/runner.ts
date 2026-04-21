import {
  addPocketAsset,
  createPdfStatementImport,
  findPocketAssetsByServiceId,
  updatePocketAssetQuantity,
  findPdfStatementImportById,
  appendImportDeletions,
  removePocketAsset,
  pool,
} from "@database";
import { upload } from "@storage";
import { createLogger } from "@logger";
import type {
  ImportDiffResult,
  PdfStatementImporter,
  SavingsPreviewResult,
} from "./types";

const log = createLogger("pdf-import:runner");

function isoDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Find-or-create an asset_catalog row for a PDF holding. Preference order:
 *   1. Match by ISIN (ac.isin = h.isin) — authoritative share code.
 *   2. Match by symbol+asset_type, and if found, backfill its ISIN.
 *   3. Insert a new row.
 *
 * asset_catalog has UNIQUE(symbol, asset_type) so we can't have two 'invest'
 * rows with the same symbol. If the symbol happens to be imprecise (e.g.
 * "SPGIS" vs "SPGI") but shares the same ISIN, step 1 avoids duplicates.
 */
async function upsertAssetCatalogByIsin(
  client: import("pg").PoolClient,
  h: { symbol: string; isin: string | null; displayName: string },
): Promise<string | null> {
  if (h.isin) {
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM asset_catalog WHERE isin = $1 LIMIT 1",
      [h.isin],
    );
    if (existing.rows[0]) return existing.rows[0].id;
  }
  // Try symbol match (+invest type) and backfill ISIN if missing.
  const bySym = await client.query<{ id: string; isin: string | null }>(
    "SELECT id, isin FROM asset_catalog WHERE UPPER(symbol) = UPPER($1) AND asset_type = 'invest' LIMIT 1",
    [h.symbol],
  );
  if (bySym.rows[0]) {
    if (h.isin && !bySym.rows[0].isin) {
      await client.query("UPDATE asset_catalog SET isin = $1 WHERE id = $2", [
        h.isin,
        bySym.rows[0].id,
      ]);
    }
    return bySym.rows[0].id;
  }
  // Insert a new catalog row. api_id is the symbol by convention (used for
  // price enrichment); source marks the provenance for auditability.
  try {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO asset_catalog (symbol, name, asset_type, api_id, isin, source)
         VALUES ($1, $2, 'invest', $1, $3, 'revolut-pdf')
         RETURNING id`,
      [h.symbol, h.displayName || h.symbol, h.isin],
    );
    return inserted.rows[0]?.id ?? null;
  } catch (err) {
    // Likely UNIQUE(symbol,asset_type) race — fall back to a lookup.
    log.warn({ err, symbol: h.symbol }, "asset_catalog insert failed, falling back to lookup");
    const again = await client.query<{ id: string }>(
      "SELECT id FROM asset_catalog WHERE UPPER(symbol) = UPPER($1) AND asset_type = 'invest' LIMIT 1",
      [h.symbol],
    );
    return again.rows[0]?.id ?? null;
  }
}

/** Flow B — full import pipeline for a securities/invest PDF. */
export async function runInvestImport(params: {
  userId: string;
  serviceId: string;
  importer: PdfStatementImporter;
  buffer: Buffer;
}): Promise<ImportDiffResult> {
  const { userId, serviceId, importer, buffer } = params;
  if (!importer.toHoldings) throw new Error("Importer does not support invest flow");

  const parsed = await importer.parse(buffer);
  if (parsed.type !== "securities") throw new Error("Not a securities statement");

  const draft = importer.toHoldings(parsed);

  const s3Key = `revolut-pdfs/${userId}/invest/${isoDate(parsed.periodEnd) ?? "unknown"}-${Date.now()}.pdf`;
  await upload(s3Key, buffer, "application/pdf");

  const existing = await findPocketAssetsByServiceId(serviceId);

  // Match existing pocket_assets to PDF holdings by ISIN (the authoritative
  // share code) first, falling back to symbol only when the stored row has no
  // ISIN yet. Symbols extracted from the PDF can be imprecise (e.g. "SPGIS"
  // instead of "SPGI" when the company name is all-caps); ISIN never drifts.
  const byIsin = new Map<string, (typeof existing)[number]>();
  const bySymbol = new Map<string, (typeof existing)[number]>();
  for (const e of existing) {
    if (e.isin) byIsin.set(e.isin.toUpperCase(), e);
    if (e.symbol) bySymbol.set(e.symbol.toUpperCase(), e);
  }

  const created: ImportDiffResult["created"] = [];
  const updated: ImportDiffResult["updated"] = [];
  const seenExistingIds = new Set<string>();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const h of draft) {
      // ISIN-first lookup; symbol-fallback for legacy rows without ISIN.
      let match = h.isin ? byIsin.get(h.isin.toUpperCase()) : undefined;
      if (!match && h.symbol) match = bySymbol.get(h.symbol.toUpperCase());

      if (match) {
        if (seenExistingIds.has(match.id)) continue; // already handled
        seenExistingIds.add(match.id);
        if (match.quantity !== h.quantity) {
          await client.query(
            "UPDATE pocket_assets SET quantity = $1 WHERE id = $2",
            [h.quantity, match.id],
          );
          updated.push({
            id: match.id,
            symbol: match.symbol,
            oldQuantity: match.quantity,
            newQuantity: h.quantity,
          });
        }
        // Backfill the ISIN link on existing rows that had none — ensures
        // future imports match by ISIN without re-running this fallback.
        if (h.isin && !match.isin) {
          const catId = await upsertAssetCatalogByIsin(client, h);
          if (catId) {
            await client.query(
              "UPDATE pocket_assets SET asset_catalog_id = $1 WHERE id = $2",
              [catId, match.id],
            );
          }
        }
        continue;
      }

      // New holding — link to asset_catalog by ISIN (preferred) or symbol.
      const catalogId = await upsertAssetCatalogByIsin(client, h);

      await client.query<{ id: string }>(
        `INSERT INTO pocket_assets (service_id, asset_catalog_id, symbol, name, asset_type, quantity)
         VALUES ($1, $2, $3, $4, 'invest', $5) RETURNING id`,
        [serviceId, catalogId, h.symbol, h.displayName, h.quantity],
      );
      created.push({ symbol: h.symbol, isin: h.isin, quantity: h.quantity });
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    log.error({ err }, "runInvestImport transaction failed");
    throw err;
  } finally {
    client.release();
  }

  const missing = existing
    .filter((e) => !seenExistingIds.has(e.id))
    .map((e) => ({ id: e.id, symbol: e.symbol, quantity: e.quantity }));

  const importRow = await createPdfStatementImport({
    user_id: userId,
    provider: importer.provider,
    document_type: "securities",
    service_id: serviceId,
    account_number: parsed.accountNumber,
    period_start: isoDate(parsed.periodStart),
    period_end: isoDate(parsed.periodEnd),
    generated_at: parsed.generatedAt,
    currency: parsed.currencies[0]?.currency ?? null,
    s3_key: s3Key,
    parsed_data: parsed,
  });

  return {
    created,
    updated,
    missing,
    importRowId: importRow.id,
    statementPeriod: {
      start: isoDate(parsed.periodStart),
      end: isoDate(parsed.periodEnd),
    },
    uploadedAt: importRow.uploaded_at,
  };
}

/** Flow A step 1 — preview-parse a savings PDF; stores it under a preview prefix. */
export async function runSavingsPreview(params: {
  userId: string;
  importer: PdfStatementImporter;
  buffer: Buffer;
}): Promise<SavingsPreviewResult> {
  const { userId, importer, buffer } = params;
  if (!importer.toAmountForSnapshot) throw new Error("Importer does not support savings flow");

  const parsed = await importer.parse(buffer);
  if (parsed.type !== "savings") throw new Error("Not a savings statement");
  const draft = importer.toAmountForSnapshot(parsed);

  const s3Key = `revolut-pdfs/${userId}/savings/preview/${Date.now()}.pdf`;
  await upload(s3Key, buffer, "application/pdf");

  return { s3Key, parsed: draft };
}

/** Flow B step 2 — user confirmed which missing symbols to delete. */
export async function commitMissingDeletions(params: {
  userId: string;
  importRowId: string;
  pocketAssetIds: string[];
}): Promise<{ deleted: Array<{ id: string; symbol: string }> }> {
  const { userId, importRowId, pocketAssetIds } = params;
  if (pocketAssetIds.length === 0) return { deleted: [] };

  const imp = await findPdfStatementImportById(importRowId, userId);
  if (!imp || !imp.service_id) throw new Error("Import not found or not linked to a service");

  const toDelete = await pool.query<{ id: string; symbol: string }>(
    `SELECT id, symbol FROM pocket_assets
       WHERE id = ANY($1) AND service_id = $2`,
    [pocketAssetIds, imp.service_id],
  );

  for (const row of toDelete.rows) {
    await removePocketAsset(row.id);
  }

  if (toDelete.rows.length > 0) {
    await appendImportDeletions(importRowId, toDelete.rows);
  }

  return { deleted: toDelete.rows };
}

// Re-export for callers that might want a simple upsert helper elsewhere.
export { addPocketAsset, updatePocketAssetQuantity };
