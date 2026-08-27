import type { MiddlewareHandler } from 'hono';
import { csrfTokensMatch, UNSAFE_METHODS } from '@mawsoftwares/auth-core';

export interface CsrfOptions {
  readonly cookieName?: string;
  readonly headerName?: string;
}

export function createCsrfMiddleware(options: CsrfOptions = {}): MiddlewareHandler {
  const cookieName = options.cookieName ?? 'maw_csrf';
  const headerName = options.headerName ?? 'x-csrf-token';
  const cookieRe = new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`);

  return async (c, next) => {
    if (!UNSAFE_METHODS.includes(c.req.method)) {
      await next();
      return;
    }

    const cookieHeader = c.req.header('Cookie') ?? '';
    const cookie = cookieRe.exec(cookieHeader)?.[1];
    const header = c.req.header(headerName);

    if (csrfTokensMatch(cookie, header)) {
      await next();
      return;
    }

    return c.json({ error: 'invalid csrf token' }, 403);
  };
}
