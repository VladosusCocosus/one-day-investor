import Html from "@kitajs/html";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { html } from "@elysiajs/html";
import { createLogger } from "@logger";
import { findSessionByToken, findUserById } from "@database";
import type { User } from "@types";
import {
  initBlogSchema,
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
import { EditorListPage, EditorFormPage } from "./pages/editor";

const log = createLogger("blog");
const PORT = 3003;
const OG_SERVICE_URL = process.env.OG_SERVICE_URL || "http://localhost:3004";

await initBlogSchema();

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
  .use(cors({ origin: FRONTEND_URL, methods: ["GET"] }))

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
      `User-agent: *\nAllow: /\nDisallow: /editor\n\nSitemap: ${SITE_URL}/sitemap.xml`,
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

  // Editor routes (admin only)
  .get("/editor", async ({ cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return "Forbidden"; }
    const posts = await listAllPosts();
    return <EditorListPage posts={posts} />;
  })
  .get("/editor/new", async ({ cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return "Forbidden"; }
    return <EditorFormPage />;
  })
  .post("/editor/new", async ({ body, set, cookie }) => {
    const user = await resolveUser(cookie);
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return "Forbidden"; }
    const { title, slug, excerpt, tags, content, publish_date } = body as Record<string, string>;
    try {
      const parsedContent: Block[] = JSON.parse(content || "[]");
      const parsedTags = tags
        ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];
      await createBlogPost({
        title,
        slug,
        excerpt,
        tags: parsedTags,
        content: parsedContent,
        publish_date: publish_date || null,
      });
      set.redirect = `/editor`;
    } catch (e: any) {
      return <EditorFormPage error={e.message} />;
    }
  })
  .get("/editor/:id", async ({ params, cookie, set }) => {
    const user = await resolveUser(cookie);
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return "Forbidden"; }
    const post = await getPostById(Number(params.id));
    if (!post) return <EditorFormPage error="Post not found" />;
    return <EditorFormPage post={post} />;
  })
  .post("/editor/:id", async ({ params, body, set, cookie }) => {
    const user = await resolveUser(cookie);
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return "Forbidden"; }
    const id = Number(params.id);
    const { title, slug, excerpt, tags, content, publish_date } = body as Record<string, string>;
    try {
      const parsedContent: Block[] = JSON.parse(content || "[]");
      const parsedTags = tags
        ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];
      await updateBlogPost(id, {
        title,
        slug,
        excerpt,
        tags: parsedTags,
        content: parsedContent,
        publish_date: publish_date || null,
      });
      set.redirect = `/editor`;
    } catch (e: any) {
      const post = await getPostById(id);
      return <EditorFormPage post={post ?? undefined} error={e.message} />;
    }
  })
  .post("/editor/:id/og", async ({ params, set, cookie }) => {
    const user = await resolveUser(cookie);
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return "Forbidden"; }
    const post = await getPostById(Number(params.id));
    if (!post) { set.redirect = "/editor"; return; }

    const res = await fetch(`${OG_SERVICE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: post.slug, title: post.title, tags: post.tags }),
    });
    const { key, error } = (await res.json()) as { key?: string; error?: string };

    if (key) {
      await setOgImage(post.id, key);
      log.info({ key, postId: post.id }, "OG image set");
    } else {
      log.error({ error, postId: post.id }, "OG generation failed");
    }

    set.redirect = `/editor/${post.id}`;
  })
  .post("/editor/:id/delete", async ({ params, set, cookie }) => {
    const user = await resolveUser(cookie);
    if (!user || user.email !== ADMIN_EMAIL) { set.status = 403; return "Forbidden"; }
    await deleteBlogPost(Number(params.id));
    set.redirect = "/editor";
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
