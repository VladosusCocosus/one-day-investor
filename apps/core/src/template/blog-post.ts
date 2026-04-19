function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderBlogPostEmail(data: {
  title: string;
  excerpt: string;
  sections?: { heading: string; snippet: string }[];
  postUrl: string;
  unsubscribeUrl: string;
}): string {
  const sectionsHtml = (data.sections ?? [])
    .map(
      (s) => `
      <tr><td style="padding:0 32px 24px;">
        <h2 style="margin:0 0 6px;font-size:16px;font-weight:700;color:#059669;line-height:1.3;">
          ${escapeHtml(s.heading)}
        </h2>
        <p style="margin:0;font-size:14px;line-height:1.65;color:#475569;">
          ${escapeHtml(s.snippet)}
        </p>
      </td></tr>`
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:20px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"
           style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
      <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 55%,#34d399 100%);padding:32px;color:#ffffff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);">
          &#x25cf; One Day Investor &middot; Blog
        </div>
        <h1 style="margin:18px 0 6px;font-size:26px;font-weight:800;line-height:1.15;letter-spacing:-0.015em;">
          ${escapeHtml(data.title)}
        </h1>
      </td></tr>

      <tr><td style="padding:32px 32px 16px;">
        <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
          ${escapeHtml(data.excerpt)}
        </p>
      </td></tr>

      ${sectionsHtml ? `<tr><td style="padding:0 32px 8px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>${sectionsHtml}` : ""}

      <tr><td style="padding:16px 32px 32px;">
        <a href="${escapeHtml(data.postUrl)}"
           style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#ffffff;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 6px 16px rgba(16,185,129,0.3);">
          Read the full post &rarr;
        </a>
      </td></tr>

      <tr><td style="padding:16px 32px 22px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;line-height:1.5;">
        You're receiving this because you opted in to blog post notifications.<br>
        <a href="${escapeHtml(data.unsubscribeUrl)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a><br>
        <strong style="color:#475569;">One Day Investor</strong> &middot; odinvestor.net
      </td></tr>
    </table>
  </body>
</html>`;
}
