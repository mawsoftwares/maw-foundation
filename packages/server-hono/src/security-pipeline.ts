import type { MiddlewareHandler, ErrorHandler } from 'hono';
import { randomUUID } from 'node:crypto';
import type { IRateLimiter } from '@maw/sdk/contracts/IRateLimiter';
import type { SecurityConfig } from '@maw/sdk/security/SecurityConfig';
import { createSecureHeadersMiddleware } from './secure-headers';
import { createCorsMiddleware } from './cors';
import { createRateLimitMiddleware } from './rate-limit';
import { createSanitizeMiddleware } from './sanitize-input';
import { createCsrfMiddleware } from './csrf';
import { createGlobalErrorHandler } from './error-handler';

export interface SecurityPipelineDeps {
  readonly rateLimiter: IRateLimiter;
  readonly redact?: <T>(obj: T) => T;
  readonly logger?: { error: (message: string, ...args: readonly unknown[]) => void };
}

export interface SecurityPipelineResult {
  readonly middleware: readonly MiddlewareHandler[];
  readonly errorHandler: ErrorHandler;
}

function requestIdMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const id = c.req.header('x-request-id') ?? randomUUID();
    c.set('requestId', id);
    c.header('x-request-id', id);
    await next();
  };
}

export function createSecurityPipeline(
  config: SecurityConfig,
  deps: SecurityPipelineDeps,
): SecurityPipelineResult {
  const middleware: MiddlewareHandler[] = [
    requestIdMiddleware(),
    createSecureHeadersMiddleware(config.headers),
    createCorsMiddleware(config.cors),
    createRateLimitMiddleware({
      limiter: deps.rateLimiter,
      tiers: [
        { prefix: '/auth/login', config: config.rateLimit.login },
        { prefix: '/api/', config: config.rateLimit.api },
      ],
      defaultTier: config.rateLimit.global,
    }),
  ];

  if (config.csrf.enabled) {
    middleware.push(createCsrfMiddleware({
      cookieName: config.csrf.cookieName,
      headerName: config.csrf.headerName,
    }));
  }

  if (config.validation.sanitizeInput) {
    middleware.push(createSanitizeMiddleware());
  }

  const errorHandler = createGlobalErrorHandler({
    redact: deps.redact,
    logger: deps.logger,
  });

  return { middleware, errorHandler };
}
