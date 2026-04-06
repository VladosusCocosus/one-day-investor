import { Elysia } from "elysia";
import { deleteSessionByToken } from "@database";
import { sessionMiddleware } from "./session";

export const logoutRoute = new Elysia({ prefix: "/auth" })
  .use(sessionMiddleware)
  .post("/logout", async ({ cookie, user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const token = cookie.session?.value;
    if (token) {
      await deleteSessionByToken(token);
      cookie.session.remove();
    }
    return { success: true };
  })
  .get("/me", ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
    };
  });
