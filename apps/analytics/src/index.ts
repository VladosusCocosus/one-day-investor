import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import config from "@config";
import { analyticsApi } from "./api/analytics";

const app = new Elysia()
  .use(cors({
    origin: config.get("frontendUrl"),
    credentials: true,
  }))
  .use(analyticsApi)
  .get("/", () => "Analytics service")
  .listen(3001);

console.log(
  `📊 Analytics is running at ${app.server?.hostname}:${app.server?.port}`
);
