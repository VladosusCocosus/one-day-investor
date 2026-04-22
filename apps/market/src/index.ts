import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import config from "@config";
import { createLogger } from "@logger";
import { createAgentScope } from "./auth/agent-scope";
import { api } from "./api";

const log = createLogger("market-app");

const MARKET_AGENT_ALLOWED_PREFIXES = [
  "/api/asset-catalog",
  "/api/pocket-assets",
  "/api/market",
] as const;

const app = new Elysia()
  .use(cors({
    origin: [config.get("frontendUrl"), config.get("siteUrl")],
    credentials: true,
  }))
  .onError(({ error, code, path }) => {
    log.error({ err: error, code, path }, "Unhandled request error");
    return { error: "Internal server error" };
  })
  .use(createAgentScope(MARKET_AGENT_ALLOWED_PREFIXES))
  .use(api)
  .get("/", () => "Market service")
  .listen(3002);

log.info({ port: 3002 }, "Market service started");
