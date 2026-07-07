# Status page — `status.odinvestor.net`

[Uptime Kuma](https://github.com/louislam/uptime-kuma) monitoring + public status
page. Runs on the production host at `/opt/uptime-kuma`, separate from the main
app stack. This directory is the version-controlled snapshot.

## Stack

| Piece      | Detail                                                       |
|------------|--------------------------------------------------------------|
| App        | `louislam/uptime-kuma:1`, bound to `127.0.0.1:3011` (→ 3001) |
| Data       | `uptime_kuma_data` volume (`/app/data`, SQLite)             |
| TLS + proxy| nginx terminates TLS, WebSocket-aware, proxies to `:3011`    |
| Server dir | `/opt/uptime-kuma`                                           |
| Public page| https://status.odinvestor.net → `/status/odinvestor`        |
| Admin      | https://status.odinvestor.net/dashboard (password on server: `/opt/uptime-kuma/.admin-pass`) |

## Files

```
apps/uptime-kuma/
  docker-compose.yml               # the running stack
  provision.py                     # idempotent: admin + monitors + status page
  nginx/
    status.odinvestor.net.conf     # snapshot of the live nginx server block
    websocket_upgrade.conf         # $connection_upgrade map (goes in conf.d)
```

## Deploy / redeploy on the server

```bash
cd /opt/uptime-kuma
docker compose pull
docker compose up -d
```

nginx (one-time): copy `nginx/websocket_upgrade.conf` to
`/etc/nginx/conf.d/`, add the `status.odinvestor.net` server block to
`/etc/nginx/sites-enabled/app.conf`, then:

```bash
certbot --nginx -d status.odinvestor.net --redirect
nginx -t && systemctl reload nginx
```

## Monitors

HTTP checks, 60s interval, 2 retries — all published on the status page:

| Monitor          | URL                               |
|------------------|-----------------------------------|
| One Day Investor | https://odinvestor.net            |
| Blog             | https://blog.odinvestor.net       |
| Dashboard        | https://dashboard.odinvestor.net  |
| Core API         | https://core.odinvestor.net       |
| Market API       | https://market.odinvestor.net     |
| Analytics API    | https://analytics.odinvestor.net  |
| Trade            | https://trade.odinvestor.net (accepts 3xx) |

To reconcile monitors/status page with `provision.py` (idempotent — see the
script header for the exact command):

```bash
PW=$(cat /opt/uptime-kuma/.admin-pass)
docker run --rm -i --network host python:3.12-slim \
  sh -c "pip install --quiet uptime-kuma-api && python3 - '$PW'" < provision.py
```

> This Docker host is snap-confined and can't bind-mount from `/opt`, so the
> script is piped via stdin rather than mounted.

## Notes

- The root `/` 302-redirects to the public status page; admin login lives at
  `/dashboard`.
- Notifications (email/Telegram/Slack/Discord) are **not** configured yet — add
  them in Settings → Notifications, then attach to each monitor.
