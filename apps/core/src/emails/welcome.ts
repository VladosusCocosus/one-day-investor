import config from "@config";
import { createLogger } from "@logger";
import { sendEmail } from "@mailgun";

const log = createLogger("welcome-email");

export interface WelcomeData {
  email: string;
  name: string | null;
  firstName: string;
  appHref: string;
  settingsHref: string;
}

function firstNameOf(name: string | null): string {
  if (!name) return "there";
  const trimmed = name.trim().split(/\s+/)[0];
  return trimmed.length > 0 ? trimmed : "there";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderWelcomeEmail(data: WelcomeData): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:20px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"
           style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
      <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 55%,#34d399 100%);padding:32px;color:#ffffff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);">
          &#x25cf; One Day Investor
        </div>
        <h1 style="margin:18px 0 6px;font-size:26px;font-weight:800;line-height:1.15;letter-spacing:-0.015em;">
          Welcome, ${escapeHtml(data.firstName)}
        </h1>
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.88);line-height:1.5;max-width:440px;">
          Glad to have you on board. One Day Investor helps you keep an honest monthly log of your portfolio — two minutes a month, a real timeline over the years.
        </p>
      </td></tr>

      <tr><td style="padding:28px 32px 4px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#64748b;">How to use the app</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
          <tr>
            <td style="width:28px;vertical-align:top;padding-top:2px;">
              <div style="width:22px;height:22px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:11px;font-weight:800;text-align:center;line-height:22px;">1</div>
            </td>
            <td style="vertical-align:top;padding-bottom:12px;">
              <div style="font-size:14px;font-weight:700;color:#0f172a;">Set your goal and snapshot day</div>
              <div style="margin-top:2px;font-size:13px;color:#475569;line-height:1.5;">
                Pick a currency, a long-term goal, and the day of the month you want to take each snapshot on.
              </div>
            </td>
          </tr>
          <tr>
            <td style="width:28px;vertical-align:top;padding-top:2px;">
              <div style="width:22px;height:22px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:11px;font-weight:800;text-align:center;line-height:22px;">2</div>
            </td>
            <td style="vertical-align:top;padding-bottom:12px;">
              <div style="font-size:14px;font-weight:700;color:#0f172a;">Add your services and assets</div>
              <div style="margin-top:2px;font-size:13px;color:#475569;line-height:1.5;">
                List the brokers, banks, and wallets you hold money in, and attach the individual assets you want to track.
              </div>
            </td>
          </tr>
          <tr>
            <td style="width:28px;vertical-align:top;padding-top:2px;">
              <div style="width:22px;height:22px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:11px;font-weight:800;text-align:center;line-height:22px;">3</div>
            </td>
            <td style="vertical-align:top;padding-bottom:4px;">
              <div style="font-size:14px;font-weight:700;color:#0f172a;">Record your first snapshot</div>
              <div style="margin-top:2px;font-size:13px;color:#475569;line-height:1.5;">
                Once a month, fill in the current value of each service. Analytics and progress toward your goal build up automatically from there.
              </div>
            </td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="padding:20px 32px 0;">
        <div style="padding:16px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#64748b;">Email notifications</div>
          <div style="margin-top:6px;font-size:14px;font-weight:700;color:#0f172a;">Monthly snapshot reminder</div>
          <p style="margin:6px 0 0;font-size:13px;color:#475569;line-height:1.5;">
            We can email you a gentle nudge on your chosen snapshot day each month so you never miss an entry. Head to your profile to turn reminders on, pick the day of the month, and change the currency or goal any time.
          </p>
          <div style="margin-top:12px;">
            <a href="${escapeHtml(data.settingsHref)}"
               style="display:inline-block;background:#ffffff;color:#047857;border:1px solid #a7f3d0;padding:9px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">
              Set up email notifications &rarr;
            </a>
          </div>
        </div>
      </td></tr>

      <tr><td style="padding:24px 32px 32px;">
        <a href="${escapeHtml(data.appHref)}"
           style="display:block;background:linear-gradient(135deg,#059669,#10b981);color:#ffffff;text-align:center;padding:14px 20px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 6px 16px rgba(16,185,129,0.3);">
          Open One Day Investor &rarr;
        </a>
      </td></tr>

      <tr><td style="padding:16px 32px 22px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;line-height:1.5;">
        You're getting this because you just signed up.<br>
        <strong style="color:#475569;">One Day Investor</strong> &middot; odinvestor.net
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendWelcomeEmail(user: {
  email: string;
  name: string | null;
}): Promise<void> {
  const frontendUrl = config.get("frontendUrl");
  const data: WelcomeData = {
    email: user.email,
    name: user.name,
    firstName: firstNameOf(user.name),
    appHref: `${frontendUrl}/dashboard`,
    settingsHref: `${frontendUrl}/profile`,
  };

  const html = renderWelcomeEmail(data);
  const subject = `Welcome to One Day Investor, ${data.firstName}`;
  const to = user.name ? `${user.name} <${user.email}>` : user.email;

  try {
    await sendEmail({ to, subject, html });
    log.info({ email: user.email }, "welcome email sent");
  } catch (err) {
    log.error({ err, email: user.email }, "welcome email failed");
  }
}
