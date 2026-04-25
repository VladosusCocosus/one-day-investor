import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
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
  .use(swagger({
    path: "/api/swagger",
    scalarConfig: {
      spec: { url: "/api/swagger/json" },
    },
    documentation: {
      info: {
        title: "One Day Investor — Market API",
        version: "1.0.0",
        description: "Asset catalog, pocket-asset management, and market data. Bearer auth via https://odinvestor.net/agents.json.",
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "opaque" },
        },
      },
      tags: [
        { name: "Asset Catalog", description: "Asset search" },
        { name: "Pocket Assets", description: "Holdings within a pocket" },
        { name: "Market",        description: "Market data and tickers" },
      ],
    },
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
