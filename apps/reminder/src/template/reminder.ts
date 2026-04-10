import type { ReminderData } from "@database";

export type { ReminderData };

function formatAmount(n: number, symbol: string): string {
  return `${symbol}${Number(n).toLocaleString("en-US")}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderReminderEmail(data: ReminderData): string {
  const percent =
    data.goal > 0 ? Math.round((data.lastTotal / data.goal) * 100) : 0;
  const progressWidth = Math.min(100, percent);
  const lastTotalFmt = formatAmount(data.lastTotal, data.symbol);
  const goalFmt = formatAmount(data.goal, data.symbol);

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
          Time for your ${escapeHtml(data.currentMonthLabel)} snapshot, ${escapeHtml(data.firstName)}
        </h1>
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.88);line-height:1.5;max-width:420px;">
          It's been a month since you last recorded your portfolio. Take 2 minutes to update it and keep your timeline honest.
        </p>
      </td></tr>

      <tr><td style="padding:22px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:50%;padding-right:7px;vertical-align:top;">
            <div style="padding:14px;border:1px solid #e5e7eb;border-radius:10px;">
              <div style="font-size:9px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#64748b;">Last snapshot</div>
              <div style="margin-top:4px;font-size:18px;font-weight:800;color:#0f172a;">${escapeHtml(data.lastMonthLabel)}</div>
              <div style="margin-top:2px;font-size:11px;color:#64748b;">created ${escapeHtml(data.lastCreatedAtLabel)}</div>
            </div>
          </td>
          <td style="width:50%;padding-left:7px;vertical-align:top;">
            <div style="padding:14px;border:1px solid #e5e7eb;border-radius:10px;">
              <div style="font-size:9px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#64748b;">Last total</div>
              <div style="margin-top:4px;font-size:18px;font-weight:800;color:#0f172a;">${lastTotalFmt}</div>
              <div style="margin-top:2px;font-size:11px;color:#64748b;">${percent}% of goal</div>
            </div>
          </td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:20px 32px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Goal progress</td>
          <td style="font-size:10px;font-weight:800;color:#047857;text-align:right;">${lastTotalFmt} / ${goalFmt}</td>
        </tr></table>
        <div style="margin-top:8px;height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden;">
          <div style="height:8px;width:${progressWidth}%;background:linear-gradient(90deg,#059669,#10b981);border-radius:99px;"></div>
        </div>
      </td></tr>

      <tr><td style="padding:24px 32px 32px;">
        <a href="${escapeHtml(data.ctaHref)}"
           style="display:block;background:linear-gradient(135deg,#059669,#10b981);color:#ffffff;text-align:center;padding:14px 20px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 6px 16px rgba(16,185,129,0.3);">
          Record ${escapeHtml(data.currentMonthLabel)} snapshot &rarr;
        </a>
      </td></tr>

      <tr><td style="padding:16px 32px 22px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;line-height:1.5;">
        You're getting this because your monthly snapshot day has arrived.<br>
        <strong style="color:#475569;">One Day Investor</strong> &middot; odinvestor.net
      </td></tr>
    </table>
  </body>
</html>`;
}
