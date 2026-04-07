import { pool } from "../pool";
import type { CatalogService } from "@types";

export type { CatalogService } from "@types";

export async function findAllCatalogServices(): Promise<CatalogService[]> {
  const result = await pool.query<CatalogService>(
    "SELECT * FROM catalog_services ORDER BY sort_order, name"
  );
  return result.rows;
}

export async function searchCatalogServices(query: string): Promise<CatalogService[]> {
  const result = await pool.query<CatalogService>(
    `SELECT * FROM catalog_services
     WHERE parent_id IS NULL AND name ILIKE $1
     ORDER BY sort_order, name`,
    [`%${query}%`]
  );
  return result.rows;
}
