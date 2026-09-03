# ADR: In-Memory Default Stores with Pg/Redis Swap via Ports

## Status
Accepted

## Context
Every security service (sessions, tokens, rate limiting, MFA secrets, login attempts) needs persistent storage in production but must also work with zero external dependencies during development, testing, and in the sample server's standalone mode.

## Decision
- Each service depends on an interface (port): `ISessionStore`, `IRefreshTokenStore`, `IRateLimiter`, `IOtpSecretStore`, `ITokenBlacklist`, `IPasswordHistoryStore`, etc.
- Each interface has a `Memory*` implementation in the same package (e.g., `MemorySessionStore`, `MemoryTokenBlacklist`).
- Production implementations (`PgSessionStore`, `PgUserRepository`, `RedisRateLimiter`) live in `packages/platform` or `apps/sample-server` and are injected at the composition root.
- The composition root (e.g., `apps/sample-server/src/main.ts`) is the only place that names a concrete implementation.

## Rationale
- **Dependency inversion**: Services are testable without Postgres or Redis. Unit tests use memory stores; integration tests can use either.
- **Zero-dep dev**: `npm start` works with just Node.js — no Docker, no database setup required for the sample server's in-memory mode.
- **Swap without code changes**: Switching from memory to Postgres is a one-line change at the composition root. No service code is modified.
- **Consistent with the monorepo dependency law**: `apps → domains + ui → platform → sdk`. Only apps name concrete implementations.

## Consequences
- Memory stores are not suitable for production multi-instance deployments (no shared state).
- Each new feature that needs persistence requires defining an interface first, then implementing both memory and Pg/Redis variants.
