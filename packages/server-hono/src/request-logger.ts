import type { MiddlewareHandler } from 'hono';
import type { Logger } from '@mawsoftwares/sdk/kernel/logger';
import type { AuthClaims } from '@mawsoftwares/auth-core';

export interface RequestLoggerOptions {
  readonly logger: Logger;
  readonly ignorePaths?: readonly string[];
}

export function createRequestLogger(options: RequestLoggerOptions): MiddlewareHandler {
  const { logger, ignorePaths = [] } = options;

  return async (c, next) => {
    if (ignorePaths.some((p) => c.req.path.startsWith(p))) {
      await next();
      return;
    }

    const start = Date.now();
    const requestId = c.req.header('x-request-id');
    const correlationId = c.req.header('x-correlation-id') ?? (c.get('correlationId') as string | undefined);

    logger.info('request started', {
      method: c.req.method,
      path: c.req.path,
      requestId,
      correlationId,
    });

    await next();

    const duration = Date.now() - start;
    const claims = c.get('mawClaims') as AuthClaims | undefined;

    logger.info('request completed', {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: duration,
      requestId,
      correlationId,
      ...(claims?.userId !== undefined ? { userId: claims.userId } : {}),
    });
  };
}
