import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import type { ObservabilityContext } from '../../context/types.js';
import { runWithContext } from '../../context/store.js';

export function observabilityContextMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const correlationId =
      c.req.header('x-correlation-id') ??
      c.req.header('x-request-id') ??
      randomUUID();
    const requestId = randomUUID();

    const ctx: ObservabilityContext = {
      requestId,
      correlationId,
      tenantId: c.req.header('x-tenant-id'),
    };

    c.header('x-request-id', requestId);
    c.header('x-correlation-id', correlationId);

    await runWithContext(ctx, () => next());
  };
}
