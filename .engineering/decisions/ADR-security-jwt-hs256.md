# ADR: HS256 JWT with Short TTL and JTI Blacklisting

## Status
Accepted

## Context
Access tokens must be stateless for horizontal scaling but revocable for logout and session invalidation.

## Decision
- **Algorithm**: HS256 (HMAC-SHA256) with a shared secret ≥32 characters.
- **TTL**: 15 minutes (configurable via `DEFAULT_ACCESS_TTL_SECONDS`).
- **JTI**: Every token includes a unique `jti` claim. On revocation, the JTI is added to an `ITokenBlacklist`.
- **Blacklist check**: `verifyAccessToken` accepts an optional `{ blacklist }` parameter. When provided, it rejects tokens whose JTI appears in the blacklist.

## Rationale
- **HS256 vs RS256**: HS256 is simpler — no key rotation ceremony, no JWKS endpoint. Acceptable because all token verification happens within our own services (no third-party consumers). If federation is needed later, switch to RS256/ES256 by changing `SignOptions`.
- **15-min TTL**: Short enough that a leaked token has limited blast radius. Long enough that normal flows rarely need a refresh mid-operation.
- **JTI blacklisting**: Enables immediate revocation without shortening TTL further. The blacklist only needs to store entries for `maxTtlSeconds` — entries expire with the token.

## Consequences
- The JWT secret must be strong in production — enforced by `validateSecuritySecrets`.
- Blacklist implementations must be fast (O(1) lookup). `MemoryTokenBlacklist` works for single-instance; `RedisRateLimiter` pattern can be adapted for distributed blacklisting.
