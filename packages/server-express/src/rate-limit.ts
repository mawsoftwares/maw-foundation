import type { RequestHandler, Request, Response, NextFunction } from 'express';
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
  readonly keyFn?: (req: Request) => string;
}

function defaultKeyFn(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0]!.trim() : req.ip ?? 'unknown';
  return ip;
}

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions): RequestHandler {
  const { limiter, tiers, defaultTier, keyFn = defaultKeyFn } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const tier = tiers.find((t) => req.path.startsWith(t.prefix));
    const config = tier?.config ?? defaultTier;
    if (!config) {
      next();
      return;
    }

    const key = `${keyFn(req)}:${tier?.prefix ?? 'global'}`;
    const result = await limiter.check(key, config);

    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil((result.retryAfterMs ?? config.windowMs) / 1000));
      res.status(429).json({ error: 'Too many requests', retryAfterMs: result.retryAfterMs });
      return;
    }

    next();
  };
}
