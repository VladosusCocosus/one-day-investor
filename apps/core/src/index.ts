import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import config from "@config";
import { createLogger } from "@logger";
import { auth } from "./auth";
import { api } from "./api";

const log = createLogger("core");

const app = new Elysia()
  .use(cors({
    origin: config.get("frontendUrl"),
    credentials: true,
  }))
  .use(swagger({
    path: "/api/swagger",
    scalarConfig: {
      spec: { url: "/api/swagger/json" },
    },
    documentation: {
      info: {
        title: "One Day Investor — Core API",
        version: "1.0.0",
        description:
          "User pockets, assets, snapshots, and catalog. Agents authenticate with a bearer token (see https://odinvestor.net/agents.json).",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "opaque",
          },
        },
      },
      tags: [
        { name: "Snapshots",     description: "Monthly portfolio snapshots" },
        { name: "Pockets",       description: "User pockets (services)" },
        { name: "Assets",        description: "Pocket assets (holdings)" },
        { name: "Catalog",       description: "Service catalog search" },
        { name: "Agents",        description: "Manage agents and tokens (cookie-auth only)" },
        { name: "Settings",      description: "User settings (cookie-auth only)" },
        { name: "Notifications", description: "Notification preferences" },
        { name: "Exchange",      description: "Exchange credentials (cookie-auth only)" },
        { name: "Admin",         description: "Admin-only (cookie-auth only)" },
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
  .use(auth)
  .use(api)
  .get("/", () => "Hello Elysia")
  .listen(3000);

log.info({ port: 3000 }, "Core service started");
