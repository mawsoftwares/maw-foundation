import { randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Double-submit CSRF helpers for the OPTIONAL cookie auth mode (pure-web apps). Token-
 * based (JWT bearer) clients — including React Native — don't need this; cookie clients
 * send the token both as a cookie and an `x-csrf-token` header, and the server checks
 * they match. Ported from Sushmapet `shared/middlewares/csrf.ts`, framework-agnostic.
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/** Constant-time compare of the cookie value and the header value. */
export function csrfTokensMatch(cookieValue: string | undefined, headerValue: string | undefined): boolean {
  if (typeof cookieValue !== 'string' || typeof headerValue !== 'string') return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(headerValue);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Methods that mutate state and therefore require a CSRF check. */
export const UNSAFE_METHODS: readonly string[] = ['POST', 'PUT', 'PATCH', 'DELETE'];
