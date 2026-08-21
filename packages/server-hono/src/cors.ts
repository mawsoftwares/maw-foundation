import type { MiddlewareHandler } from 'hono';
import type { CorsConfig } from '@maw/sdk/security/SecurityConfig';

export function createCorsMiddleware(config: Partial<CorsConfig> = {}): MiddlewareHandler {
  const {
    allowedOrigins = [],
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'x-csrf-token', 'x-request-id'],
    exposedHeaders = ['x-request-id'],
    credentials = true,
    maxAge = 86400,
  } = config;

  const originsSet = new Set(allowedOrigins);
  const methodsStr = allowedMethods.join(', ');
  const headersStr = allowedHeaders.join(', ');
  const exposedStr = exposedHeaders.join(', ');

  return async (c, next) => {
    const origin = c.req.header('Origin');

    if (origin === undefined) {
      await next();
      return;
    }

    if (originsSet.size > 0 && !originsSet.has(origin)) {
      return c.json({ error: 'Origin not allowed' }, 403);
    }

    c.header('Access-Control-Allow-Origin', origin);
    if (credentials) c.header('Access-Control-Allow-Credentials', 'true');
    if (exposedStr) c.header('Access-Control-Expose-Headers', exposedStr);
    c.header('Vary', 'Origin');

    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Methods', methodsStr);
      c.header('Access-Control-Allow-Headers', headersStr);
      c.header('Access-Control-Max-Age', String(maxAge));
      return c.body(null, 204);
    }

    await next();
  };
}
