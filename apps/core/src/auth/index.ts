import { Elysia } from "elysia";
import { googleAuth } from "./google";
import { logoutRoute } from "./logout";
import { sessionMiddleware } from "./session";

export const auth = new Elysia({ name: "auth" })
  .use(sessionMiddleware)
  .use(googleAuth)
  .use(logoutRoute);
