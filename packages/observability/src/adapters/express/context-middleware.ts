import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ObservabilityContext } from '../../context/types.js';
import { runWithContext } from '../../context/store.js';

export function observabilityContextMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ??
      (req.headers['x-request-id'] as string | undefined) ??
      randomUUID();
    const requestId = randomUUID();

    const ctx: ObservabilityContext = {
      requestId,
      correlationId,
      tenantId: (req.headers['x-tenant-id'] as string | undefined),
    };

    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', correlationId);

    runWithContext(ctx, () => next());
  };
}
