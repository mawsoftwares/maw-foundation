import type { MiddlewareHandler } from 'hono';
import type { IRateLimiter } from '@mawsoftwares/sdk/contracts/IRateLimiter';
import type { RateLimitTier } from '@mawsoftwares/sdk/security/SecurityConfig';
import { ErrorCode } from '@mawsoftwares/sdk/kernel/errors';
import { ApiResponse } from '@mawsoftwares/api';

export interface RateLimitTierMapping {
  readonly prefix: string;
  readonly config: RateLimitTier;
}

export interface RateLimitMiddlewareOptions {
  readonly limiter: IRateLimiter;
  readonly tiers: readonly RateLimitTierMapping[];
  readonly defaultTier?: RateLimitTier;
  readonly keyFn?: (c: { req: { header: (name: string) => string | undefined; path: string } }) => string;
  /**
   * Reverse proxies in front of the app that append to X-Forwarded-For (default 1).
   * The client IP is taken that many entries from the right, because everything to the
   * left is client-supplied and spoofable.
   */
  readonly trustedProxyHops?: number;
}

function clientIpFromForwardedFor(header: string | undefined, hops: number): string {
  const entries = header?.split(',').map((e) => e.trim()).filter(Boolean) ?? [];
  if (entries.length === 0) return 'unknown';
  return entries[Math.max(entries.length - Math.max(hops, 1), 0)]!;
}

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions): MiddlewareHandler {
  const { limiter, tiers, defaultTier, keyFn, trustedProxyHops = 1 } = options;

  return async (c, next) => {
    if (c.req.method === 'OPTIONS') {
      await next();
      return;
    }

    const tier = tiers.find((t) => c.req.path.startsWith(t.prefix));
    const config = tier?.config ?? defaultTier;
    if (!config) {
      await next();
      return;
    }

    const ip = keyFn ? keyFn(c) : clientIpFromForwardedFor(c.req.header('x-forwarded-for'), trustedProxyHops);
    const key = `${ip}:${tier?.prefix ?? 'global'}`;
    const result = await limiter.check(key, config);

    c.header('X-RateLimit-Limit', String(config.maxRequests));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      c.header('Retry-After', String(Math.ceil((result.retryAfterMs ?? config.windowMs) / 1000)));
      return c.json(
        ApiResponse.error(
          ErrorCode.RATE_LIMITED,
          'Too many requests. Please try again later.',
          { retryAfterMs: result.retryAfterMs ?? config.windowMs },
          c.req.header('x-request-id'),
        ),
        429,
      );
    }

    await next();
  };
}
