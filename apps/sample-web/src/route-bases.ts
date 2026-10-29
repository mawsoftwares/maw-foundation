/**
 * Route base per audience. Every page URL of an audience lives under its own prefix, so a different kind of login
 * (e.g. a client portal in maw-hub) gets its own prefix and route table without touching the admin one.
 * This app serves the admin audience; add an entry here (and its own shell) for another.
 */
export const AUDIENCE_BASES = {
  admin: '/admin',
  // client: '/client',
} as const;

export type Audience = keyof typeof AUDIENCE_BASES;

/** Audience this app build serves. */
export const ACTIVE_AUDIENCE: Audience = 'admin';

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

/** Full URL base for an audience: the deploy base (VITE_BASE_PATH) followed by the audience prefix, no trailing slash. */
export function audienceBase(audience: Audience, deployBase: string): string {
  const parts = [trimSlashes(deployBase), trimSlashes(AUDIENCE_BASES[audience])].filter((p) => p !== '');
  return `/${parts.join('/')}`;
}

/** True when `pathname` is the base itself or sits below it. */
export function isUnderBase(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Moves a URL outside the audience base (`/`, `/users`, an old bookmark) under it, keeping query and hash so auth
 * email links (`?verifyToken=`, `?resetToken=`) still work. Run once before the app first renders.
 */
export function redirectIntoBase(audience: Audience, deployBase: string): void {
  const base = audienceBase(audience, deployBase);
  const { pathname, search, hash } = window.location;
  if (isUnderBase(pathname, base)) return;
  const root = `/${trimSlashes(deployBase)}`.replace(/^\/$/, '');
  const rest = root !== '' && isUnderBase(pathname, root) ? pathname.slice(root.length) : pathname;
  window.history.replaceState({}, '', `${base}${rest === '/' ? '' : rest}${search}${hash}`);
}
