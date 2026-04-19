import { Elysia } from "elysia";
import { Google } from "arctic";
import config from "@config";
import { createLogger } from "@logger";
import {
  findOAuthAccount,
  createOAuthAccount,
  findUserByEmail,
  createUser,
  createSession,
  createSettings,
  getSettings,
} from "@database";
import { sendWelcomeEmail } from "../emails/welcome";
import { parseAcceptLanguage } from "./language";

const log = createLogger("auth");

const google = new Google(
  config.get("google.clientId"),
  config.get("google.clientSecret"),
  config.get("google.redirectUri")
);

export const googleAuth = new Elysia({ prefix: "/auth" })
  .get("/google", async ({ cookie, redirect }) => {
    const state = crypto.randomUUID();
    const codeVerifier = crypto.randomUUID();
    const scopes = ["openid", "email", "profile"];
    const url = google.createAuthorizationURL(state, codeVerifier, scopes);

    cookie.oauth_state.set({
      value: state,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    cookie.code_verifier.set({
      value: codeVerifier,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    log.info("OAuth flow initiated, redirecting to Google");
    return redirect(url.toString());
  })
  .get("/google/callback", async ({ query, cookie, redirect, set, request }) => {
    const { code, state } = query;
    const storedState = cookie.oauth_state.value;
    const codeVerifier = cookie.code_verifier.value as string;

    if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
      log.warn("Invalid OAuth callback: state mismatch or missing parameters");
      set.status = 400;
      return { error: "Invalid OAuth callback" };
    }

    // Clear OAuth cookies
    cookie.oauth_state.remove();
    cookie.code_verifier.remove();

    try {
      // Exchange code for tokens
      const tokens = await google.validateAuthorizationCode(code, codeVerifier);
      const accessToken = tokens.accessToken();

      // Fetch Google user info
      const googleUserRes = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!googleUserRes.ok) {
        log.error({ status: googleUserRes.status }, "Failed to fetch Google user info");
        set.status = 500;
        return { error: "Failed to fetch user info from Google" };
      }

      const googleUser = (await googleUserRes.json()) as {
        sub: string;
        email: string;
        name: string;
        picture: string;
      };

      log.info({ email: googleUser.email }, "Google user info fetched");

      // Find or create user
      let oauthAccount = await findOAuthAccount("google", googleUser.sub);
      let userId: string;

      if (oauthAccount) {
        userId = oauthAccount.user_id;
        log.info({ userId }, "Existing user logged in");
      } else {
        let user = await findUserByEmail(googleUser.email);
        let isNewUser = false;
        if (!user) {
          user = await createUser({
            email: googleUser.email,
            name: googleUser.name,
            avatar_url: googleUser.picture,
          });
          const language = parseAcceptLanguage(request.headers.get("accept-language"));
          await createSettings(user.id, { language });
          isNewUser = true;
          log.info({ userId: user.id, email: user.email, language }, "New user created");
        }
        await createOAuthAccount({
          user_id: user.id,
          provider: "google",
          provider_user_id: googleUser.sub,
        });
        userId = user.id;
        log.info({ userId }, "OAuth account linked");

        if (isNewUser) {
          // Fire-and-forget: welcome email must never block or fail sign-in.
          void sendWelcomeEmail({ email: user.email, name: user.name });
        }
      }

      // Create session
      const sessionMaxAge = config.get("session.maxAge");
      const expiresAt = new Date(Date.now() + sessionMaxAge * 1000);
      const token = crypto.randomUUID();
      await createSession({ user_id: userId, token, expires_at: expiresAt });

      const isProduction = process.env.NODE_ENV === "production";

      cookie.session.set({
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
        maxAge: sessionMaxAge,
        domain: isProduction ? ".odinvestor.net" : undefined,
      });

      // Mirror the user's language preference into a cookie so the frontend
      // can render in the right language before any API call is made.
      const settings = await getSettings(userId);
      cookie.lang.set({
        value: settings.language,
        httpOnly: false,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
        maxAge: sessionMaxAge,
        domain: isProduction ? ".odinvestor.net" : undefined,
      });

      log.info({ userId, language: settings.language }, "Session created, redirecting to frontend");
      return redirect(config.get("frontendUrl"));
    } catch (err) {
      log.error({ err }, "OAuth callback failed");
      set.status = 500;
      return { error: "Authentication failed" };
    }
  });
