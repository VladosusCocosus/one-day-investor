import { pool } from "../../pool";
import type { ExchangeCredential } from "@types";

export type { ExchangeCredential } from "@types";

export async function createExchangeCredential(params: {
  user_id: string;
  exchange: string;
  label: string;
  api_key: string;
  api_secret: string;
  service_id: string | null;
}): Promise<ExchangeCredential> {
  const result = await pool.query<ExchangeCredential>(
    `INSERT INTO exchange_credentials (user_id, exchange, label, api_key, api_secret, service_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      params.user_id,
      params.exchange,
      params.label,
      params.api_key,
      params.api_secret,
      params.service_id,
    ]
  );
  return result.rows[0];
}

export async function findExchangeCredentialsByUserId(
  userId: string
): Promise<ExchangeCredential[]> {
  const result = await pool.query<ExchangeCredential>(
    "SELECT * FROM exchange_credentials WHERE user_id = $1 ORDER BY created_at",
    [userId]
  );
  return result.rows;
}

export async function findExchangeCredentialById(
  id: string
): Promise<ExchangeCredential | null> {
  const result = await pool.query<ExchangeCredential>(
    "SELECT * FROM exchange_credentials WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function deleteExchangeCredential(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM exchange_credentials WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
