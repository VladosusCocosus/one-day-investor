import { createLogger } from "@logger";
import { sendEmail } from "@mailgun";
import { renderReminderEmail } from "../template/reminder";
import type { ReminderData } from "@database";

const log = createLogger("reminder-example");

const TO = process.argv[2];
if (!TO) {
  log.error("Usage: bun run send-example <recipient@example.com>");
  process.exit(1);
}

const sample: ReminderData = {
  user_id: "example-user",
  email: TO,
  name: TO,
  firstName: "there",
  currentMonthLabel: "April",
  lastMonthLabel: "March 2026",
  lastCreatedAtLabel: "Mar 1",
  lastTotal: 21240,
  goal: 50000,
  symbol: "\u20ac",
  ctaHref: "https://odinvestor.net/snapshots",
};

async function main(): Promise<number> {
  const html = renderReminderEmail(sample);
  const subject = `[EXAMPLE] Your ${sample.currentMonthLabel} snapshot is due`;
  try {
    await sendEmail({ to: TO, subject, html });
    log.info({ to: TO }, "example reminder sent");
    return 0;
  } catch (err) {
    log.error({ err, to: TO }, "example send failed");
    return 1;
  }
}

main().then((code) => process.exit(code));
