import Html from "@kitajs/html";
import { Elysia } from "elysia";
import { html } from "@elysiajs/html";
import { createLogger } from "@logger";
import { findSessionByToken, findUserById } from "@database";
import type { User } from "@types";
import { resolveLocale, isLocale, type Locale } from "./i18n";
import { LandingPage } from "./pages/landing";
import { PhilosophyPage } from "./pages/philosophy";
import { NotFoundPage } from "./pages/not-found";

const log = createLogger("site");
const PORT = 3005;

const SITE_URL = process.env.SITE_URL || "https://odinvestor.net";
const BLOG_URL = process.env.BLOG_URL || "https://blog.odinvestor.net";
const CORE_URL      = process.env.CORE_URL      || "https://core.odinvestor.net";
const MARKET_URL    = process.env.MARKET_URL    || "https://market.odinvestor.net";
const ANALYTICS_URL = process.env.ANALYTICS_URL || "https://analytics.odinvestor.net";
const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dashboard.odinvestor.net";

async function resolveUser(cookie: Record<string, any>): Promise<User | null> {
  const token = cookie.session?.value;
  if (!token) return null;
  try {
    const session = await findSessionByToken(token);
    if (!session) return null;
    return findUserById(session.user_id);
  } catch {
    return null;
  }
}

const cssPath = new URL("./styles/output.css", import.meta.url).pathname;
const cssFile = Bun.file(cssPath);

const app = new Elysia()
  .use(html())

  // Static CSS
  .get("/styles.css", async () => {
    return new Response(cssFile, {
      headers: {
        "Content-Type": "text/css",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  })

  // robots.txt
  .get("/robots.txt", () => {
    return new Response(
      `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml`,
      { headers: { "Content-Type": "text/plain" } }
    );
  })

  // agents.json — discovery manifest for AI agents
  .get("/agents.json", () => {
    const manifest = {
      name: "One Day Investor",
      description: "Personal investment tracker. Agents can manage pockets, assets, and monthly snapshots on behalf of a user.",
      instructions_for_agents: [
        "The authoritative route surface lives in each service's OpenAPI document — fetch services.<name>.openapi_url and use it for parameter names, body shapes, and response types.",
        "This manifest provides orientation only: the named services, auth flow, and a typical first-time setup (flow).",
        "All routes accept the bearer token from auth.format in an Authorization header. The same token works across all three services.",
        "capabilities.allowed_by_service lists the path prefixes each agent token may call; routes outside the allowlist return 403.",
      ],
      services: {
        core: {
          base_url: CORE_URL,
          openapi_url: `${CORE_URL}/api/swagger/json`,
          swagger_ui: `${CORE_URL}/api/swagger`,
        },
        market: {
          base_url: MARKET_URL,
          openapi_url: `${MARKET_URL}/api/swagger/json`,
          swagger_ui: `${MARKET_URL}/api/swagger`,
        },
        analytics: {
          base_url: ANALYTICS_URL,
          openapi_url: `${ANALYTICS_URL}/api/swagger/json`,
          swagger_ui: `${ANALYTICS_URL}/api/swagger`,
        },
      },
      auth: {
        type: "bearer",
        header: "Authorization",
        format: "Bearer <token>",
        obtain: `User generates a token at ${DASHBOARD_URL}/agents (max 30-day expiry).`,
        expiry_options: ["1h", "6h", "24h", "7d", "30d"],
        note: "The same token works across core, market, and analytics.",
      },
      capabilities: {
        allowed_by_service: {
          core:      ["/api/snapshots", "/api/services", "/api/assets", "/api/catalog"],
          market:    ["/api/asset-catalog", "/api/pocket-assets/{service_id}", "/api/market"],
          analytics: ["/api/analytics"],
        },
        denied: ["admin", "user-settings", "notifications", "exchange-credentials"],
      },
      flow: [
        { step: 1, service: "core",      action: "List pockets",            method: "GET",  path: "/api/services" },
        { step: 2, service: "core",      action: "Create pocket",           method: "POST", path: "/api/services" },
        { step: 3, service: "market",    action: "Search asset catalog",    method: "GET",  path: "/api/asset-catalog/search?q=VOO" },
        { step: 4, service: "market",    action: "Add asset to a pocket",   method: "POST", path: "/api/pocket-assets" },
        { step: 5, service: "core",      action: "Create monthly snapshot", method: "POST", path: "/api/snapshots" },
        { step: 6, service: "core",      action: "List snapshots",          method: "GET",  path: "/api/snapshots" },
        { step: 7, service: "analytics", action: "Read analytics",          method: "GET",  path: "/api/analytics/timeline" },
      ],
      errors: {
        "401": "Missing, invalid, or expired token.",
        "403": "Route not permitted for agent tokens (see capabilities.denied).",
        "404": "Route or resource not found.",
        "409": "Resource already exists (e.g. snapshot for that month).",
        "422": "Request validation failed (see response body for details).",
      },
    };
    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        "Content-Type":  "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  })

  // sitemap.xml with hreflang
  .get("/sitemap.xml", () => {
    const pages = ["/", "/philosophy"];
    const locales: Locale[] = ["en", "ru", "es"];

    const urls = pages.map((page) => {
      const links = locales
        .map((l) => {
          const href = l === "en" ? `${SITE_URL}${page}` : `${SITE_URL}/${l}${page === "/" ? "/" : page}`;
          return `    <xhtml:link rel="alternate" hreflang="${l}" href="${href}"/>`;
        })
        .join("\n");
      const defaultLink = `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${page}"/>`;

      return locales
        .map((l) => {
          const loc = l === "en" ? `${SITE_URL}${page}` : `${SITE_URL}/${l}${page === "/" ? "/" : page}`;
          return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${page === "/" ? "1.0" : "0.8"}</priority>\n${links}\n${defaultLink}\n  </url>`;
        })
        .join("\n");
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>`;
    return new Response(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  })

  // English landing — with language detection redirect
  .get("/", async ({ cookie, headers, set }) => {
    const user = await resolveUser(cookie);
    const locale = await resolveLocale(
      undefined,
      cookie.session?.value,
      cookie.lang?.value,
      headers["accept-language"]
    );

    if (locale !== "en") {
      set.status = 302;
      set.headers["location"] = `/${locale}/`;
      set.headers["set-cookie"] = `lang=${locale}; path=/; max-age=31536000; samesite=lax`;
      return;
    }

    set.headers["set-cookie"] = `lang=en; path=/; max-age=31536000; samesite=lax`;
    return LandingPage({ locale: "en", isLoggedIn: !!user });
  })

  // Russian landing
  .get("/ru/", async ({ cookie }) => {
    const user = await resolveUser(cookie);
    return LandingPage({ locale: "ru", isLoggedIn: !!user });
  })

  // Spanish landing
  .get("/es/", async ({ cookie }) => {
    const user = await resolveUser(cookie);
    return LandingPage({ locale: "es", isLoggedIn: !!user });
  })

  // English philosophy
  .get("/philosophy", async ({ cookie }) => {
    const user = await resolveUser(cookie);
    return PhilosophyPage({ locale: "en", isLoggedIn: !!user });
  })

  // Russian philosophy
  .get("/ru/philosophy", async ({ cookie }) => {
    const user = await resolveUser(cookie);
    return PhilosophyPage({ locale: "ru", isLoggedIn: !!user });
  })

  // Spanish philosophy
  .get("/es/philosophy", async ({ cookie }) => {
    const user = await resolveUser(cookie);
    return PhilosophyPage({ locale: "es", isLoggedIn: !!user });
  })

  // 404 catch-all
  .all("/*", async ({ cookie, path, set }) => {
    const match = path.match(/^\/(ru|es)\//);
    const locale: Locale = match ? (match[1] as Locale) : "en";
    set.status = 404;
    return NotFoundPage({ locale });
  })

  .listen(PORT);

log.info({ port: PORT }, "Site service started");
