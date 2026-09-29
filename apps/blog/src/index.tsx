import Html from "@kitajs/html";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { html } from "@elysiajs/html";
import { createLogger } from "@logger";
import { findSessionByToken, findUserById } from "@database";
import type { User } from "@types";
import {
  initBlogSchema,
  migrateBlogPostsFromJson,
  listLatestPosts,
  listPublishedPosts,
  listAllPosts,
  getPostBySlug,
  getPostById,
  getAllTags,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  setOgImage,
  getLikeInfo,
  addLike,
  removeLike,
  getPostTranslation,
  upsertPostTranslation,
  listPostTranslations,
  deletePostTranslation,
  applyTranslation,
} from "./db";
import type { Block } from "./db";
import { ListPage } from "./pages/list";
import { PostPage, NotFoundPage } from "./pages/post";
import { resolveLocale, isLocale, localePath, type Locale } from "./i18n";

const log = createLogger("blog");
const PORT = 3003;
const OG_SERVICE_URL = process.env.OG_SERVICE_URL || "http://localhost:3004";

await initBlogSchema();
await migrateBlogPostsFromJson(
  new URL("../content/posts", import.meta.url).pathname
);

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

const SITE_URL = process.env.BLOG_URL || "https://blog.odinvestor.net";

const FRONTEND_URL = process.env.FRONTEND_URL || "https://odinvestor.net";
const ADMIN_EMAIL = process.env.BLOG_ADMIN_EMAIL ?? "";

/** True when ADMIN_EMAIL is configured and matches the session user. */
function isAdmin(user: User | null): boolean {
  return user !== null && ADMIN_EMAIL !== "" && user.email === ADMIN_EMAIL;
}

const cssPath = new URL("./styles/output.css", import.meta.url).pathname;
const cssFile = Bun.file(cssPath);

/** Set Cloudflare-aware cache headers on a response */
function setCacheHeaders(
  set: { headers: Record<string, string> },
  user: User | null,
  opts: { edgeTtl?: number; browserTtl?: number; tag?: string } = {}
) {
  const { edgeTtl = 3600, browserTtl = 60, tag } = opts;
  if (user) {
    // Logged-in: personalized nav, bypass CDN
    set.headers["cache-control"] = "private, no-cache";
  } else {
    // Anonymous: cache at edge, short browser cache
    set.headers["cache-control"] = `public, max-age=${browserTtl}, s-maxage=${edgeTtl}`;
    set.headers["cdn-cache-control"] = `public, max-age=${edgeTtl}`;
  }
  set.headers["vary"] = "Accept-Language, Cookie";
  if (tag) set.headers["cache-tag"] = tag;
}

async function handleLocalizedList(
  locale: Locale,
  tag: string | undefined,
  cookie: Record<string, any>,
  set: { headers: Record<string, string> }
) {
  const [posts, allTags, user] = await Promise.all([
    listPublishedPosts(tag),
    getAllTags(),
    resolveUser(cookie),
  ]);

  setCacheHeaders(set, user as User | null, { edgeTtl: 3600, browserTtl: 60, tag: "blog-list" });

  const translatedPosts = await Promise.all(
    posts.map(async (post) => {
      if (locale === "en") return post;
      const tr = await getPostTranslation(post.id, locale);
      return tr ? applyTranslation(post, tr) : post;
    })
  );

  return <ListPage posts={translatedPosts} allTags={allTags} activeTag={tag} user={user} locale={locale} />;
}

async function handleLocalizedPost(
  locale: Locale,
  slug: string,
  cookie: Record<string, any>,
  set: { headers: Record<string, string>; status?: number }
) {
  const [post, user] = await Promise.all([
    getPostBySlug(slug),
    resolveUser(cookie),
  ]);
  if (!post || !post.publish_date) {
    set.headers["cache-control"] = "public, max-age=60, s-maxage=300";
    return <NotFoundPage user={user} locale={locale} />;
  }

  setCacheHeaders(set, user as User | null, { edgeTtl: 86400, browserTtl: 120, tag: `post-${post.slug}` });

  let displayPost = post;
  if (locale !== "en") {
    const tr = await getPostTranslation(post.id, locale);
    if (tr) displayPost = applyTranslation(post, tr);
  }

  return <PostPage post={displayPost} user={user} locale={locale} />;
}

const app = new Elysia()
  .use(html())
  .use(cors({ origin: FRONTEND_URL, methods: ["GET", "POST", "PUT", "DELETE"], credentials: true }))

  .get("/styles.css", async () => {
    return new Response(cssFile, {
      headers: {
        "Content-Type": "text/css",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  })

  .get("/api/latest", async ({ set }) => {
    set.headers["cache-control"] = "public, max-age=60, s-maxage=3600";
    set.headers["cdn-cache-control"] = "public, max-age=3600";
    set.headers["cache-tag"] = "blog-list";
    const posts = await listLatestPosts(3);
    return posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      tags: p.tags,
      publish_date: p.publish_date,
      og_image: p.og_image,
    }));
  })

  .get("/api/posts/:slug/likes", async ({ params, cookie }) => {
    const post = await getPostBySlug(params.slug);
    if (!post) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    const user = await resolveUser(cookie);
    const info = await getLikeInfo(post.id, user?.id);
    return info;
  })

  .post("/api/posts/:slug/like", async ({ params, cookie }) => {
    const user = await resolveUser(cookie);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    const post = await getPostBySlug(params.slug);
    if (!post) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    await addLike(post.id, user.id);
    const info = await getLikeInfo(post.id, user.id);
    return info;
  })

  .delete("/api/posts/:slug/like", async ({ params, cookie }) => {
    const user = await resolveUser(cookie);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    const post = await getPostBySlug(params.slug);
    if (!post) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    await removeLike(post.id, user.id);
    const info = await getLikeInfo(post.id, user.id);
    return info;
  })

  .get("/robots.txt", () => {
    return new Response(
      `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml`,
      { headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
    );
  })

  .get("/sitemap.xml", async () => {
    const posts = await listPublishedPosts();
    const locales: Locale[] = ["en", "ru", "es"];

    function hreflangs(path: string) {
      return locales
        .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL}${localePath(path, l)}" />`)
        .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${path}" />`)
        .join("\n");
    }

    const urls: string[] = [];
    // Homepage in all languages
    for (const l of locales) {
      urls.push(`  <url>\n    <loc>${SITE_URL}${localePath("/", l)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n${hreflangs("/")}\n  </url>`);
    }
    // Posts in all languages
    for (const p of posts) {
      const path = `/${p.slug}`;
      const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().split("T")[0] : p.publish_date;
      for (const l of locales) {
        urls.push(`  <url>\n    <loc>${SITE_URL}${localePath(path, l)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n${hreflangs(path)}\n  </url>`);
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>`;
    return new Response(xml, {
      headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    });
  })

  // Blog public routes
  .get("/", async ({ query, cookie, headers, set }) => {
    const tag = query.tag as string | undefined;
    const [posts, allTags, user] = await Promise.all([
      listPublishedPosts(tag),
      getAllTags(),
      resolveUser(cookie),
    ]);
    const locale = await resolveLocale(
      cookie.session?.value,
      cookie.lang?.value,
      headers["accept-language"]
    );

    setCacheHeaders(set, user, { edgeTtl: 3600, browserTtl: 60, tag: "blog-list" });

    // Apply translations to post list items
    const translatedPosts = await Promise.all(
      posts.map(async (post) => {
        if (locale === "en") return post;
        const tr = await getPostTranslation(post.id, locale);
        return tr ? applyTranslation(post, tr) : post;
      })
    );

    return <ListPage posts={translatedPosts} allTags={allTags} activeTag={tag} user={user} locale={locale} />;
  })

  // Locale-prefixed blog list: /ru, /es
  .get("/ru", async ({ query, cookie, set }) => {
    return handleLocalizedList("ru", query.tag as string | undefined, cookie, set);
  })
  .get("/es", async ({ query, cookie, set }) => {
    return handleLocalizedList("es", query.tag as string | undefined, cookie, set);
  })

  // Locale-prefixed post detail: /ru/:slug, /es/:slug
  .get("/ru/:slug", async ({ params, cookie, set }) => {
    return handleLocalizedPost("ru", params.slug, cookie, set);
  })
  .get("/es/:slug", async ({ params, cookie, set }) => {
    return handleLocalizedPost("es", params.slug, cookie, set);
  })

  // Admin JSON API
  .get("/api/admin/posts", async ({ cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!isAdmin(user)) { set.status = 403; return { error: "Forbidden" }; }
    return listAllPosts();
  })
  .get("/api/admin/posts/:id", async ({ params, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!isAdmin(user)) { set.status = 403; return { error: "Forbidden" }; }
    const post = await getPostById(Number(params.id));
    if (!post) { set.status = 404; return { error: "Not found" }; }
    return post;
  })
  .post("/api/admin/posts", async ({ body, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!isAdmin(user)) { set.status = 403; return { error: "Forbidden" }; }
    const { title, slug, excerpt, tags, content, publish_date } = body as {
      title: string; slug: string; excerpt?: string; tags?: string[];
      content: Block[]; publish_date?: string | null;
    };
    return createBlogPost({ title, slug, excerpt, tags, content, publish_date });
  })
  .put("/api/admin/posts/:id", async ({ params, body, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!isAdmin(user)) { set.status = 403; return { error: "Forbidden" }; }
    const { title, slug, excerpt, tags, content, publish_date } = body as {
      title?: string; slug?: string; excerpt?: string; tags?: string[];
      content?: Block[]; publish_date?: string | null;
    };
    const updated = await updateBlogPost(Number(params.id), {
      title, slug, excerpt, tags, content, publish_date,
    });
    if (!updated) { set.status = 404; return { error: "Not found" }; }
    return updated;
  })
  .delete("/api/admin/posts/:id", async ({ params, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!isAdmin(user)) { set.status = 403; return { error: "Forbidden" }; }
    await deleteBlogPost(Number(params.id));
    return { ok: true };
  })
  .post("/api/admin/posts/:id/og", async ({ params, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!isAdmin(user)) { set.status = 403; return { error: "Forbidden" }; }
    const post = await getPostById(Number(params.id));
    if (!post) { set.status = 404; return { error: "Not found" }; }
    const res = await fetch(`${OG_SERVICE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: post.slug, title: post.title, tags: post.tags }),
    });
    if (!res.ok) { set.status = 502; return { error: "OG service failed" }; }
    const { key } = await res.json() as { key: string };
    await setOgImage(post.id, key);
    return { key };
  })

  // Admin translation API
  .get("/api/admin/posts/:id/translations", async ({ params, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!isAdmin(user)) { set.status = 403; return { error: "Forbidden" }; }
    return listPostTranslations(Number(params.id));
  })
  .put("/api/admin/posts/:id/translations/:lang", async ({ params, body, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!isAdmin(user)) { set.status = 403; return { error: "Forbidden" }; }
    const { title, excerpt, content } = body as {
      title: string; excerpt: string; content: Block[];
    };
    return upsertPostTranslation(Number(params.id), params.lang, { title, excerpt, content });
  })
  .delete("/api/admin/posts/:id/translations/:lang", async ({ params, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!isAdmin(user)) { set.status = 403; return { error: "Forbidden" }; }
    await deletePostTranslation(Number(params.id), params.lang);
    return { ok: true };
  })

  // Post detail (must be last — catch-all slug route)
  .get("/:slug", async ({ params, cookie, headers, set }) => {
    const [post, user] = await Promise.all([
      getPostBySlug(params.slug),
      resolveUser(cookie),
    ]);
    if (!post || !post.publish_date) {
      const locale = await resolveLocale(
        cookie.session?.value,
        cookie.lang?.value,
        headers["accept-language"]
      );
      set.headers["cache-control"] = "public, max-age=60, s-maxage=300";
      return <NotFoundPage user={user} locale={locale} />;
    }

    const locale = await resolveLocale(
      cookie.session?.value,
      cookie.lang?.value,
      headers["accept-language"]
    );

    setCacheHeaders(set, user, { edgeTtl: 86400, browserTtl: 120, tag: `post-${post.slug}` });

    // Apply translation if available
    let displayPost = post;
    if (locale !== "en") {
      const tr = await getPostTranslation(post.id, locale);
      if (tr) displayPost = applyTranslation(post, tr);
    }

    return <PostPage post={displayPost} user={user} locale={locale} />;
  })

  .listen(PORT);

log.info({ port: PORT }, "Blog service started");
