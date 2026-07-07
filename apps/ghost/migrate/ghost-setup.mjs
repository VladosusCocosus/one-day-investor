// One-time provisioning script used during initial Ghost setup.
//
// It: (1) creates the Ghost owner account, (2) logs in, (3) uploads the logo
// (wordmark) + favicon, (4) applies branding settings, (5) imports posts from
// posts.json (produced by convert.cjs). Kept in the repo as documentation of
// how the live instance was branded + seeded. Safe to re-run only against a
// fresh Ghost (setup step fails once an owner already exists).
//
// Usage:
//   node convert.cjs <postsDir> ./posts.json     # produce posts.json first
//   node ghost-setup.mjs                          # then run this
//
// The generated owner password is printed at the end — change it after login.

import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, '..', 'assets');
const POSTS_JSON = join(HERE, 'posts.json');

const BASE = process.env.GHOST_URL || 'https://blog.odinvestor.net';
const OWNER_NAME = 'One Day Investor';
const OWNER_EMAIL = process.env.GHOST_OWNER_EMAIL || 'razin36986@gmail.com';
const TITLE = 'One Day Investor';
const DESCRIPTION = 'Track your portfolio with pockets, snapshots, and analytics — across every broker and asset class.';
const ACCENT = '#10b981';

const password = 'ODInv-' + randomBytes(9).toString('base64url'); // strong, >10 chars
let cookie = '';

const H = (extra = {}) => ({
  Origin: BASE,
  Referer: BASE + '/ghost/',
  'Accept-Version': 'v5.0',
  ...(cookie ? { Cookie: cookie } : {}),
  ...extra,
});

function grabCookie(res) {
  const all = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of all) {
    if (c.startsWith('ghost-admin-api-session=')) cookie = c.split(';')[0];
  }
}

async function j(res) { const t = await res.text(); try { return JSON.parse(t); } catch { return t; } }

async function main() {
  // 1) Setup owner
  let res = await fetch(`${BASE}/ghost/api/admin/authentication/setup/`, {
    method: 'POST',
    headers: H({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ setup: [{ name: OWNER_NAME, email: OWNER_EMAIL, password, blogTitle: TITLE }] }),
  });
  grabCookie(res);
  console.log('setup:', res.status, res.ok ? 'OK' : JSON.stringify(await j(res)).slice(0, 300));

  // 2) Session login (ensures we hold a valid cookie)
  res = await fetch(`${BASE}/ghost/api/admin/session/`, {
    method: 'POST',
    headers: H({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username: OWNER_EMAIL, password }),
  });
  grabCookie(res);
  console.log('login:', res.status, cookie ? 'cookie acquired' : 'NO COOKIE ' + JSON.stringify(await j(res)).slice(0, 300));

  // 3) Upload logo (wordmark svg) + icon (favicon png)
  async function upload(file, name, type) {
    const buf = readFileSync(join(ASSETS, file));
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type }), name);
    fd.append('ref', name);
    const r = await fetch(`${BASE}/ghost/api/admin/images/upload/`, { method: 'POST', headers: H(), body: fd });
    const d = await j(r);
    const url = d && d.images && d.images[0] && d.images[0].url;
    console.log(`upload ${file}:`, r.status, url || JSON.stringify(d).slice(0, 200));
    return url;
  }
  const logoUrl = await upload('wordmark.svg', 'odinvestor-logo.svg', 'image/svg+xml');
  const iconUrl = await upload('favicon.png', 'odinvestor-icon.png', 'image/png');

  // 4) Settings: title, description, logo, icon, accent
  const settings = [
    { key: 'title', value: TITLE },
    { key: 'description', value: DESCRIPTION },
    { key: 'accent_color', value: ACCENT },
  ];
  if (logoUrl) settings.push({ key: 'logo', value: logoUrl });
  if (iconUrl) settings.push({ key: 'icon', value: iconUrl });
  res = await fetch(`${BASE}/ghost/api/admin/settings/`, {
    method: 'PUT', headers: H({ 'Content-Type': 'application/json' }), body: JSON.stringify({ settings }),
  });
  console.log('settings:', res.status, res.ok ? 'OK' : JSON.stringify(await j(res)).slice(0, 300));

  // 5) Import posts
  const posts = JSON.parse(readFileSync(POSTS_JSON, 'utf8'));
  for (const p of posts) {
    const body = { posts: [{
      title: p.title, slug: p.slug, custom_excerpt: (p.custom_excerpt || '').slice(0, 300),
      html: p.html, tags: p.tags, status: 'published', published_at: p.published_at,
    }] };
    const r = await fetch(`${BASE}/ghost/api/admin/posts/?source=html`, {
      method: 'POST', headers: H({ 'Content-Type': 'application/json' }), body: JSON.stringify(body),
    });
    const d = await j(r);
    const created = d && d.posts && d.posts[0];
    console.log(`post ${p.slug}:`, r.status, created ? `-> ${created.url}` : JSON.stringify(d).slice(0, 300));
  }

  console.log('\n=========== CREDENTIALS ===========');
  console.log('URL:      ' + BASE + '/ghost/');
  console.log('Email:    ' + OWNER_EMAIL);
  console.log('Password: ' + password);
  console.log('===================================');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
