import { pool } from "../../pool";
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

export async function createSettings(
  userId: string,
  params: { language?: string } = {}
): Promise<UserSettings> {
  const result = await pool.query<UserSettings>(
    `INSERT INTO user_settings (user_id, language)
     VALUES ($1, COALESCE($2, 'en'))
     ON CONFLICT (user_id) DO UPDATE SET language = EXCLUDED.language
     RETURNING *`,
    [userId, params.language ?? null]
  );
  return result.rows[0];
}

export async function updateSettings(
  userId: string,
  params: {
    snapshot_day?: number;
    goal?: number;
    currency?: string;
    language?: string;
    notify_snapshot_reminders?: boolean;
    notify_service_updates?: boolean;
    notify_blog_posts?: boolean;
  }
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
  if (params.language !== undefined) {
    fields.push(`language = $${idx++}`);
    values.push(params.language);
  }
  if (params.notify_snapshot_reminders !== undefined) {
    fields.push(`notify_snapshot_reminders = $${idx++}`);
    values.push(params.notify_snapshot_reminders);
  }
  if (params.notify_service_updates !== undefined) {
    fields.push(`notify_service_updates = $${idx++}`);
    values.push(params.notify_service_updates);
  }
  if (params.notify_blog_posts !== undefined) {
    fields.push(`notify_blog_posts = $${idx++}`);
    values.push(params.notify_blog_posts);
  }

  if (fields.length === 0) return getSettings(userId);

  values.push(userId);
  const result = await pool.query<UserSettings>(
    `UPDATE user_settings SET ${fields.join(", ")} WHERE user_id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
}
