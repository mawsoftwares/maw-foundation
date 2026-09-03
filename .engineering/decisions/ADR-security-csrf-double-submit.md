# ADR: CSRF Double-Submit Cookie Pattern

## Status
Accepted

## Context
Web clients using cookie-based sessions are vulnerable to CSRF. Mobile and service-to-service clients using Bearer tokens are not. The solution must handle both without requiring separate middleware stacks.

## Decision
- On safe methods (`GET`/`HEAD`/`OPTIONS`), the server sets a `maw_csrf` cookie with a random token.
- On unsafe methods (`POST`/`PUT`/`PATCH`/`DELETE`), the server validates that the `x-csrf-token` request header matches the cookie value using `csrfTokensMatch` (timing-safe comparison).
- If no `maw_csrf` cookie is present on an unsafe request, CSRF validation is **skipped** — this indicates a Bearer-only client that doesn't send cookies.

## Rationale
- **Double-submit vs synchronizer token**: Double-submit requires no server-side state. The cookie is set by the server (HttpOnly=false so JS can read it), and the header proves the request originated from code that can read same-origin cookies.
- **Skip for Bearer-only**: Mobile apps and API consumers authenticate via `Authorization: Bearer <token>` without cookies. CSRF attacks exploit cookies; no cookies = no CSRF risk. Forcing these clients to manage CSRF tokens adds complexity for zero security benefit.
- **Timing-safe comparison**: Prevents timing attacks that could leak the token byte by byte.

## Consequences
- Frontend JavaScript must read the `maw_csrf` cookie and attach it as `x-csrf-token` on every mutating request.
- The cookie is `SameSite=Strict` by default, providing defense-in-depth.
