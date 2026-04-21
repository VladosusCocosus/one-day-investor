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
import config from "@config";
import type {
  AssetCandidate,
  ImportDiffResult,
  PdfStatementImporter,
  SavingsPreviewResult,
  UnmatchedHolding,
} from "./types";

const MARKET_URL = config.get("marketUrl");

const log = createLogger("pdf-import:runner");

function isoDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Find an existing asset_catalog row for a PDF holding. Preference order:
 *   1. Match by ISIN (authoritative share code).
 *   2. Match by symbol + asset_type; backfill its ISIN if missing.
 *
 * Does NOT insert. When nothing matches, returns null — the caller records
 * the holding as "unmatched" so the user can pick a candidate from the
 * market search and confirm the addition explicitly.
 */
async function findAssetCatalogByIsin(
  client: import("pg").PoolClient,
  h: { symbol: string; isin: string | null },
): Promise<string | null> {
  if (h.isin) {
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM asset_catalog WHERE isin = $1 LIMIT 1",
      [h.isin],
    );
    if (existing.rows[0]) return existing.rows[0].id;
  }
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
  return null;
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
  const unmatchedRaw: Array<{
    symbol: string;
    isin: string | null;
    displayName: string;
    quantity: string;
  }> = [];

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
          const catId = await findAssetCatalogByIsin(client, h);
          if (catId) {
            await client.query(
              "UPDATE pocket_assets SET asset_catalog_id = $1 WHERE id = $2",
              [catId, match.id],
            );
          }
        }
        continue;
      }

      // No pocket_assets match: try to attach to an existing asset_catalog row.
      const catalogId = await findAssetCatalogByIsin(client, h);
      if (catalogId) {
        await client.query<{ id: string }>(
          `INSERT INTO pocket_assets (service_id, asset_catalog_id, symbol, name, asset_type, quantity)
           VALUES ($1, $2, $3, $4, 'invest', $5) RETURNING id`,
          [serviceId, catalogId, h.symbol, h.displayName, h.quantity],
        );
        created.push({ symbol: h.symbol, isin: h.isin, quantity: h.quantity });
      } else {
        // No catalog row yet — collect for user review + market-search suggestion.
        unmatchedRaw.push(h);
      }
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

  // Ask the market service for candidates for each unmatched holding. Failures
  // here are soft — the user can still confirm manually even with no suggestions.
  const unmatched: UnmatchedHolding[] = await Promise.all(
    unmatchedRaw.map(async (h) => ({
      key: h.isin ?? `sym:${h.symbol}`,
      pdfSymbol: h.symbol,
      isin: h.isin,
      displayName: h.displayName,
      quantity: h.quantity,
      candidates: await fetchMarketCandidates(h.isin ?? h.symbol),
    })),
  );

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
    unmatched,
    importRowId: importRow.id,
    statementPeriod: {
      start: isoDate(parsed.periodStart),
      end: isoDate(parsed.periodEnd),
    },
    uploadedAt: importRow.uploaded_at,
  };
}

async function fetchMarketCandidates(query: string): Promise<AssetCandidate[]> {
  if (!query) return [];
  try {
    const res = await fetch(
      `${MARKET_URL}/api/market/search-assets?q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as AssetCandidate[];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    log.warn({ err, query }, "market search failed, returning no candidates");
    return [];
  }
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

/**
 * Flow B step 2b — user picked market candidates for holdings that didn't
 * match an existing asset_catalog row. For each selection we:
 *   1. Create an asset_catalog row (symbol + api_id + isin + source).
 *   2. Insert the pocket_asset with the recorded quantity linked to it.
 *
 * If a selection has no pick (user declined the candidates), we skip it —
 * the holding simply stays out of the portfolio.
 */
export async function commitUnmatchedAdditions(params: {
  userId: string;
  importRowId: string;
  additions: Array<{
    key: string;
    quantity: string;
    selection: {
      symbol: string;
      name: string | null;
      apiId: string;
      isin: string | null;
    } | null;
  }>;
}): Promise<{ added: Array<{ symbol: string; isin: string | null }> }> {
  const { userId, importRowId, additions } = params;
  const imp = await findPdfStatementImportById(importRowId, userId);
  if (!imp || !imp.service_id) {
    throw new Error("Import not found or not linked to a service");
  }
  const added: Array<{ symbol: string; isin: string | null }> = [];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const a of additions) {
      if (!a.selection) continue;
      const sel = a.selection;

      // Try to find an existing asset_catalog row by ISIN or symbol first.
      let catalogId: string | null = null;
      if (sel.isin) {
        const byIsin = await client.query<{ id: string }>(
          "SELECT id FROM asset_catalog WHERE isin = $1 LIMIT 1",
          [sel.isin],
        );
        catalogId = byIsin.rows[0]?.id ?? null;
      }
      if (!catalogId) {
        const bySym = await client.query<{ id: string }>(
          "SELECT id FROM asset_catalog WHERE UPPER(symbol) = UPPER($1) AND asset_type = 'invest' LIMIT 1",
          [sel.symbol],
        );
        catalogId = bySym.rows[0]?.id ?? null;
      }
      if (!catalogId) {
        const ins = await client.query<{ id: string }>(
          `INSERT INTO asset_catalog (symbol, name, asset_type, api_id, isin, source)
           VALUES ($1, $2, 'invest', $3, $4, 'pdf-user-confirmed')
           RETURNING id`,
          [sel.symbol, sel.name ?? sel.symbol, sel.apiId, sel.isin],
        );
        catalogId = ins.rows[0]?.id ?? null;
      }

      await client.query(
        `INSERT INTO pocket_assets (service_id, asset_catalog_id, symbol, name, asset_type, quantity)
         VALUES ($1, $2, $3, $4, 'invest', $5)`,
        [imp.service_id, catalogId, sel.symbol, sel.name ?? sel.symbol, a.quantity],
      );
      added.push({ symbol: sel.symbol, isin: sel.isin });
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    log.error({ err }, "commitUnmatchedAdditions failed");
    throw err;
  } finally {
    client.release();
  }

  return { added };
}

// Re-export for callers that might want a simple upsert helper elsewhere.
export { addPocketAsset, updatePocketAssetQuantity };
