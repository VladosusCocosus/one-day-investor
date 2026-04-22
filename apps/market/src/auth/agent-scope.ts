import { Elysia } from "elysia";
import { resolveAuth } from "./session";

export type { ResolvedAuth } from "./session";

function isAllowed(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
}

/**
 * Create an agent-scope Elysia plugin for a specific service. The plugin
 * derives `{ user, agentId }` on every request and 403s any request that
 * presents an agent token (agentId !== null) and targets a path outside
 * the caller-supplied allowlist. Cookie-authenticated users are unaffected.
 *
 * Each service instantiates its own instance with the prefixes it actually
 * hosts. Mount as the first `.use(...)` in the service's api composition.
 */
export function createAgentScope(allowedPrefixes: readonly string[]) {
  return new Elysia({ name: "agent-scope" })
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
      if (!isAllowed(path, allowedPrefixes)) {
        set.status = 403;
        return { error: "Agent tokens cannot access this endpoint" };
      }
    });
}
