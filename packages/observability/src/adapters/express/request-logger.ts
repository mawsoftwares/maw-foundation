import { performance } from 'node:perf_hooks';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Logger } from '@mawsoftwares/sdk/kernel/logger';
import { getContext } from '../../context/store.js';
import type { MetricsService } from '../../metrics/types.js';

export interface RequestLoggerOptions {
  logger: Logger;
  ignorePaths?: string[];
  metrics?: MetricsService;
}

export function createRequestLogger(options: RequestLoggerOptions): RequestHandler {
  const { logger, ignorePaths = [], metrics } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (ignorePaths.includes(req.path)) {
      next();
      return;
    }

    const start = performance.now();
    const ctx = getContext();

    logger.info('request.started', {
      method: req.method,
      path: req.path,
      requestId: ctx?.requestId,
      correlationId: ctx?.correlationId,
      userId: ctx?.userId,
      tenantId: ctx?.tenantId,
    });

    res.on('finish', () => {
      const durationMs = Math.round((performance.now() - start) * 100) / 100;

      logger.info('request.completed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
        requestId: ctx?.requestId,
        correlationId: ctx?.correlationId,
        userId: ctx?.userId,
        tenantId: ctx?.tenantId,
      });

      if (metrics) {
        metrics
          .histogram('http.request.duration', [10, 50, 100, 250, 500, 1000, 2500, 5000], {
            method: req.method,
            path: req.route?.path ?? req.path,
            status: String(res.statusCode),
          })
          .observe(durationMs);
      }
    });

    next();
  };
}
