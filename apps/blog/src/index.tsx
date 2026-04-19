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
} from "./db";
import type { Block } from "./db";
import { ListPage } from "./pages/list";
import { PostPage, NotFoundPage } from "./pages/post";

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
const ADMIN_EMAIL = process.env.BLOG_ADMIN_EMAIL || "razin36986@gmail.com";

const cssPath = new URL("./styles/output.css", import.meta.url).pathname;
const cssFile = Bun.file(cssPath);

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

  .get("/api/latest", async () => {
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
      { headers: { "Content-Type": "text/plain" } }
    );
  })

  .get("/sitemap.xml", async () => {
    const posts = await listPublishedPosts();
    const urls = [
      `  <url>\n    <loc>${SITE_URL}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
      ...posts.map(
        (p) =>
          `  <url>\n    <loc>${SITE_URL}/${p.slug}</loc>\n    <lastmod>${p.updated_at?.split("T")[0] || p.publish_date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`
      ),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
    return new Response(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  })

  // Blog public routes
  .get("/", async ({ query, cookie }) => {
    const tag = query.tag as string | undefined;
    const [posts, allTags, user] = await Promise.all([
      listPublishedPosts(tag),
      getAllTags(),
      resolveUser(cookie),
    ]);
    return <ListPage posts={posts} allTags={allTags} activeTag={tag} user={user} />;
  })

  // Admin JSON API
  .get("/api/admin/posts", async ({ cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return { error: "Forbidden" }; }
    return listAllPosts();
  })
  .get("/api/admin/posts/:id", async ({ params, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return { error: "Forbidden" }; }
    const post = await getPostById(Number(params.id));
    if (!post) { set.status = 404; return { error: "Not found" }; }
    return post;
  })
  .post("/api/admin/posts", async ({ body, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return { error: "Forbidden" }; }
    const { title, slug, excerpt, tags, content, publish_date } = body as {
      title: string; slug: string; excerpt?: string; tags?: string[];
      content: Block[]; publish_date?: string | null;
    };
    return createBlogPost({ title, slug, excerpt, tags, content, publish_date });
  })
  .put("/api/admin/posts/:id", async ({ params, body, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return { error: "Forbidden" }; }
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
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return { error: "Forbidden" }; }
    await deleteBlogPost(Number(params.id));
    return { ok: true };
  })
  .post("/api/admin/posts/:id/og", async ({ params, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return { error: "Forbidden" }; }
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

  // Post detail (must be last — catch-all slug route)
  .get("/:slug", async ({ params, cookie }) => {
    const [post, user] = await Promise.all([
      getPostBySlug(params.slug),
      resolveUser(cookie),
    ]);
    if (!post || !post.publish_date) return <NotFoundPage user={user} />;
    return <PostPage post={post} user={user} />;
  })

  .listen(PORT);

log.info({ port: PORT }, "Blog service started");
