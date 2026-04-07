import { Elysia } from "elysia";
import { deleteSessionByToken } from "@database";
import { resolveUser } from "./session";

export const logoutRoute = new Elysia({ prefix: "/auth" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, {value: string}>);
    return { user };
  })
  .post("/logout", async ({ cookie, user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const token = cookie.session?.value;
    if (token) {
      await deleteSessionByToken(token as string);
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
