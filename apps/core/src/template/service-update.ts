import { Renderer, marked } from "marked";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createEmailRenderer(): Renderer {
  const renderer = new Renderer();

  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const sizes: Record<number, string> = {
      1: "font-size:22px;font-weight:800;",
      2: "font-size:18px;font-weight:700;",
      3: "font-size:16px;font-weight:600;",
    };
    const style = sizes[depth] || sizes[3];
    return `<h${depth} style="${style}color:#0f172a;margin:24px 0 12px;line-height:1.3;">${text}</h${depth}>`;
  };

  renderer.paragraph = function ({ tokens }) {
    const text = this.parser.parseInline(tokens);
    return `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">${text}</p>`;
  };

  renderer.link = function ({ href, tokens }) {
    const text = this.parser.parseInline(tokens);
    return `<a href="${href}" style="color:#059669;text-decoration:underline;">${text}</a>`;
  };

  renderer.list = function (token) {
    let body = "";
    for (const item of token.items) {
      const inner = this.parser.parse(item.tokens);
      body += `<li style="margin:0 0 6px;color:#334155;font-size:15px;line-height:1.6;">${inner}</li>`;
    }
    const tag = token.ordered ? "ol" : "ul";
    return `<${tag} style="margin:0 0 16px;padding-left:24px;">${body}</${tag}>`;
  };

  renderer.blockquote = function ({ tokens }) {
    const text = this.parser.parse(tokens);
    return `<blockquote style="border-left:3px solid #10b981;margin:16px 0;padding:8px 16px;color:#475569;font-style:italic;">${text}</blockquote>`;
  };

  renderer.code = ({ text }) =>
    `<pre style="background:#f1f5f9;padding:16px;border-radius:8px;overflow-x:auto;margin:0 0 16px;"><code style="font-size:13px;color:#0f172a;">${escapeHtml(text)}</code></pre>`;

  renderer.codespan = ({ text }) =>
    `<code style="background:#f1f5f9;padding:2px 5px;border-radius:4px;font-size:13px;color:#0f172a;">${escapeHtml(text)}</code>`;

  renderer.hr = () =>
    `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">`;

  renderer.strong = function ({ tokens }) {
    const text = this.parser.parseInline(tokens);
    return `<strong style="color:#0f172a;font-weight:600;">${text}</strong>`;
  };

  renderer.image = ({ href, text }) =>
    `<img src="${href}" alt="${escapeHtml(text || "")}" style="max-width:100%;height:auto;border-radius:8px;margin:16px 0;">`;

  return renderer;
}

export function renderServiceUpdateEmail(data: {
  subject: string;
  markdown: string;
  unsubscribeUrl: string;
}): string {
  const renderer = createEmailRenderer();
  const contentHtml = marked.parse(data.markdown, { async: false, renderer }) as string;

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
          ${escapeHtml(data.subject)}
        </h1>
      </td></tr>

      <tr><td style="padding:32px;">
        ${contentHtml}
      </td></tr>

      <tr><td style="padding:16px 32px 22px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;line-height:1.5;">
        You're receiving this because you opted in to service updates.<br>
        <a href="${escapeHtml(data.unsubscribeUrl)}" style="color:#64748b;text-decoration:underline;">Manage email preferences</a><br>
        <strong style="color:#475569;">One Day Investor</strong> &middot; odinvestor.net
      </td></tr>
    </table>
  </body>
</html>`;
}
