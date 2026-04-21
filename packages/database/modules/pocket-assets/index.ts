import { pool } from "../../pool";
import type { PocketAsset, AssetType } from "@types";

export type { PocketAsset } from "@types";

export async function findPocketAssetsByServiceId(
  serviceId: string
): Promise<(PocketAsset & { api_id: string | null })[]> {
  const result = await pool.query<PocketAsset & { api_id: string | null }>(
    `SELECT pa.*, ac.api_id
     FROM pocket_assets pa
     LEFT JOIN asset_catalog ac ON pa.asset_catalog_id = ac.id
     WHERE pa.service_id = $1
     ORDER BY pa.sort_order, pa.symbol`,
    [serviceId]
  );
  return result.rows;
}

export async function findPocketAssetsByServiceIds(
  serviceIds: string[]
): Promise<(PocketAsset & { api_id: string | null })[]> {
  if (serviceIds.length === 0) return [];
  const result = await pool.query<PocketAsset & { api_id: string | null }>(
    `SELECT pa.*, ac.api_id
     FROM pocket_assets pa
     LEFT JOIN asset_catalog ac ON pa.asset_catalog_id = ac.id
     WHERE pa.service_id = ANY($1)
     ORDER BY pa.service_id, pa.sort_order, pa.symbol`,
    [serviceIds]
  );
  return result.rows;
}

export async function addPocketAsset(params: {
  service_id: string;
  asset_catalog_id?: string | null;
  symbol: string;
  name: string;
  asset_type: AssetType;
  quantity?: string | number;
}): Promise<PocketAsset> {
  const result = await pool.query<PocketAsset>(
    `INSERT INTO pocket_assets (service_id, asset_catalog_id, symbol, name, asset_type, quantity)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 0)) RETURNING *`,
    [
      params.service_id,
      params.asset_catalog_id ?? null,
      params.symbol,
      params.name,
      params.asset_type,
      params.quantity ?? null,
    ]
  );
  return result.rows[0];
}

export async function updatePocketAssetQuantity(
  id: string,
  quantity: number
): Promise<PocketAsset | null> {
  const result = await pool.query<PocketAsset>(
    "UPDATE pocket_assets SET quantity = $1 WHERE id = $2 RETURNING *",
    [quantity, id]
  );
  return result.rows[0] ?? null;
}

export async function updatePocketAsset(
  id: string,
  patch: { service_id?: string; quantity?: number }
): Promise<PocketAsset | null> {
  const sets: string[] = [];
  const values: (string | number)[] = [];
  let i = 1;

  if (patch.service_id !== undefined) {
    sets.push(`service_id = $${i++}`);
    values.push(patch.service_id);
  }
  if (patch.quantity !== undefined) {
    sets.push(`quantity = $${i++}`);
    values.push(patch.quantity);
  }

  if (sets.length === 0) {
    // Nothing to update — just return current row
    const current = await pool.query<PocketAsset>(
      "SELECT * FROM pocket_assets WHERE id = $1",
      [id]
    );
    return current.rows[0] ?? null;
  }

  values.push(id);
  const result = await pool.query<PocketAsset>(
    `UPDATE pocket_assets SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function removePocketAsset(id: string): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM pocket_assets WHERE id = $1",
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
