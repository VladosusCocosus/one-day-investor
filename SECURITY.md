# Security

## Reporting a vulnerability

Please report security issues through
[GitHub's private vulnerability reporting](https://github.com/VladosusCocosus/one-day-investor/security/advisories/new)
rather than opening a public issue.

## How the application handles sensitive data

- **Exchange API credentials** are encrypted at rest with AES-256-GCM before
  they reach the database ([`packages/exchange/src/crypto.ts`](packages/exchange/src/crypto.ts)).
  The key comes from `EXCHANGE_ENCRYPTION_KEY` and is never stored alongside the
  ciphertext.
- **Exchange access is read-only in practice.** Every adapter in
  [`packages/exchange/src/adapters/`](packages/exchange/src/adapters/) calls only
  balance and position endpoints; none calls an order, trade or withdrawal
  endpoint. Users are asked to issue read-only keys, and nothing in the codebase
  could act on a key that carried wider permissions.
- **Agent tokens** are stored only as SHA-256 hashes with the last four
  characters kept for display. The plaintext is shown once, at creation, and
  cannot be recovered afterwards.
- **Agent tokens are scoped.** Each token may only reach the path prefixes listed
  in the public `/agents.json` manifest; admin, user-settings, notification and
  exchange-credential routes are denied outright.
- **No bank integrations.** The application holds no bank or broker access
  tokens, by design.

## Configuration

All secrets are supplied through environment variables — see
[`.env.example`](.env.example) for the full list. No secret has a working
default; `ADMIN_EMAIL` left blank causes every admin route to return 403.
