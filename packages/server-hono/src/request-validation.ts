import type { MiddlewareHandler } from 'hono';

export interface ValidationSchema {
  readonly parse: (data: unknown) => unknown;
}

export function validateBody(schema: ValidationSchema): MiddlewareHandler {
  return async (c, next) => {
    try {
      const body = await c.req.json();
      schema.parse(body);
      await next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request body';
      return c.json({ error: 'Validation failed', details: message }, 400);
    }
  };
}

export function validateQuery(schema: ValidationSchema): MiddlewareHandler {
  return async (c, next) => {
    try {
      schema.parse(c.req.query());
      await next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid query parameters';
      return c.json({ error: 'Validation failed', details: message }, 400);
    }
  };
}
