import { Elysia } from "elysia";
import {
  createAgent,
  listAgentsByUserId,
  findAgentById,
  updateAgent,
  revokeAgent,
  countActiveTokensByAgentId,
  createAgentSession,
  listTokensByAgentId,
  revokeAgentSession,
} from "@database";
import { resolveAuth } from "../auth/session";
import {
  generateAgentToken,
  isValidExpiresIn,
  expiresAtFrom,
} from "../auth/agent-token";
import { createLogger } from "@logger";

const log = createLogger("api:agents");

export const agentsApi = new Elysia({ prefix: "/api/agents" })
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
  .get("/", async ({ user, agentId, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const agents = await listAgentsByUserId(user.id);
    const withCounts = await Promise.all(
      agents.map(async (a) => ({
        ...a,
        active_token_count: await countActiveTokensByAgentId(a.id),
      }))
    );
    return withCounts;
  })
  .post("/", async ({ user, agentId, body, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { name, description } = (body ?? {}) as {
      name?: string;
      description?: string;
    };
    if (!name || name.trim().length === 0) {
      set.status = 400;
      return { error: "name is required" };
    }
    const agent = await createAgent({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
    });
    set.status = 201;
    return agent;
  })
  .patch("/:id", async ({ user, agentId, params, body, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { name, description } = (body ?? {}) as {
      name?: string;
      description?: string | null;
    };
    const agent = await updateAgent(params.id, user.id, { name, description });
    if (!agent) {
      set.status = 404;
      return { error: "Agent not found" };
    }
    return agent;
  })
  .delete("/:id", async ({ user, agentId, params, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const ok = await revokeAgent(params.id, user.id);
    if (!ok) {
      set.status = 404;
      return { error: "Agent not found" };
    }
    set.status = 204;
    return;
  })
  .get("/:id/tokens", async ({ user, agentId, params, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const agent = await findAgentById(params.id, user.id);
    if (!agent) {
      set.status = 404;
      return { error: "Agent not found" };
    }
    const tokens = await listTokensByAgentId(params.id);
    return tokens.map((t) => ({
      id: t.id,
      token_last4: t.token_last4,
      created_at: t.created_at,
      expires_at: t.expires_at,
      last_used_at: t.last_used_at,
      revoked_at: t.revoked_at,
    }));
  })
  .post("/:id/tokens", async ({ user, agentId, params, body, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const agent = await findAgentById(params.id, user.id);
    if (!agent) {
      set.status = 404;
      return { error: "Agent not found" };
    }
    const { expires_in } = (body ?? {}) as { expires_in?: string };
    if (!expires_in || !isValidExpiresIn(expires_in)) {
      set.status = 400;
      return {
        error: "expires_in must be one of: 1h, 6h, 24h, 7d, 30d",
      };
    }
    const { plaintext, hash, last4 } = generateAgentToken();
    const session = await createAgentSession({
      user_id: user.id,
      agent_id: params.id,
      token_hash: hash,
      token_last4: last4,
      expires_at: expiresAtFrom(expires_in),
    });
    log.info(
      { userId: user.id, agentId: params.id, tokenId: session.id, expires_in },
      "agent token created"
    );
    set.status = 201;
    return {
      id: session.id,
      token: plaintext,
      token_last4: last4,
      expires_at: session.expires_at,
    };
  })
  .delete("/:id/tokens/:tokenId", async ({ user, agentId, params, set }) => {
    if (!user || agentId !== null) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const agent = await findAgentById(params.id, user.id);
    if (!agent) {
      set.status = 404;
      return { error: "Agent not found" };
    }
    const ok = await revokeAgentSession(params.tokenId, user.id, params.id);
    if (!ok) {
      set.status = 404;
      return { error: "Token not found" };
    }
    set.status = 204;
    return;
  });
