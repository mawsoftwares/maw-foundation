# ADR: Client-Side SHA-256 Password Prehashing

## Status
Accepted

## Context
All password-bearing API endpoints (`/auth/login`, `/register`, `/change-password`, `/reset-password`, `DELETE /account`) previously sent raw passwords in the request body. While TLS encrypts the transport, the raw password is visible at the application layer — in request bodies logged by proxies, WAFs, load-balancers, application-level logging, and error-tracking services.

## Decision
- The client computes `SHA-256(password)` and sends `sha256:<hex>` as the password field, along with the header `x-password-prehashed: sha256`.
- The server strips the `sha256:` prefix and feeds the hex digest to scrypt as the "password" input — the storage hash is `scrypt(SHA-256(password))`.
- In production (`requirePrehash: true` in `AuthSecurityConfig`), the server rejects requests without the prehash header. In development, raw passwords are still accepted for convenience.
- The `prehashPassword` utility in `@mawsoftwares/sdk` works in browsers (Web Crypto API), Node.js (`node:crypto`), and React Native (via `expo-crypto` or a `crypto.subtle` polyfill).
- The API client (`@mawsoftwares/api-client`) automatically prehashes before sending.

## Rationale
- **Defense in depth**: The raw password never leaves the client process. Even if TLS terminates at a reverse proxy or CDN edge, the proxy only sees a SHA-256 digest — useless for credential stuffing against other services where the user reused the same password.
- **Log safety**: Application logs, error reports, and audit trails that accidentally capture request bodies never contain the raw password.
- **No protocol complexity**: Unlike SRP or OPAQUE, this requires no additional round-trips or server-side state. It's a one-way transform the client applies before the existing flow.
- **scrypt remains the storage hash**: SHA-256 is fast and not suitable for password storage on its own. The server still applies scrypt, making the stored hash resistant to brute force. The composition `scrypt(SHA-256(pw))` is no weaker than `scrypt(pw)` — SHA-256 is a preimage-resistant compression, and scrypt provides the work factor.

## Consequences
- Clients that don't prehash will be rejected in production. All official clients (web, mobile, API client) use `prehashPassword` automatically.
- Password policy validation (`validatePassword`) runs on the raw password **before** prehashing on the client side. The server receives only the digest and cannot re-validate policy — this is acceptable because policy validation is a UX concern, not a security invariant.
- Existing stored password hashes remain valid: the server has always stored `scrypt(password)`. After this change, new hashes become `scrypt(SHA-256(password))`. A password reset or change migrates the user to the new scheme.
