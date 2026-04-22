import { Elysia } from "elysia";
import { resolveAuth } from "./session";

const AGENT_ALLOWED_PREFIXES = [
  "/api/snapshots",
  "/api/services",
  "/api/assets",
  "/api/catalog",
  "/api/analytics",
] as const;

/**
 * Derives `{ user, agentId }` once per request and short-circuits with 403 when
 * an agent-authenticated request targets a disallowed route. Mount this BEFORE
 * the `api` plugin in `apps/core/src/index.ts` (via `api/index.ts`).
 *
 * Cookie-authenticated users (agentId === null) pass through unchanged.
 */
export const agentScope = new Elysia({ name: "agent-scope" })
  .derive(async ({ cookie, request }) => {
    const headers = Object.fromEntries(request.headers.entries()) as Record<
      string,
      string | undefined
    >;
    const { user, agentId } = await resolveAuth(
      cookie as Record<string, { value?: string }>,
      headers
    );
    return { user, agentId };
  })
  .onBeforeHandle(({ agentId, path, set }) => {
    if (agentId === null) return;
    const allowed = AGENT_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
    if (!allowed) {
      set.status = 403;
      return { error: "Agent tokens cannot access this endpoint" };
    }
  });
