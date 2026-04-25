import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import config from "@config";
import { createLogger } from "@logger";
import { createAgentScope } from "./auth/agent-scope";
import { analyticsApi } from "./api/analytics";

const log = createLogger("analytics");

const ANALYTICS_AGENT_ALLOWED_PREFIXES = ["/api/analytics"] as const;

const app = new Elysia()
  .use(cors({
    origin: [config.get("frontendUrl"), config.get("siteUrl")],
    credentials: true,
  }))
  .use(swagger({
    path: "/api/swagger",
    scalarConfig: {
      spec: { url: "/api/swagger/json" },
    },
    documentation: {
      info: {
        title: "One Day Investor — Analytics API",
        version: "1.0.0",
        description: "Computed analytics over user snapshots. Bearer auth via https://odinvestor.net/agents.json.",
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "opaque" },
        },
      },
      tags: [
        { name: "Analytics", description: "Timeline, distribution, current totals" },
      ],
    },
  }))
  .onError(({ error, code, set, path }) => {
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not found", path };
    }
    if (code === "VALIDATION") {
      set.status = 422;
      const details = error instanceof Error ? error.message : "Validation failed";
      return { error: "Validation failed", details };
    }
    if (code === "PARSE") {
      set.status = 400;
      return { error: "Malformed request body" };
    }
    log.error({ err: error, code, path }, "Unhandled request error");
    set.status = 500;
    return { error: "Internal server error" };
  })
  .use(createAgentScope(ANALYTICS_AGENT_ALLOWED_PREFIXES))
  .use(analyticsApi)
  .get("/", () => "Analytics service")
  .listen(3001);

log.info({ port: 3001 }, "Analytics service started");
