import { findSessionByToken, findUserById } from "@database";
import type { User } from "@types";

export async function resolveUser(cookie: Record<string, { value?: string }>): Promise<User | null> {
  const token = cookie.session?.value;

  if (!token) {
    return null;
  }

  const session = await findSessionByToken(token);

  if (!session) {
    return null;
  }

  return findUserById(session.user_id);
}
