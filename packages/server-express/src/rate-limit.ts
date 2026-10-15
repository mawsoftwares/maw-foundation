import type { RequestHandler, Request, Response, NextFunction } from 'express';
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
  readonly keyFn?: (req: Request) => string;
}

/**
 * Keys on `req.ip`, never on the raw X-Forwarded-For header (the client controls that
 * header). Behind a reverse proxy, set Express `trust proxy` so `req.ip` resolves to the
 * address the proxy saw.
 */
function defaultKeyFn(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions): RequestHandler {
  const { limiter, tiers, defaultTier, keyFn = defaultKeyFn } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

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
      const retryAfterMs = result.retryAfterMs ?? config.windowMs;
      res
        .status(429)
        .json(
          ApiResponse.error(
            ErrorCode.RATE_LIMITED,
            'Too many requests. Please try again later.',
            { retryAfterMs },
            req.headers['x-request-id'] as string | undefined,
          ),
        );
      return;
    }

    next();
  };
}
