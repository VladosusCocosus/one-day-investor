import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
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
  .onError(({ error, code, path }) => {
    log.error({ err: error, code, path }, "Unhandled request error");
    return { error: "Internal server error" };
  })
  .use(createAgentScope(ANALYTICS_AGENT_ALLOWED_PREFIXES))
  .use(analyticsApi)
  .get("/", () => "Analytics service")
  .listen(3001);

log.info({ port: 3001 }, "Analytics service started");
