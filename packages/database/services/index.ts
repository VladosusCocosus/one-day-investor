import { pool } from "../pool";
import type { Service, ServiceType } from "@types";

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
  service_type?: ServiceType;
  catalog_service_id?: string | null;
}): Promise<Service> {
  const result = await pool.query<Service>(
    `INSERT INTO services (user_id, name, parent_id, service_type, catalog_service_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      params.user_id,
      params.name,
      params.parent_id,
      params.service_type ?? "common",
      params.catalog_service_id ?? null,
    ]
  );
  return result.rows[0];
}

export async function updateService(
  id: string,
  userId: string,
  params: { name?: string; parent_id?: string | null; sort_order?: number; service_type?: ServiceType }
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
  if (params.service_type !== undefined) {
    fields.push(`service_type = $${idx++}`);
    values.push(params.service_type);
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

export async function subscribeToService(
  userId: string,
  catalogServiceId: string,
  childIds: string[]
): Promise<Service[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get the catalog parent
    const catalogParent = await client.query(
      "SELECT * FROM catalog_services WHERE id = $1",
      [catalogServiceId]
    );
    if (catalogParent.rows.length === 0) {
      throw new Error("Catalog service not found");
    }
    const parent = catalogParent.rows[0];

    // Create the parent user service
    const parentResult = await client.query<Service>(
      `INSERT INTO services (user_id, name, parent_id, service_type, catalog_service_id)
       VALUES ($1, $2, NULL, $3, $4) RETURNING *`,
      [userId, parent.name, parent.service_type, catalogServiceId]
    );
    const parentService = parentResult.rows[0];

    const created: Service[] = [parentService];

    // Create selected child services
    if (childIds.length > 0) {
      const catalogChildren = await client.query(
        "SELECT * FROM catalog_services WHERE id = ANY($1) AND parent_id = $2 ORDER BY sort_order",
        [childIds, catalogServiceId]
      );

      for (const child of catalogChildren.rows) {
        const childResult = await client.query<Service>(
          `INSERT INTO services (user_id, name, parent_id, service_type, catalog_service_id)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [userId, child.name, parentService.id, child.service_type, child.id]
        );
        created.push(childResult.rows[0]);
      }
    }

    await client.query("COMMIT");
    return created;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function unsubscribeFromService(
  userId: string,
  catalogServiceId: string
): Promise<{ success: boolean; error?: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Find all user services linked to this catalog entry (parent + children)
    const userServices = await client.query(
      `SELECT s.id FROM services s
       WHERE s.user_id = $1
         AND (s.catalog_service_id = $2
           OR s.parent_id IN (
             SELECT id FROM services WHERE user_id = $1 AND catalog_service_id = $2
           ))`,
      [userId, catalogServiceId]
    );

    if (userServices.rows.length === 0) {
      await client.query("COMMIT");
      return { success: true };
    }

    const serviceIds = userServices.rows.map((r: { id: string }) => r.id);

    // Check for snapshot entries
    const entries = await client.query(
      "SELECT COUNT(*) as count FROM snapshot_entries WHERE service_id = ANY($1)",
      [serviceIds]
    );

    if (Number(entries.rows[0].count) > 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: "Cannot unsubscribe: services have snapshot data. Delete snapshots first.",
      };
    }

    // Delete children first, then parent
    await client.query(
      "DELETE FROM services WHERE id = ANY($1) AND user_id = $2",
      [serviceIds, userId]
    );

    await client.query("COMMIT");
    return { success: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
