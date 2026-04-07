import { Elysia } from "elysia";
import { googleAuth } from "./google";
import { logoutRoute } from "./logout";

export const auth = new Elysia({ name: "auth" })
  .use(googleAuth)
  .use(logoutRoute);
