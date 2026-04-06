import { pool } from "../pool";
import type { OAuthAccount } from "@types";

export type { OAuthAccount } from "@types";

export async function findOAuthAccount(
  provider: string,
  providerUserId: string
): Promise<OAuthAccount | null> {
  const result = await pool.query<OAuthAccount>(
    "SELECT * FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2",
    [provider, providerUserId]
  );
  return result.rows[0] ?? null;
}

export async function createOAuthAccount(params: {
  user_id: string;
  provider: string;
  provider_user_id: string;
}): Promise<OAuthAccount> {
  const result = await pool.query<OAuthAccount>(
    "INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES ($1, $2, $3) RETURNING *",
    [params.user_id, params.provider, params.provider_user_id]
  );
  return result.rows[0];
}
