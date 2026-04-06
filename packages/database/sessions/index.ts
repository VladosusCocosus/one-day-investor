import { pool } from "../pool";

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export async function createSession(params: {
  user_id: string;
  token: string;
  expires_at: Date;
}): Promise<Session> {
  const result = await pool.query<Session>(
    "INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *",
    [params.user_id, params.token, params.expires_at]
  );
  return result.rows[0];
}

export async function findSessionByToken(
  token: string
): Promise<Session | null> {
  const result = await pool.query<Session>(
    "SELECT * FROM sessions WHERE token = $1 AND expires_at > now()",
    [token]
  );
  return result.rows[0] ?? null;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
}
