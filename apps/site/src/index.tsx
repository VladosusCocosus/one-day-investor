import Html from "@kitajs/html";
import { Elysia } from "elysia";
import { html } from "@elysiajs/html";
import { createLogger } from "@logger";
import { findSessionByToken, findUserById } from "@database";
import type { User } from "@types";
import { resolveLocale, isLocale, type Locale } from "./i18n";
import { LandingPage } from "./pages/landing";
import { PhilosophyPage } from "./pages/philosophy";

const log = createLogger("site");
const PORT = 3005;

const SITE_URL = process.env.SITE_URL || "https://odinvestor.net";
const BLOG_URL = process.env.BLOG_URL || "https://blog.odinvestor.net";

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

  .listen(PORT);

log.info({ port: PORT }, "Site service started");
