import { Elysia } from "elysia";
import { findSessionByToken, findUserById } from "@database";
import type { User } from "@types";

export const sessionMiddleware = new Elysia({ name: "session" }).derive(
  async ({ cookie }): Promise<{ user: User | null }> => {
    const token = cookie.session?.value;
    if (!token) {
      return { user: null };
    }

    const session = await findSessionByToken(token);
    if (!session) {
      return { user: null };
    }

    const user = await findUserById(session.user_id);
    return { user };
  }
);
