import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import config from "@config";
import { auth } from "./auth";

const app = new Elysia()
  .use(cors({
    origin: config.get("frontendUrl"),
    credentials: true,
  }))
  .use(auth)
  .get("/", () => "Hello Elysia")
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
