import { pool } from "../pool";
import type { UserSettings } from "@types";

export type { UserSettings } from "@types";

export async function getSettings(userId: string): Promise<UserSettings> {
  await pool.query(
    `INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId]
  );
  const result = await pool.query<UserSettings>(
    "SELECT * FROM user_settings WHERE user_id = $1",
    [userId]
  );
  return result.rows[0];
}

export async function updateSettings(
  userId: string,
  params: { snapshot_day?: number; goal?: number; currency?: string }
): Promise<UserSettings> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.snapshot_day !== undefined) {
    fields.push(`snapshot_day = $${idx++}`);
    values.push(params.snapshot_day);
  }
  if (params.goal !== undefined) {
    fields.push(`goal = $${idx++}`);
    values.push(params.goal);
  }
  if (params.currency !== undefined) {
    fields.push(`currency = $${idx++}`);
    values.push(params.currency);
  }

  if (fields.length === 0) return getSettings(userId);

  values.push(userId);
  const result = await pool.query<UserSettings>(
    `UPDATE user_settings SET ${fields.join(", ")} WHERE user_id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
}
