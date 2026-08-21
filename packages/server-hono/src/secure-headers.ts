import type { MiddlewareHandler } from 'hono';
import type { SecurityHeadersConfig } from '@maw/sdk/security/SecurityConfig';

export function createSecureHeadersMiddleware(
  config: Partial<SecurityHeadersConfig> = {},
): MiddlewareHandler {
  const {
    hsts = true,
    hstsMaxAge = 31536000,
    noSniff = true,
    frameOptions = 'DENY',
    referrerPolicy = 'strict-origin-when-cross-origin',
    csp,
    permissionsPolicy,
  } = config;

  return async (c, next) => {
    if (noSniff) c.header('X-Content-Type-Options', 'nosniff');
    if (frameOptions) c.header('X-Frame-Options', frameOptions);
    if (referrerPolicy) c.header('Referrer-Policy', referrerPolicy);
    if (hsts) c.header('Strict-Transport-Security', `max-age=${hstsMaxAge}; includeSubDomains`);
    if (csp) c.header('Content-Security-Policy', csp);
    if (permissionsPolicy) c.header('Permissions-Policy', permissionsPolicy);
    await next();
  };
}
