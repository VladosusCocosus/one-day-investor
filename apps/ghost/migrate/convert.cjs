// Convert One Day Investor block-based JSON posts -> Ghost-ready HTML.
// Run from apps/blog cwd so `marked` resolves.
const fs = require('fs');
const path = require('path');

const marked = require(process.env.MARKED_PATH || 'marked');
const md = (s) => (marked.parse ? marked.parse(String(s || '')) : marked(String(s || ''))).trim();

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const POSTS_DIR = process.argv[2];
const OUT = process.argv[3];

function renderBlock(b) {
  switch (b.type) {
    case 'hero':
      // Title is Ghost's post title; use subtitle as the opening lead paragraph.
      return b.subtitle ? `<p>${b.subtitle}</p>` : '';
    case 'prose': {
      const h = b.heading ? `<h2>${esc(b.heading)}</h2>` : '';
      const ps = (b.paragraphs || []).map((p) => `<p>${p}</p>`).join('\n');
      return `${h}\n${ps}`;
    }
    case 'markdown': {
      const h = b.heading ? `<h2>${esc(b.heading)}</h2>` : '';
      return `${h}\n${md(b.body)}`;
    }
    case 'pull-quote':
      return `<blockquote><p>${b.text}</p></blockquote>`;
    case 'comparison': {
      const h = b.heading ? `<h2>${esc(b.heading)}</h2>` : '';
      const intro = b.intro ? `<p>${b.intro}</p>` : '';
      const L = b.left || {}, R = b.right || {};
      const li = L.items || [], ri = R.items || [];
      const n = Math.max(li.length, ri.length);
      let rows = '';
      for (let i = 0; i < n; i++) {
        rows += `<tr><td>${esc(li[i] || '')}</td><td>${esc(ri[i] || '')}</td></tr>`;
      }
      const table = `<table><thead><tr><th>${esc(L.label || '')}</th><th>${esc(R.label || '')}</th></tr></thead><tbody>${rows}</tbody></table>`;
      const outro = b.outro ? `<p>${b.outro}</p>` : '';
      return `${h}\n${intro}\n${table}\n${outro}`;
    }
    case 'closing': {
      const q = `<blockquote><p>${b.text}</p></blockquote>`;
      const a = b.author ? `<p><em>&mdash; ${esc(b.author)}</em></p>` : '';
      return `${q}\n${a}`;
    }
    case 'chart': {
      const h = b.heading ? `<h3>${esc(b.heading)}</h3>` : '';
      const labels = (b.data && b.data.labels) || [];
      const series = (b.data && b.data.series) || [];
      const opt = b.options || {};
      const prefix = opt.prefix || '';
      const suffix = opt.suffix || '';
      const fmt = (v) => {
        if (v == null) return '';
        const num = typeof v === 'number' ? v.toLocaleString('en-US') : esc(v);
        return `${esc(prefix)}${num}${esc(suffix)}`;
      };
      // Multi-series (e.g. line chart): series = [{ name, values: [...] }, ...]
      const isMulti = series.length > 0 && series[0] && typeof series[0] === 'object' && Array.isArray(series[0].values);
      let table;
      if (isMulti) {
        const head = `<tr><th></th>${series.map((s) => `<th>${esc(s.name)}</th>`).join('')}</tr>`;
        let rows = '';
        for (let i = 0; i < labels.length; i++) {
          rows += `<tr><td>${esc(labels[i])}</td>${series.map((s) => `<td>${fmt(s.values[i])}</td>`).join('')}</tr>`;
        }
        table = `<table><thead>${head}</thead><tbody>${rows}</tbody></table>`;
      } else {
        let rows = '';
        for (let i = 0; i < labels.length; i++) {
          rows += `<tr><td>${esc(labels[i])}</td><td>${fmt(series[i])}</td></tr>`;
        }
        table = `<table><thead><tr><th>Category</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>`;
      }
      const cap = b.caption ? `<p><em>${esc(b.caption)}</em></p>` : '';
      return `<figure>${h}\n${table}\n${cap}</figure>`;
    }
    default:
      return '';
  }
}

const files = fs.readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith('.json'));

const out = [];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(POSTS_DIR, f), 'utf8'));
  const html = (j.content || []).map(renderBlock).filter(Boolean).join('\n\n');
  out.push({
    title: j.title,
    slug: j.slug,
    custom_excerpt: j.excerpt || '',
    tags: (j.tags || []).map((t) => ({ name: t })),
    published_at: j.publish_date ? `${j.publish_date}T09:00:00.000Z` : undefined,
    html,
  });
  console.log(`converted: ${j.slug}  (${(j.content || []).length} blocks -> ${html.length} chars html)`);
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`wrote ${out.length} posts -> ${OUT}`);
