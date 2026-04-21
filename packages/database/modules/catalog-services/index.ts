import { pool } from "../../pool";
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

export async function findCatalogServiceById(id: string): Promise<CatalogService | null> {
  const result = await pool.query<CatalogService>(
    "SELECT * FROM catalog_services WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

/** Find a child catalog service by its top-level parent name and its own name. */
export async function findCatalogServiceByPath(
  parentName: string,
  childName: string,
): Promise<CatalogService | null> {
  const result = await pool.query<CatalogService>(
    `SELECT c.* FROM catalog_services c
       JOIN catalog_services p ON c.parent_id = p.id
       WHERE p.name = $1 AND c.name = $2`,
    [parentName, childName],
  );
  return result.rows[0] ?? null;
}
