import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import config from "@config";
import { createLogger } from "@logger";
import { auth } from "./auth";
import { api } from "./api";

const log = createLogger("core");

// Branch/preview environments (hoster) start with an empty database and no
// separate migration step, so core applies migrations itself on boot when
// AUTO_MIGRATE=true. Unset in production — this block is a no-op there.
if (process.env.AUTO_MIGRATE === "true") {
  log.info("AUTO_MIGRATE=true — applying database migrations before start");
  let migrated = false;
  for (let attempt = 1; attempt <= 10 && !migrated; attempt++) {
    const proc = Bun.spawnSync(
      ["bun", "run", "--cwd", "packages/database", "migrate:up"],
      { stdout: "inherit", stderr: "inherit" },
    );
    migrated = proc.exitCode === 0;
    if (!migrated) {
      log.warn({ attempt }, "migrate:up failed (db not ready?), retrying in 3s");
      Bun.sleepSync(3000);
    }
  }
  if (!migrated) {
    log.error("migrations failed after 10 attempts — exiting");
    process.exit(1);
  }
  log.info("migrations applied");
}

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
