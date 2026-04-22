import {
  findSessionByToken,
  findSessionByTokenHash,
  findUserById,
  touchSessionLastUsed,
  touchAgentLastUsed,
} from "@database";
import { createLogger } from "@logger";
import type { User } from "@types";
import { parseBearer, sha256Hex } from "./agent-token";

const log = createLogger("analytics-auth");

export interface ResolvedAuth {
  user: User | null;
  agentId: string | null;
}

export async function resolveAuth(
  cookie: Record<string, { value?: string }>,
  headers?: Record<string, string | undefined>
): Promise<ResolvedAuth> {
  const bearer = parseBearer(headers?.authorization);
  if (bearer) {
    try {
      const session = await findSessionByTokenHash(sha256Hex(bearer));
      if (!session) {
        log.debug("Bearer token not found or expired/revoked");
        return { user: null, agentId: null };
      }
      touchSessionLastUsed(session.id).catch((err) =>
        log.warn({ err }, "touchSessionLastUsed failed")
      );
      if (session.agent_id) {
        touchAgentLastUsed(session.agent_id).catch((err) =>
          log.warn({ err }, "touchAgentLastUsed failed")
        );
      }
      const user = await findUserById(session.user_id);
      return { user, agentId: session.agent_id };
    } catch (err) {
      log.error({ err }, "Bearer auth resolution failed");
      return { user: null, agentId: null };
    }
  }

  const token = cookie.session?.value;
  if (!token) return { user: null, agentId: null };

  try {
    const session = await findSessionByToken(token);
    if (!session) return { user: null, agentId: null };
    const user = await findUserById(session.user_id);
    return { user, agentId: null };
  } catch (err) {
    log.error({ err }, "Cookie auth resolution failed");
    return { user: null, agentId: null };
  }
}

/**
 * Back-compat wrapper. Existing call sites that only care about the User
 * can keep using this. New code (and the scope middleware) should use
 * `resolveAuth`.
 */
export async function resolveUser(
  cookie: Record<string, { value?: string }>,
  headers?: Record<string, string | undefined>
): Promise<User | null> {
  const { user } = await resolveAuth(cookie, headers);
  return user;
}
