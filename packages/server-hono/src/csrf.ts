import type { MiddlewareHandler } from 'hono';
import { generateCsrfToken, csrfTokensMatch, UNSAFE_METHODS } from '@mawsoftwares/auth-core';

export interface CsrfOptions {
  readonly cookieName?: string;
  readonly headerName?: string;
}

export function createCsrfMiddleware(options: CsrfOptions = {}): MiddlewareHandler {
  const cookieName = options.cookieName ?? 'maw_csrf';
  const headerName = options.headerName ?? 'x-csrf-token';
  const cookieRe = new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`);

  return async (c, next) => {
    const cookieHeader = c.req.header('Cookie') ?? '';
    const existing = cookieRe.exec(cookieHeader)?.[1];

    if (!UNSAFE_METHODS.includes(c.req.method)) {
      if (!existing) {
        const token = generateCsrfToken();
        c.header('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict`);
      }
      await next();
      return;
    }

    // Bearer-only clients (mobile/service) don't send cookies — skip CSRF for them
    if (!existing) {
      await next();
      return;
    }

    const header = c.req.header(headerName);
    if (csrfTokensMatch(existing, header)) {
      await next();
      return;
    }

    return c.json({ error: 'invalid csrf token' }, 403);
  };
}
