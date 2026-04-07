import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
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
  .onError(({ error, code, path }) => {
    log.error({ err: error, code, path }, "Unhandled request error");
    return { error: "Internal server error" };
  })
  .use(auth)
  .use(api)
  .get("/", () => "Hello Elysia")
  .listen(3000);

log.info({ port: 3000 }, "Core service started");
