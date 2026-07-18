# Per-branch preview environments (hoster)

Every pull request gets its own live environment on the hoster host. Opening or
pushing to a PR builds images and deploys them; closing the PR tears the
environment down.

## How it works

1. `.github/workflows/preview.yml` runs on `pull_request`
   (`opened`/`synchronize`/`reopened`/`closed`).
2. On open/push it builds and pushes the preview images to ghcr, tagged with the
   PR **head SHA**: `ghcr.io/vladosuscocosus/odi-<service>:<sha>`.
3. It then SSHes to the server and `POST`s `hoster.json` to the hoster control
   API on `127.0.0.1:8081`. We go through SSH so the control API stays private.
4. hoster pulls the images, starts one container per service on a private
   per-branch network, and routes public traffic by `Host` header.
5. On PR close it SSHes in and `DELETE`s the branch env.

Branch names are sanitized to DNS labels by hoster (`feature/ABC-1` →
`feature-abc-1`). Public URLs follow the host's `HOSTER_HOSTNAME_TEMPLATE`, e.g.
`frontend-feature-abc-1.<your-domain>`.

## What runs in a preview

Topology lives in [`hoster.json`](../hoster.json).

| Service | Exposed? | Notes |
| --- | --- | --- |
| `frontend` | ✅ | Main entry. Built with **empty `VITE_*`** so the SPA calls same-origin `/api`,`/auth`; `nginx/frontend-hoster.conf` proxies those to the branch's own `core`/`analytics`/`market` by service name. |
| `core` | ✅ | API. Runs DB migrations itself on boot (`AUTO_MIGRATE=true`). Also reachable directly at `core-<branch>.…` for API testing. |
| `site` | ✅ | Marketing/SSR site. Talks to backends over internal service names. |
| `analytics`, `market` | ❌ | Internal; reached through the frontend proxy. |
| `db` (postgres), `redis` | ❌ | Fresh each deploy. |

## One-time setup

**GitHub → Settings → Secrets and variables → Actions → Secrets:**

- `HOSTER_TOKEN` — the shared token from the server's `/etc/hoster/hoster.env`.
- `SSH_HOST`, `SSH_USER`, `SSH_KEY` — already present (reused from the prod deploy).

**On the server (already/needs to be true):**

- hoster is running (`systemctl status hoster`), `HOSTER_API_LISTEN=127.0.0.1:8081`.
- `HOSTER_HOSTNAME_TEMPLATE` is set to your domain, e.g. `{service}-{branch}.dev.odinvestor.net`.
- Wildcard DNS `*.<that domain>` → the host's public IP.
- The host's Docker can pull the private ghcr images (confirmed handled).
- Optional: a TLS terminator in front of the hoster proxy for `https://` URLs
  (hoster serves plain HTTP).

## Limitations (by design)

- **Ephemeral.** Every deploy is a full replace — the database is recreated and
  migrated from scratch, so there is **no seed data**. Sign-up/create flows work;
  pre-existing data does not carry over.
- **Google login doesn't work in previews.** OAuth redirect URIs are per-branch
  and aren't registered with Google. Use API/token flows, or add a seed/test
  session step if you need an authenticated UI.
- **No object storage.** minio is omitted (hoster's service schema doesn't take a
  `command`), so blog image upload / S3-backed images are unavailable in previews.
- **Excluded services:** `reminder` (would send real emails), `blog`, `og`. The
  dashboard's blog-admin pages will 502 against a preview.
- **Plain HTTP** unless you front hoster with TLS; **one shared token** for the
  control API — keep `:8081` off the public internet.

## Verify a preview manually

From the server (or over your SSH tunnel):

```bash
# list current envs
curl -s http://127.0.0.1:8081/deployments -H "Authorization: Bearer $HOSTER_TOKEN"

# hit a branch through the proxy
curl -s -H 'Host: frontend-<branch-slug>.<your-domain>' http://127.0.0.1:8080/ | head -1

# tear one down
curl -s -X DELETE http://127.0.0.1:8081/deploy/<branch-slug> -H "Authorization: Bearer $HOSTER_TOKEN"
```
