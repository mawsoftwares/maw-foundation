import type { RequestHandler, Request, Response, NextFunction } from 'express';
import { isOriginAllowed, type CorsConfig } from '@mawsoftwares/sdk/security/SecurityConfig';

export function createCorsMiddleware(config: Partial<CorsConfig> = {}): RequestHandler {
  const {
    allowedOrigins = [],
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'x-csrf-token', 'x-request-id'],
    exposedHeaders = ['x-request-id'],
    credentials = true,
    maxAge = 86400,
  } = config;

  const methodsStr = allowedMethods.join(', ');
  const headersStr = allowedHeaders.join(', ');
  const exposedStr = exposedHeaders.join(', ');

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin === undefined) {
      next();
      return;
    }

    if (!isOriginAllowed(origin, allowedOrigins)) {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (exposedStr) {
      res.setHeader('Access-Control-Expose-Headers', exposedStr);
    }
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', methodsStr);
      res.setHeader('Access-Control-Allow-Headers', headersStr);
      res.setHeader('Access-Control-Max-Age', maxAge);
      res.status(204).end();
      return;
    }

    next();
  };
}
