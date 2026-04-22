import { pool } from "../../pool";
import type { Agent } from "@types";

export type { Agent } from "@types";

export async function createAgent(params: {
  user_id: string;
  name: string;
  description: string | null;
}): Promise<Agent> {
  const result = await pool.query<Agent>(
    `INSERT INTO agents (user_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [params.user_id, params.name, params.description]
  );
  return result.rows[0];
}

export async function listAgentsByUserId(userId: string): Promise<Agent[]> {
  const result = await pool.query<Agent>(
    `SELECT * FROM agents
     WHERE user_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function findAgentById(
  id: string,
  userId: string
): Promise<Agent | null> {
  const result = await pool.query<Agent>(
    "SELECT * FROM agents WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL",
    [id, userId]
  );
  return result.rows[0] ?? null;
}

export async function updateAgent(
  id: string,
  userId: string,
  params: { name?: string; description?: string | null }
): Promise<Agent | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(params.name);
  }
  if (params.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(params.description);
  }
  if (fields.length === 0) return findAgentById(id, userId);

  values.push(id, userId);
  const result = await pool.query<Agent>(
    `UPDATE agents SET ${fields.join(", ")}
     WHERE id = $${idx++} AND user_id = $${idx} AND revoked_at IS NULL
     RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function revokeAgent(
  id: string,
  userId: string
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const agent = await client.query(
      `UPDATE agents SET revoked_at = now()
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
       RETURNING id`,
      [id, userId]
    );
    if (agent.rowCount === 0) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `UPDATE sessions SET revoked_at = now()
       WHERE agent_id = $1 AND revoked_at IS NULL`,
      [id]
    );
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function touchAgentLastUsed(id: string): Promise<void> {
  await pool.query("UPDATE agents SET last_used_at = now() WHERE id = $1", [id]);
}

export async function countActiveTokensByAgentId(
  agentId: string
): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM sessions
     WHERE agent_id = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [agentId]
  );
  return Number(result.rows[0].count);
}
