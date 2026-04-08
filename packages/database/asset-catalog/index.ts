import { pool } from "../pool";
import type { AssetCatalog, AssetType } from "@types";

export type { AssetCatalog } from "@types";
export { upsertAssets, type UpsertAssetInput } from "./upsert";

export async function findAllAssetCatalog(): Promise<AssetCatalog[]> {
  const result = await pool.query<AssetCatalog>(
    "SELECT * FROM asset_catalog ORDER BY asset_type, sort_order"
  );
  return result.rows;
}

export async function searchAssetCatalog(
  query: string,
  assetType?: AssetType
): Promise<AssetCatalog[]> {
  if (assetType) {
    const result = await pool.query<AssetCatalog>(
      `SELECT * FROM asset_catalog
       WHERE (symbol ILIKE $1 OR name ILIKE $1) AND asset_type = $2
       ORDER BY sort_order LIMIT 20`,
      [`%${query}%`, assetType]
    );
    return result.rows;
  }
  const result = await pool.query<AssetCatalog>(
    `SELECT * FROM asset_catalog
     WHERE symbol ILIKE $1 OR name ILIKE $1
     ORDER BY sort_order LIMIT 20`,
    [`%${query}%`]
  );
  return result.rows;
}
