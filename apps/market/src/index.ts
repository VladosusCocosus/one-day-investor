import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import config from "@config";
import { api } from "./api";

const app = new Elysia()
  .use(cors({
    origin: config.get("frontendUrl"),
    credentials: true,
  }))
  .use(api)
  .get("/", () => "Market service")
  .listen(3002);

console.log(
  `📈 Market is running at ${app.server?.hostname}:${app.server?.port}`
);
