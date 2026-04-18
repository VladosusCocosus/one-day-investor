import { Elysia } from "elysia";
import { pool } from "@database";
import {
  listAllPosts,
  getPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  initBlogSchema,
} from "@database";
import type { Block } from "@database";
import { sendEmail } from "@mailgun";
import { generateUnsubscribeToken } from "@notifications";
import { resolveUser } from "../auth/session";
import { renderServiceUpdateEmail } from "../template/service-update";
import config from "@config";

initBlogSchema().catch(() => {});

function isAdmin(email: string): boolean {
  const adminEmail = config.get("admin.email");
  return adminEmail !== "" && email === adminEmail;
}

export const adminApi = new Elysia({ prefix: "/api/admin" })
  .derive(async ({ cookie }) => {
    const user = await resolveUser(cookie as Record<string, { value: string }>);
    return { user };
  })
  .onBeforeHandle(({ user, set }) => {
    if (!user || !isAdmin(user.email)) {
      set.status = 403;
      return { error: "Forbidden" };
    }
  })
  .get("/check", () => ({ admin: true }))
  .post("/upload-image", async ({ body, set }) => {
    const formBody = body as Record<string, unknown>;
    const file = formBody.file;
    if (!file || !(file instanceof File)) {
      set.status = 400;
      return { error: "No file provided" };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const key = `emails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { upload, getPublicUrl } = await import("@storage");
    await upload(key, buffer, file.type);
    return { url: getPublicUrl(key) };
  })
  .post("/service-update/preview", async ({ body }) => {
    const { subject, markdown } = body as { subject: string; markdown: string };
    const html = renderServiceUpdateEmail({ subject, markdown, unsubscribeUrl: "#" });
    return { html };
  })
  .post("/service-update/send", async ({ body, set }) => {
    const { subject, markdown } = body as { subject: string; markdown: string };

    const { rows } = await pool.query<{ user_id: string; email: string; name: string | null }>(
      `SELECT us.user_id, u.email, u.name
       FROM user_settings us
       JOIN users u ON u.id = us.user_id
       WHERE us.notify_service_updates = TRUE`
    );

    let sent = 0;
    let failed = 0;
    const frontendUrl = config.get("frontendUrl");

    for (const row of rows) {
      try {
        const token = generateUnsubscribeToken(row.user_id);
        const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${token}`;
        const html = renderServiceUpdateEmail({ subject, markdown, unsubscribeUrl });
        const toHeader = row.name ? `${row.name} <${row.email}>` : row.email;
        await sendEmail({
          to: toHeader,
          subject,
          html,
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
        });
        sent++;
      } catch {
        failed++;
      }
    }

    return { sent, failed, total: rows.length };
  })
  // Blog CRUD
  .get("/blog/posts", async () => {
    const posts = await listAllPosts();
    return posts;
  })
  .get("/blog/posts/:id", async ({ params, set }) => {
    const post = await getPostById(Number(params.id));
    if (!post) {
      set.status = 404;
      return { error: "Not found" };
    }
    return post;
  })
  .post("/blog/posts", async ({ body }) => {
    const { title, slug, excerpt, tags, content, publish_date } = body as {
      title: string;
      slug: string;
      excerpt?: string;
      tags?: string[];
      content: Block[];
      publish_date?: string | null;
    };
    return createBlogPost({ title, slug, excerpt, tags, content, publish_date });
  })
  .put("/blog/posts/:id", async ({ params, body, set }) => {
    const { title, slug, excerpt, tags, content, publish_date } = body as {
      title?: string;
      slug?: string;
      excerpt?: string;
      tags?: string[];
      content?: Block[];
      publish_date?: string | null;
    };
    const updated = await updateBlogPost(Number(params.id), {
      title, slug, excerpt, tags, content, publish_date,
    });
    if (!updated) {
      set.status = 404;
      return { error: "Not found" };
    }
    return updated;
  })
  .delete("/blog/posts/:id", async ({ params }) => {
    await deleteBlogPost(Number(params.id));
    return { ok: true };
  });
