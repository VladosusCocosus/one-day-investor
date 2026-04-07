import { findSessionByToken, findUserById } from "@database";
import { createLogger } from "@logger";
import type { User } from "@types";

const log = createLogger("analytics-auth");

export async function resolveUser(cookie: Record<string, { value?: string }>): Promise<User | null> {
  const token = cookie.session?.value;

  if (!token) {
    return null;
  }

  try {
    const session = await findSessionByToken(token);

    if (!session) {
      log.debug("Session token not found or expired");
      return null;
    }

    return findUserById(session.user_id);
  } catch (err) {
    log.error({ err }, "Failed to resolve user session");
    return null;
  }
}
