import { Elysia } from "elysia";
import { pool } from "@database";
import { sendEmail } from "@mailgun";
import { generateUnsubscribeToken } from "@notifications";
import { resolveUser } from "../auth/session";
import { renderServiceUpdateEmail } from "../template/service-update";
import { renderBlogPostEmail } from "../template/blog-post";
import config from "@config";

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

    const { upload } = await import("@storage");
    await upload(key, buffer, file.type);
    const publicBase = config.get("s3.publicUrl");
    const bucket = config.get("s3.bucket");
    const url = publicBase
      ? `${publicBase}/${bucket}/${key}`
      : `${config.get("s3.endpoint")}/${bucket}/${key}`;
    return { url };
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
  .post("/blog-post/preview", async ({ body }) => {
    const { title, excerpt, slug } = body as { title: string; excerpt: string; slug: string };
    const blogUrl = process.env.VITE_BLOG_URL || process.env.BLOG_URL || "https://blog.odinvestor.net";
    const html = renderBlogPostEmail({
      title,
      excerpt,
      postUrl: `${blogUrl}/${slug}`,
      unsubscribeUrl: "#",
    });
    return { html };
  })
  .post("/blog-post/send", async ({ body }) => {
    const { title, excerpt, slug } = body as { title: string; excerpt: string; slug: string };
    const blogUrl = process.env.VITE_BLOG_URL || process.env.BLOG_URL || "https://blog.odinvestor.net";

    const { rows } = await pool.query<{ user_id: string; email: string; name: string | null }>(
      `SELECT us.user_id, u.email, u.name
       FROM user_settings us
       JOIN users u ON u.id = us.user_id
       WHERE us.notify_blog_posts = TRUE`
    );

    let sent = 0;
    let failed = 0;
    const frontendUrl = config.get("frontendUrl");

    for (const row of rows) {
      try {
        const token = generateUnsubscribeToken(row.user_id);
        const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${token}`;
        const html = renderBlogPostEmail({
          title,
          excerpt,
          postUrl: `${blogUrl}/${slug}`,
          unsubscribeUrl,
        });
        const toHeader = row.name ? `${row.name} <${row.email}>` : row.email;
        await sendEmail({
          to: toHeader,
          subject: `New post: ${title}`,
          html,
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
        });
        sent++;
      } catch {
        failed++;
      }
    }

    return { sent, failed, total: rows.length };
  });
