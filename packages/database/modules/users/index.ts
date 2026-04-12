import { pool } from "../../pool";
import type { User } from "@types";

export type { User } from "@types";

export async function findUserById(id: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] ?? null;
}

export async function createUser(params: {
  email: string;
  name: string | null;
  avatar_url: string | null;
}): Promise<User> {
  const result = await pool.query<User>(
    "INSERT INTO users (email, name, avatar_url) VALUES ($1, $2, $3) RETURNING *",
    [params.email, params.name, params.avatar_url]
  );
  return result.rows[0];
}
