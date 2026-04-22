import { pool } from "../../pool";
import type { Session } from "@types";

export type { Session } from "@types";

/**
 * Cookie session creation (legacy plaintext token path).
 * Unchanged signature for back-compat.
 */
export async function createSession(params: {
  user_id: string;
  token: string;
  expires_at: Date;
}): Promise<Session> {
  const result = await pool.query<Session>(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [params.user_id, params.token, params.expires_at]
  );
  return result.rows[0];
}

/**
 * Agent-session creation. Stores only the SHA-256 hash of the plaintext token
 * plus the last 4 characters for UI display.
 */
export async function createAgentSession(params: {
  user_id: string;
  agent_id: string;
  token_hash: string;
  token_last4: string;
  expires_at: Date;
}): Promise<Session> {
  const result = await pool.query<Session>(
    `INSERT INTO sessions (user_id, agent_id, token_hash, token_last4, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      params.user_id,
      params.agent_id,
      params.token_hash,
      params.token_last4,
      params.expires_at,
    ]
  );
  return result.rows[0];
}

/** Cookie lookup. Filters on expires_at and revoked_at. */
export async function findSessionByToken(
  token: string
): Promise<Session | null> {
  const result = await pool.query<Session>(
    `SELECT * FROM sessions
     WHERE token = $1
       AND expires_at > now()
       AND revoked_at IS NULL`,
    [token]
  );
  return result.rows[0] ?? null;
}

/** Bearer lookup. Filters on expires_at and revoked_at. */
export async function findSessionByTokenHash(
  tokenHash: string
): Promise<Session | null> {
  const result = await pool.query<Session>(
    `SELECT * FROM sessions
     WHERE token_hash = $1
       AND expires_at > now()
       AND revoked_at IS NULL`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
}

/** Best-effort last-used stamp. Callers fire-and-forget. */
export async function touchSessionLastUsed(id: string): Promise<void> {
  await pool.query(
    "UPDATE sessions SET last_used_at = now() WHERE id = $1",
    [id]
  );
}

export async function revokeSession(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE sessions SET revoked_at = now()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * List active+revoked tokens for an agent. Caller filters user ownership upstream.
 * Used by the management UI — never called by agent-authenticated requests.
 */
export async function listTokensByAgentId(agentId: string): Promise<Session[]> {
  const result = await pool.query<Session>(
    `SELECT * FROM sessions
     WHERE agent_id = $1
     ORDER BY created_at DESC`,
    [agentId]
  );
  return result.rows;
}

/**
 * Revoke a token that belongs to both the given user AND the given agent.
 * Returns true if a row was updated. Used by DELETE /api/agents/:id/tokens/:tokenId.
 */
export async function revokeAgentSession(
  sessionId: string,
  userId: string,
  agentId: string
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE sessions SET revoked_at = now()
     WHERE id = $1 AND user_id = $2 AND agent_id = $3 AND revoked_at IS NULL`,
    [sessionId, userId, agentId]
  );
  return (result.rowCount ?? 0) > 0;
}
