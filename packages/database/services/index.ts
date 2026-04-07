import { pool } from "../pool";
import type { Service } from "@types";

export type { Service } from "@types";

export async function findServicesByUserId(userId: string): Promise<Service[]> {
  const result = await pool.query<Service>(
    "SELECT * FROM services WHERE user_id = $1 ORDER BY sort_order, created_at",
    [userId]
  );
  return result.rows;
}

export async function createService(params: {
  user_id: string;
  name: string;
  parent_id: string | null;
}): Promise<Service> {
  const result = await pool.query<Service>(
    "INSERT INTO services (user_id, name, parent_id) VALUES ($1, $2, $3) RETURNING *",
    [params.user_id, params.name, params.parent_id]
  );
  return result.rows[0];
}

export async function updateService(
  id: string,
  userId: string,
  params: { name?: string; parent_id?: string | null; sort_order?: number }
): Promise<Service | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(params.name);
  }
  if (params.parent_id !== undefined) {
    fields.push(`parent_id = $${idx++}`);
    values.push(params.parent_id);
  }
  if (params.sort_order !== undefined) {
    fields.push(`sort_order = $${idx++}`);
    values.push(params.sort_order);
  }

  if (fields.length === 0) return null;

  values.push(id, userId);
  const result = await pool.query<Service>(
    `UPDATE services SET ${fields.join(", ")} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteService(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM services WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
