import jwt from 'jsonwebtoken';
import type { ITokenBlacklist } from './token-blacklist';

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
  /** JWT ID — present when issueJti is true. Enables token blacklisting. */
  readonly jti?: string;
}

export interface SignOptions {
  readonly ttlSeconds?: number;
  readonly issueJti?: boolean;
}

/** Default access-token lifetime: 15 minutes (production-safe). */
export const DEFAULT_ACCESS_TTL_SECONDS = 60 * 15;

export function signAccessToken(
  claims: AuthClaims,
  secret: string,
  optionsOrTtl?: SignOptions | number,
): string {
  const opts: SignOptions = typeof optionsOrTtl === 'number'
    ? { ttlSeconds: optionsOrTtl }
    : optionsOrTtl ?? {};

  const ttl = opts.ttlSeconds ?? DEFAULT_ACCESS_TTL_SECONDS;
  const payload: Record<string, unknown> = { ...claims };

  if (opts.issueJti) {
    payload['jti'] = globalThis.crypto.randomUUID();
  }

  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: ttl });
}

export interface VerifyOptions {
  readonly blacklist?: ITokenBlacklist;
}

/** Verify + extract claims, or throw if the token is invalid/expired/blacklisted. */
export async function verifyAccessToken(
  token: string,
  secret: string,
  options?: VerifyOptions,
): Promise<AuthClaims> {
  const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (typeof payload === 'string') throw new Error('malformed token payload');
  const { tenantId, userId, role, audience, scopeId, jti } = payload as Record<string, unknown>;
  if (typeof tenantId !== 'string' || typeof userId !== 'string' || typeof role !== 'string') {
    throw new Error('malformed token claims');
  }

  if (options?.blacklist && typeof jti === 'string') {
    if (await options.blacklist.isBlacklisted(jti)) {
      throw new Error('token has been revoked');
    }
  }

  return {
    tenantId,
    userId,
    role,
    audience: typeof audience === 'string' ? audience : undefined,
    scopeId: typeof scopeId === 'string' || scopeId === null ? (scopeId as string | null) : undefined,
    jti: typeof jti === 'string' ? jti : undefined,
  };
}
