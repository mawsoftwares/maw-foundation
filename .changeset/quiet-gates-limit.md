---
'@mawsoftwares/sdk': minor
'@mawsoftwares/server-express': minor
'@mawsoftwares/server-hono': minor
---

Rate limiting hardening.

- sdk: `SecurityConfig.rateLimit` gains a required `auth` tier (default 20 requests per 60s) for credential endpoints under `/auth/` other than login. Apps that build a `SecurityConfig` by hand instead of spreading `DEFAULT_SECURITY_CONFIG` must add it.
- server-express / server-hono: the security pipeline applies the new `/auth/` tier.
- server-express: the default rate-limit key is now `req.ip`, no longer the raw `X-Forwarded-For` header, which the client controls. Behind a reverse proxy set Express `trust proxy` (for example `app.set('trust proxy', 1)` behind nginx), otherwise all users share one bucket.
- server-hono: the client IP is taken from the right of `X-Forwarded-For` by `trustedProxyHops` (default 1) instead of the spoofable first entry.
- server-express / server-hono: a 429 now returns the standard `ApiResponse` error envelope with code `RATE_LIMITED` and `details.retryAfterMs`, replacing `{ error, retryAfterMs }`. Clients that parse the old body must switch to the envelope.
