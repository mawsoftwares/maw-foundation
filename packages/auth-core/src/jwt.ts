import jwt from 'jsonwebtoken';

/**
 * Access-token claims. Framework-agnostic (Restaurant OS used `hono/jwt`; here we use
 * `jsonwebtoken` so the same code runs under Express, Hono, or any Node runtime).
 * HS256, short-lived — refresh tokens carry the long-lived state (see refresh.ts).
 */
export interface AuthClaims {
  readonly tenantId: string;
  readonly userId: string;
  readonly role: string;
  /** App/audience the token was issued for (dual-audience gating). */
  readonly audience?: string;
  /** Optional scoping axis (e.g. plant id; null = all). */
  readonly scopeId?: string | null;
}

/** Default access-token lifetime: 12h (matches Restaurant OS). */
export const DEFAULT_ACCESS_TTL_SECONDS = 60 * 60 * 12;

export function signAccessToken(
  claims: AuthClaims,
  secret: string,
  ttlSeconds: number = DEFAULT_ACCESS_TTL_SECONDS,
): string {
  return jwt.sign({ ...claims }, secret, { algorithm: 'HS256', expiresIn: ttlSeconds });
}

/** Verify + extract claims, or throw if the token is invalid/expired. */
export function verifyAccessToken(token: string, secret: string): AuthClaims {
  const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (typeof payload === 'string') throw new Error('malformed token payload');
  const { tenantId, userId, role, audience, scopeId } = payload as Record<string, unknown>;
  if (typeof tenantId !== 'string' || typeof userId !== 'string' || typeof role !== 'string') {
    throw new Error('malformed token claims');
  }
  return {
    tenantId,
    userId,
    role,
    audience: typeof audience === 'string' ? audience : undefined,
    scopeId: typeof scopeId === 'string' || scopeId === null ? (scopeId as string | null) : undefined,
  };
}
