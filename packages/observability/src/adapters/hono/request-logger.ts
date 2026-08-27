import { performance } from 'node:perf_hooks';
import type { MiddlewareHandler } from 'hono';
import type { Logger } from '@mawsoftwares/sdk/kernel/logger';
import { getContext } from '../../context/store.js';
import type { MetricsService } from '../../metrics/types.js';

export interface RequestLoggerOptions {
  logger: Logger;
  ignorePaths?: string[];
  metrics?: MetricsService;
}

export function createRequestLogger(options: RequestLoggerOptions): MiddlewareHandler {
  const { logger, ignorePaths = [], metrics } = options;

  return async (c, next) => {
    const path = new URL(c.req.url).pathname;
    if (ignorePaths.includes(path)) {
      await next();
      return;
    }

    const start = performance.now();
    const ctx = getContext();

    logger.info('request.started', {
      method: c.req.method,
      path,
      requestId: ctx?.requestId,
      correlationId: ctx?.correlationId,
      userId: ctx?.userId,
      tenantId: ctx?.tenantId,
    });

    await next();

    const durationMs = Math.round((performance.now() - start) * 100) / 100;

    logger.info('request.completed', {
      method: c.req.method,
      path,
      status: c.res.status,
      durationMs,
      requestId: ctx?.requestId,
      correlationId: ctx?.correlationId,
      userId: ctx?.userId,
      tenantId: ctx?.tenantId,
    });

    if (metrics) {
      metrics
        .histogram('http.request.duration', [10, 50, 100, 250, 500, 1000, 2500, 5000], {
          method: c.req.method,
          path,
          status: String(c.res.status),
        })
        .observe(durationMs);
    }
  };
}
