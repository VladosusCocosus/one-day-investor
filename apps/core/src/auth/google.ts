import { Elysia } from "elysia";
import { Google } from "arctic";
import config from "@config";
import {
  findOAuthAccount,
  createOAuthAccount,
  findUserByEmail,
  createUser,
  createSession,
} from "@database";

console.error(config.get("google.clientId"))

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

    return redirect(url.toString());
  })
  .get("/google/callback", async ({ query, cookie, redirect, set }) => {
    const { code, state } = query;
    const storedState = cookie.oauth_state.value;
    const codeVerifier = cookie.code_verifier.value as string;

    if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
      set.status = 400;
      return { error: "Invalid OAuth callback" };
    }

    // Clear OAuth cookies
    cookie.oauth_state.remove();
    cookie.code_verifier.remove();

    // Exchange code for tokens
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    // Fetch Google user info
    const googleUserRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const googleUser = (await googleUserRes.json()) as {
      sub: string;
      email: string;
      name: string;
      picture: string;
    };

    // Find or create user
    let oauthAccount = await findOAuthAccount("google", googleUser.sub);
    let userId: string;

    if (oauthAccount) {
      userId = oauthAccount.user_id;
    } else {
      let user = await findUserByEmail(googleUser.email);
      if (!user) {
        user = await createUser({
          email: googleUser.email,
          name: googleUser.name,
          avatar_url: googleUser.picture,
        });
      }
      await createOAuthAccount({
        user_id: user.id,
        provider: "google",
        provider_user_id: googleUser.sub,
      });
      userId = user.id;
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

    return redirect(config.get("frontendUrl"));
  });
