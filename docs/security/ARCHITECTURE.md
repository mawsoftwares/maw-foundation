# Security Architecture

## Authentication Flow

1. **Login**: `POST /login` with email + password → `AuthenticationService` verifies credentials via `IHasher` (scrypt), checks account status, checks login protection (rate limiting + progressive delay). If MFA is enabled, returns a short-lived MFA challenge token instead of access tokens.

2. **Token issuance**: On success, issues a JWT access token (HS256, 15-min TTL, includes JTI) and a refresh token (random, SHA-256 hashed before storage). A server-side session record is created.

3. **Token refresh**: `POST /refresh` rotates the refresh token — old hash is revoked, new token + hash stored. A fresh access token is issued. Reuse of a consumed token revokes the entire session (rotation detection).

4. **Token blacklisting**: Each access token carries a JTI. On logout or session revocation, the JTI is added to an `ITokenBlacklist` (memory or Redis). `verifyAccessToken` checks the blacklist before accepting a token.

5. **CSRF**: Double-submit cookie pattern. Safe methods (`GET`/`HEAD`/`OPTIONS`) set a `maw_csrf` cookie via `generateCsrfToken`. Unsafe methods validate that the `x-csrf-token` header matches the cookie value using `csrfTokensMatch` (timing-safe comparison). Bearer-only clients (no cookie present) skip CSRF.

## RBAC Model

Two complementary paths:

- **Static**: `resolveEffectiveAccess(role, tenantPolicy, enabledModules)` computes allowed permissions from the tenant's editable role→permission matrix intersected with licensed modules. No DB call at request time.

- **Dynamic**: `MasterCache` backed by Postgres tables (`master_roles`, `master_permissions`, `master_modules`, `role_permissions`, `module_permissions`). `checkPermissionDynamic` resolves permissions through the cache. Supports ABAC via `scopeId` on user claims.

- **Audience gating**: Users carry an `audience` field (e.g., `admin` vs `operator`). Routes can require a specific audience, enabling dual-app deployments from one user table.

## Session Management

- Server-side sessions stored in `user_sessions` (Postgres) or in-memory.
- Each session tracks device info, IP, user agent, refresh token hash, and expiry.
- Concurrency limits enforced by `SessionService` (configurable max active sessions).
- `revokeAll` terminates all sessions for a user. `revokeOwned` enforces ownership — users can only revoke their own sessions.

## MFA (TOTP)

- RFC 6238 TOTP with 6-digit codes, 30-second window (±1 step tolerance).
- Enrollment: `OtpService` generates a secret, encrypts it with AES before storing in `IOtpSecretStore`. Returns an `otpauth://` URI for authenticator apps plus one-time backup codes (stored as salted hashes).
- Activation: User must provide a valid TOTP code to confirm enrollment.
- Login with MFA: After password verification, a `mfa_challenge` token is issued. The user submits this token with a TOTP code or backup code to complete login.

## Tenant Isolation

- **Postgres RLS**: All tenant-scoped tables have `ROW LEVEL SECURITY` with policies using `current_setting('app.tenant_id', true)`. The app connects as a non-owner role.
- **Middleware**: `setTenantContext` calls `SET LOCAL app.tenant_id = $1` per transaction via `packages/database/src/tenant/`.
- **Resolvers**: Tenant ID extracted from request headers, JWT claims, or subdomain via composable `TenantResolver` implementations.

## Security Headers Pipeline

Applied via `createSecurityPipeline` (Express) / equivalent Hono middleware:

1. **Request ID**: Generates or propagates `x-request-id`.
2. **Secure Headers**: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`, `Permissions-Policy`.
3. **CORS**: Configurable origins, methods, headers.
4. **Rate Limiting**: `IRateLimiter` with `MemoryRateLimiter` (default) or `RedisRateLimiter` (sliding window via INCR+EXPIRE). Keyed by IP.
5. **CSRF**: Double-submit cookie (see above).
6. **Input Sanitization**: Strips `<script>`, event handlers (`on\w+=`), `javascript:` URIs, HTML entity-encoded tags, null bytes from string values in request body/query/params.

## Rate Limiting

- `IRateLimiter` contract in SDK; two implementations:
  - `MemoryRateLimiter`: In-process, suitable for single-instance or dev.
  - `RedisRateLimiter`: Distributed sliding window for multi-instance production.
- Login protection: `LoginProtection` tracks consecutive failures per key (email or IP), applies progressive delays and lockout after configurable thresholds.

## Password Security

- **Client-side prehash**: The client computes `SHA-256(password)` and sends `sha256:<hex>` with header `x-password-prehashed: sha256`. The raw password never leaves the client process — proxies, WAFs, logs, and error trackers only see the digest. In production (`requirePrehash: true`), the server rejects requests without the prehash header. See [ADR: Client-Side SHA-256 Password Prehashing](../../.engineering/decisions/ADR-security-password-prehash.md).
- **Storage hashing**: scrypt with 128-bit salt, N=16384, r=8, p=1 (via `ScryptHasher`). The stored hash is `scrypt(SHA-256(password))` — SHA-256 compresses, scrypt provides the work factor.
- **Validation**: Configurable policy — min length, uppercase, lowercase, digits, special characters. Runs on the raw password client-side before prehashing.
- **History**: `IPasswordHistoryStore` checks the last N password hashes before accepting a change. Old hash recorded after successful change.
- **Reset**: Token-based flow with SHA-256 hashed tokens, expiry, single-use enforcement.

## GDPR Account Purge

`AccountPurgeService.purge(userId, password)`:
1. Verifies password.
2. Revokes all sessions.
3. Deletes MFA secrets and backup codes.
4. Replaces PII with anonymized values (`deleted-<uuid>@purged.local`, null name/phone).
5. Disables the account.

## Social Authentication

- Provider interface: `ISocialAuthProvider` with `exchangeCode(code, redirectUri) → SocialAuthProfile`.
- Built-in providers: `GoogleAuthProvider`, `GitHubAuthProvider`.
- `SocialAuthService.authenticate`: Links social accounts to existing users (by email match) or creates new users. Auto-verifies email if the provider confirms it.
- Account linking/unlinking for authenticated users.

## Production Safeguards

- `validateSecuritySecrets`: Throws at boot if JWT secret is weak (<32 chars or a known default) or MFA encryption key is all zeros in production.
- CSP defaults block inline scripts and frame ancestors.
- Permissions-Policy disables camera, microphone, geolocation, and payment APIs.
