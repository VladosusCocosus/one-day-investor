import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import config from "@config";
import { createLogger } from "@logger";
import { analyticsApi } from "./api/analytics";

const log = createLogger("analytics");

const app = new Elysia()
  .use(cors({
    origin: [config.get("frontendUrl"), config.get("siteUrl")],
    credentials: true,
  }))
  .onError(({ error, code, path }) => {
    log.error({ err: error, code, path }, "Unhandled request error");
    return { error: "Internal server error" };
  })
  .use(analyticsApi)
  .get("/", () => "Analytics service")
  .listen(3001);

log.info({ port: 3001 }, "Analytics service started");
