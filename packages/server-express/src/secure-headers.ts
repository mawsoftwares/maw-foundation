import type { RequestHandler, Request, Response, NextFunction } from 'express';
import type { SecurityHeadersConfig } from '@mawsoftwares/sdk/security/SecurityConfig';

export function createSecureHeadersMiddleware(
  config: Partial<SecurityHeadersConfig> = {},
): RequestHandler {
  const {
    hsts = true,
    hstsMaxAge = 31536000,
    noSniff = true,
    frameOptions = 'DENY',
    referrerPolicy = 'strict-origin-when-cross-origin',
    csp,
    permissionsPolicy,
  } = config;

  return (_req: Request, res: Response, next: NextFunction) => {
    if (noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    if (frameOptions) {
      res.setHeader('X-Frame-Options', frameOptions);
    }
    if (referrerPolicy) {
      res.setHeader('Referrer-Policy', referrerPolicy);
    }
    if (hsts) {
      res.setHeader('Strict-Transport-Security', `max-age=${hstsMaxAge}; includeSubDomains`);
    }
    if (csp) {
      res.setHeader('Content-Security-Policy', csp);
    }
    if (permissionsPolicy) {
      res.setHeader('Permissions-Policy', permissionsPolicy);
    }
    res.removeHeader('X-Powered-By');
    next();
  };
}
