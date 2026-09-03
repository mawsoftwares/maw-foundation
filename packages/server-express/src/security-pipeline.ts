import type { RequestHandler, ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type { IRateLimiter } from '@mawsoftwares/sdk/contracts/IRateLimiter';
import type { SecurityConfig } from '@mawsoftwares/sdk/security/SecurityConfig';
import { generateCsrfToken, csrfTokensMatch, UNSAFE_METHODS } from '@mawsoftwares/auth-core';
import { createSecureHeadersMiddleware } from './secure-headers';
import { createCorsMiddleware } from './cors';
import { createRateLimitMiddleware } from './rate-limit';
import { createSanitizeMiddleware } from './sanitize-input';
import { createGlobalErrorHandler } from './error-handler';

export interface SecurityPipelineDeps {
  readonly rateLimiter: IRateLimiter;
  readonly redact?: <T>(obj: T) => T;
  readonly logger?: { error: (message: string, context?: Record<string, unknown>) => void };
}

export interface SecurityPipelineResult {
  readonly middleware: readonly RequestHandler[];
  readonly errorHandler: ErrorRequestHandler;
}

function requestIdMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
  };
}

export function createSecurityPipeline(
  config: SecurityConfig,
  deps: SecurityPipelineDeps,
): SecurityPipelineResult {
  const middleware: RequestHandler[] = [
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
    middleware.push(createCsrfPipelineMiddleware(config.csrf.cookieName, config.csrf.headerName));
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

function createCsrfPipelineMiddleware(cookieName: string, headerName: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const cookieHeader = req.headers.cookie ?? '';
    const cookieRe = new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`);
    const existing = cookieRe.exec(cookieHeader)?.[1];

    if (!UNSAFE_METHODS.includes(req.method)) {
      if (!existing) {
        const token = generateCsrfToken();
        res.setHeader('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict`);
      }
      next();
      return;
    }

    // Bearer-only clients (mobile/service) don't send cookies — skip CSRF for them
    if (!existing) {
      next();
      return;
    }

    const header = req.headers[headerName];
    if (csrfTokensMatch(existing, typeof header === 'string' ? header : undefined)) {
      next();
    } else {
      res.status(403).json({ error: 'invalid csrf token' });
    }
  };
}
