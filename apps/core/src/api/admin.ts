import { Elysia } from "elysia";
import { pool } from "@database";
import { sendEmail } from "@mailgun";
import { generateUnsubscribeToken } from "@notifications";
import { resolveUser } from "../auth/session";
import { renderServiceUpdateEmail } from "../template/service-update";
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
  });
