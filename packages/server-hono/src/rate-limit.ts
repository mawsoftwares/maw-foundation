import type { MiddlewareHandler } from 'hono';
import type { IRateLimiter } from '@maw/sdk/contracts/IRateLimiter';
import type { RateLimitTier } from '@maw/sdk/security/SecurityConfig';

export interface RateLimitTierMapping {
  readonly prefix: string;
  readonly config: RateLimitTier;
}

export interface RateLimitMiddlewareOptions {
  readonly limiter: IRateLimiter;
  readonly tiers: readonly RateLimitTierMapping[];
  readonly defaultTier?: RateLimitTier;
  readonly keyFn?: (c: { req: { header: (name: string) => string | undefined; path: string } }) => string;
}

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions): MiddlewareHandler {
  const { limiter, tiers, defaultTier, keyFn } = options;

  return async (c, next) => {
    const tier = tiers.find((t) => c.req.path.startsWith(t.prefix));
    const config = tier?.config ?? defaultTier;
    if (!config) {
      await next();
      return;
    }

    const ip = keyFn
      ? keyFn(c)
      : c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const key = `${ip}:${tier?.prefix ?? 'global'}`;
    const result = await limiter.check(key, config);

    c.header('X-RateLimit-Limit', String(config.maxRequests));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      c.header('Retry-After', String(Math.ceil((result.retryAfterMs ?? config.windowMs) / 1000)));
      return c.json({ error: 'Too many requests', retryAfterMs: result.retryAfterMs }, 429);
    }

    await next();
  };
}
