import { pool } from "../pool";
import type { AssetType } from "@types";

export interface UpsertAssetInput {
  symbol: string;
  name: string;
  asset_type: AssetType;
  api_id: string;
  isin?: string | null;
}

export async function upsertAssets(
  assets: UpsertAssetInput[],
  source: string,
): Promise<{ upserted: number }> {
  let upserted = 0;
  const batchSize = 50;

  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, i + batchSize);
    const values: unknown[] = [];
    const placeholders = batch.map((a, j) => {
      const offset = j * 7;
      values.push(
        a.symbol,
        a.name,
        a.asset_type,
        a.api_id,
        i + j + 1,
        source,
        a.isin ?? null,
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
    });

    const result = await pool.query(
      `INSERT INTO asset_catalog (symbol, name, asset_type, api_id, sort_order, source, isin)
       VALUES ${placeholders.join(", ")}
       ON CONFLICT (symbol, asset_type) DO UPDATE
         SET name = EXCLUDED.name,
             api_id = EXCLUDED.api_id,
             source = EXCLUDED.source,
             isin = COALESCE(EXCLUDED.isin, asset_catalog.isin)`,
      values,
    );
    upserted += result.rowCount ?? 0;
  }

  return { upserted };
}
