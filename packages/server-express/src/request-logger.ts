import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Logger } from '@maw/sdk/kernel/logger';
import type { DynamicAuthedRequest } from './index';

export interface RequestLoggerOptions {
  readonly logger: Logger;
  readonly ignorePaths?: readonly string[];
}

export function createRequestLogger(options: RequestLoggerOptions): RequestHandler {
  const { logger, ignorePaths = [] } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (ignorePaths.some((p) => req.path.startsWith(p))) {
      next();
      return;
    }

    const start = Date.now();
    const requestId = req.headers['x-request-id'] as string | undefined;
    const correlationId = req.headers['x-correlation-id'] as string | undefined;

    logger.info('request started', {
      method: req.method,
      path: req.path,
      requestId,
      correlationId,
    });

    const originalEnd = res.end.bind(res);
    res.end = function (...args: Parameters<typeof res.end>) {
      const duration = Date.now() - start;
      const userId = (req as DynamicAuthedRequest).maw?.claims?.userId;

      logger.info('request completed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration,
        requestId,
        correlationId,
        ...(userId !== undefined ? { userId } : {}),
      });

      return originalEnd(...args);
    } as typeof res.end;

    next();
  };
}
