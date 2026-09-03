# ADR: Refresh Token Rotation with SHA-256 Storage

## Status
Accepted

## Context
Refresh tokens are long-lived credentials that grant new access tokens. They must resist theft and replay.

## Decision
- Refresh tokens are random 256-bit values, stored only as SHA-256 hashes.
- On every use (`POST /refresh`), the current token is consumed (hash marked revoked) and a new token+hash pair is issued — **rotation on every use**.
- If a consumed token is presented again, the entire session is revoked (reuse detection).

## Rationale
- **SHA-256 storage**: Even if the database is compromised, the attacker cannot derive usable refresh tokens from the stored hashes.
- **Rotation**: Limits the window of exposure. A stolen token can only be used once before the legitimate user's next refresh invalidates it, triggering reuse detection.
- **Reuse detection**: If both attacker and user try to use the same token, the second attempt revokes everything — the attacker cannot silently maintain access.

## Consequences
- Clients must store the new refresh token from every `/refresh` response. A missed response (network error) requires re-login.
- Server-side session record ties the refresh token hash to a session, enabling "sign out everywhere".
