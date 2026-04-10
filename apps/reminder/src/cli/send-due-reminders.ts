import { createLogger } from "@logger";
import { pool } from "@database";
import { findDueUsers } from "../query/find-due-users";
import { sendReminderEmail } from "../mailer/mailgun";
import { renderReminderEmail } from "../template/reminder";

const log = createLogger("reminder-cli");

async function main(): Promise<number> {
  const startedAt = Date.now();

  let due;
  try {
    due = await findDueUsers();
  } catch (err) {
    log.error({ err }, "failed to query due users");
    return 2;
  }

  log.info({ count: due.length }, "due users found");

  let sent = 0;
  let failed = 0;

  for (const user of due) {
    try {
      const html = renderReminderEmail(user);
      const subject = `Your ${user.currentMonthLabel} snapshot is due, ${user.firstName}`;
      await sendReminderEmail({
        to: `${user.name} <${user.email}>`,
        subject,
        html,
      });
      await pool.query(
        "UPDATE reminder_state SET last_reminder_sent_at = now() WHERE user_id = $1",
        [user.user_id]
      );
      sent++;
      log.info({ user_id: user.user_id, email: user.email }, "reminder sent");
    } catch (err) {
      failed++;
      log.error({ err, user_id: user.user_id }, "send failed");
    }
  }

  log.info(
    { sent, failed, durationMs: Date.now() - startedAt },
    "reminder run complete"
  );
  return failed > 0 ? 1 : 0;
}

main()
  .then(async (code) => {
    await pool.end();
    process.exit(code);
  })
  .catch(async (err) => {
    log.fatal({ err }, "reminder run crashed");
    try {
      await pool.end();
    } catch {
      /* ignore cleanup errors on fatal path */
    }
    process.exit(2);
  });
