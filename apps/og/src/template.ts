export function renderOgHtml({
  title,
  tags,
}: {
  title: string;
  tags: string[];
}): string {
  const tagRow = tags.length
    ? tags
        .map(
          (t) =>
            `<span style="font-size:14px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:rgba(167,243,208,0.8)">${t.toUpperCase()}</span>`
        )
        .join(
          '<span style="color:rgba(16,185,129,0.4);margin:0 16px">&middot;</span>'
        )
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px;
      height: 630px;
      font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
      overflow: hidden;
      background: radial-gradient(ellipse 900px 700px at 85% 115%, rgba(16, 185, 129, 0.28) 0%, transparent 55%),
                  radial-gradient(ellipse 1400px 900px at 10% -10%, #0f6d4f 0%, #064e36 38%, #02281c 100%);
    }
  </style>
</head>
<body>
  <div style="position:relative;width:1200px;height:630px;padding:56px 64px;display:flex;flex-direction:column;justify-content:space-between">
    <!-- Decorative sparkline -->
    <svg style="position:absolute;right:-20px;top:0;width:520px;height:100%;opacity:0.15" viewBox="0 0 520 630" fill="none">
      <path d="M40 580 C80 540, 120 520, 160 500 S240 440, 280 400 S360 320, 400 260 S440 180, 480 140 S500 100, 520 60"
            stroke="url(#sparkGrad)" stroke-width="3" fill="none"/>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#6ee7b7" stop-opacity="0.8"/>
        </linearGradient>
      </defs>
    </svg>

    <!-- Logo -->
    <div style="display:flex;align-items:center;gap:10px;position:relative;z-index:1">
      <div style="width:12px;height:12px;border-radius:3px;background:linear-gradient(135deg,#6ee7b7,#10b981)"></div>
      <span style="font-size:13px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:rgba(236,253,245,0.9)">One Day Investor</span>
    </div>

    <!-- Title -->
    <div style="position:relative;z-index:1;max-width:900px">
      <h1 style="font-size:${title.length > 60 ? 48 : title.length > 40 ? 56 : 64}px;font-weight:700;line-height:1.08;letter-spacing:-0.02em;color:#ecfdf5">
        ${title}
      </h1>
    </div>

    <!-- Footer: tags + URL -->
    <div style="display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1">
      <div style="display:flex;align-items:center">
        ${tagRow}
      </div>
      <span style="font-size:14px;font-weight:500;color:rgba(167,243,208,0.6)">blog.odinvestor.net</span>
    </div>
  </div>
</body>
</html>`;
}
