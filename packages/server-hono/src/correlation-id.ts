import type { MiddlewareHandler } from 'hono';

export function correlationIdMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const correlationId =
      c.req.header('x-correlation-id') ??
      c.req.header('x-request-id') ??
      '';
    c.set('correlationId', correlationId);
    await next();
    if (correlationId) {
      c.header('x-correlation-id', correlationId);
    }
  };
}
