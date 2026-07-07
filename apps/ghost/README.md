# Ghost blog — `blog.odinvestor.net`

Self-contained [Ghost](https://ghost.org) blog + MySQL stack. Runs on the
production host **separately** from the main `one-day-investor` compose project,
deployed from `/opt/ghost`. This directory is the version-controlled snapshot of
that config.

Ghost replaced the previous custom blog on `blog.odinvestor.net`.

## Stack

| Piece      | Detail                                                        |
|------------|---------------------------------------------------------------|
| Ghost      | `ghost:6` image, bound to `127.0.0.1:2368` (loopback only)     |
| Database   | `mysql:8.0`, data in the `ghost_mysql` volume                 |
| Content    | `ghost_content` volume (`/var/lib/ghost/content`)             |
| TLS + proxy| nginx terminates TLS and reverse-proxies to `:2368`          |
| Email      | Mailgun SMTP (US region) for transactional mail               |
| Server dir | `/opt/ghost`                                                  |

## Files

```
apps/ghost/
  docker-compose.yml              # the running stack (secrets via .env)
  .env.example                    # required env vars — copy to .env on server
  nginx/blog.odinvestor.net.conf  # snapshot of the live nginx server block
  assets/
    wordmark.svg                  # Ghost logo (emerald mark + wordmark)
    favicon.png                   # Ghost publication icon (256×256)
  migrate/
    convert.cjs                   # old block-JSON posts -> Ghost-ready HTML
    ghost-setup.mjs               # one-time: create owner, brand, import posts
```

## Deploy / redeploy on the server

```bash
cd /opt/ghost
# First time only: cp .env.example .env  &&  edit real secrets  &&  chmod 600 .env
docker compose pull
docker compose up -d
docker compose ps
```

nginx: the `blog.odinvestor.net` server block lives in
`/etc/nginx/sites-enabled/app.conf` on the host (mirrored in `nginx/` here).
After changes: `nginx -t && systemctl reload nginx`. The TLS cert is the shared
`core.odinvestor.net` Let's Encrypt cert (covers `blog.odinvestor.net`).

> Heads-up: on the host, `/etc/nginx/sites-enabled/app.conf` is a **real file**,
> not a symlink to `sites-available/` — edit the enabled copy.

## Branding

- **Title:** One Day Investor
- **Tagline:** Track your portfolio with pockets, snapshots, and analytics — across every broker and asset class.
- **Logo:** `assets/wordmark.svg` · **Icon:** `assets/favicon.png` · **Accent:** `#10b981`

Set via `migrate/ghost-setup.mjs` (Admin API) or manually in
Settings → Design & branding.

## Content migration (historical)

The two launch posts were migrated from the old custom blog's block-based JSON
(`apps/blog/content/posts/*.json`):

```bash
cd apps/ghost/migrate
# marked is used for the markdown blocks; point at the blog app's copy:
MARKED_PATH=../../blog/node_modules/marked \
  node convert.cjs ../../blog/content/posts ./posts.json
node ghost-setup.mjs        # prints the generated owner password
```

`convert.cjs` maps each block type (`hero`, `prose`, `markdown`, `pull-quote`,
`comparison`, `closing`, `chart`) to clean HTML; charts become accessible
tables. `posts.json` is generated output and is gitignored.

## Email

Transactional email (member magic links, password resets, staff invites) goes
through **Mailgun SMTP** (`smtp.mailgun.org:587`, STARTTLS), configured via the
`mail__*` env vars in `docker-compose.yml` + `MAIL_USER`/`MAIL_PASS` in `.env`.

**Newsletters** (bulk sends to members) are **not** configured — those use the
Mailgun *API*, not SMTP. Add `bulkEmail__*` config + a Mailgun API key if needed.

## Themes

Active theme: **Source** (Ghost's bundled default). Casper is also installed.

Running **Ghost 6** (upgraded from 5.130.6 on 2026-07-06). The upgrade was needed
because modern official themes (Journal, Digest) use the `social_accounts` helper,
which only exists in Ghost 6 — on Ghost 5 they failed gscan with
`GS005-TPL-ERR` ("helper that is not supported") on `default.hbs`. Verified with
gscan on v6: Journal validates with 0 errors / 0 warnings.

Backups from the upgrade live in `/opt/ghost/backups/` on the host
(`ghost-db-*.sql`, `ghost-content-*.tgz`); the pre-upgrade compose is saved as
`docker-compose.yml.bak-v5`.
