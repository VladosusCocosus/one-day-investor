import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import config from "@config";
import { createLogger } from "@logger";
import { api } from "./api";

const log = createLogger("market-app");

const app = new Elysia()
  .use(cors({
    origin: config.get("frontendUrl"),
    credentials: true,
  }))
  .onError(({ error, code, path }) => {
    log.error({ err: error, code, path }, "Unhandled request error");
    return { error: "Internal server error" };
  })
  .use(api)
  .get("/", () => "Market service")
  .listen(3002);

log.info({ port: 3002 }, "Market service started");
