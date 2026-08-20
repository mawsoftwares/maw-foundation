import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken, csrfTokensMatch, UNSAFE_METHODS, type AuthClaims } from '@maw/auth-core';
import {
  resolveEffectiveAccess,
  type RbacConfig,
  type UserAccessContext,
  type EffectiveAccess,
  type AuthzContext,
  type MasterCache,
  checkPermissionDynamic,
} from '@maw/rbac-core';

/** What the middleware attaches to the request once authenticated. */
export interface MawAuthState {
  claims: AuthClaims;
  access?: EffectiveAccess;
}

/** A request carrying MAW auth state (set by `requireAuth`). */
export interface AuthedRequest extends Request {
  maw?: MawAuthState;
}

export interface ExpressAuthOptions {
  readonly jwtSecret: string;
  readonly rbac: RbacConfig;
  /**
   * Loads the full access context (enabled modules, tenant matrix, scope) for a set of
   * token claims. The product implements this over its own DB — the adapter stays
   * DB-agnostic. Called at most once per request (result cached on `req.maw`).
   */
  readonly loadAccessContext: (claims: AuthClaims) => Promise<UserAccessContext>;
}

export interface ExpressAuth {
  /** Verify the bearer token and attach claims. 401 if missing/invalid. */
  requireAuth: RequestHandler;
  /** Gate a route on a permission (403 if denied). ABAC context may be derived per-request. */
  requirePermission: (
    permission: string,
    context?: (req: Request) => AuthzContext,
  ) => RequestHandler;
  /** Block sessions issued for a different app/audience (403). Dual-audience gating. */
  audienceGuard: (audience: string) => RequestHandler;
  /** Optional double-submit CSRF check for cookie-mode apps. */
  csrfProtection: RequestHandler;
}

function bearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/**
 * Express adapter binding `@maw/auth-core` (token verify) + `@maw/rbac-core` (the single
 * `resolveEffectiveAccess` resolver) into middleware. Semantics ported from Restaurant OS
 * `requireAuth`/`requirePermission` and Sushmapet `audienceGuard`/`csrf` — but the
 * authorization decision runs through the SAME resolver the client uses.
 */
export function createExpressAuth(options: ExpressAuthOptions): ExpressAuth {
  const requireAuth: RequestHandler = (req: AuthedRequest, res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (token === null) {
      res.status(401).json({ error: 'missing bearer token' });
      return;
    }
    try {
      req.maw = { claims: verifyAccessToken(token, options.jwtSecret) };
      next();
    } catch {
      res.status(401).json({ error: 'invalid or expired token' });
    }
  };

  async function ensureAccess(req: AuthedRequest): Promise<EffectiveAccess> {
    if (req.maw === undefined) throw new Error('requireAuth must run before authorization');
    if (req.maw.access === undefined) {
      const ctx = await options.loadAccessContext(req.maw.claims);
      req.maw.access = resolveEffectiveAccess(ctx, options.rbac);
    }
    return req.maw.access;
  }

  const requirePermission =
    (permission: string, context?: (req: Request) => AuthzContext): RequestHandler =>
    (req: AuthedRequest, res: Response, next: NextFunction) => {
      ensureAccess(req)
        .then((access) => {
          if (access.can(permission, context?.(req))) {
            next();
          } else {
            res.status(403).json({ error: 'forbidden', permission });
          }
        })
        .catch(() => res.status(401).json({ error: 'not authenticated' }));
    };

  const audienceGuard =
    (audience: string): RequestHandler =>
    (req: AuthedRequest, res: Response, next: NextFunction) => {
      if (req.maw?.claims.audience !== undefined && req.maw.claims.audience !== audience) {
        res.status(403).json({ error: 'wrong audience', expected: audience });
        return;
      }
      next();
    };

  const csrfProtection: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    if (!UNSAFE_METHODS.includes(req.method)) {
      next();
      return;
    }
    const cookieHeader = req.headers.cookie ?? '';
    const cookie = /(?:^|;\s*)maw_csrf=([^;]+)/.exec(cookieHeader)?.[1];
    const header = req.headers['x-csrf-token'];
    if (csrfTokensMatch(cookie, typeof header === 'string' ? header : undefined)) {
      next();
    } else {
      res.status(403).json({ error: 'invalid csrf token' });
    }
  };

  return { requireAuth, requirePermission, audienceGuard, csrfProtection };
}

// ---------------------------------------------------------------------------
// Dynamic RBAC adapter — uses MasterCache + DB-backed permissions
// ---------------------------------------------------------------------------

export interface DynamicAuthState {
  claims: AuthClaims;
  roleId?: number;
  permissions?: string[];
}

export interface DynamicAuthedRequest extends Request {
  maw?: DynamicAuthState;
}

export interface DynamicExpressAuthOptions {
  readonly jwtSecret: string;
  readonly cache: MasterCache;
  readonly superuserRoles?: readonly string[];
  readonly loadUserContext?: (claims: AuthClaims) => Promise<{ roleId?: number; permissions?: string[] }>;
}

export interface DynamicExpressAuth {
  requireAuth: RequestHandler;
  requirePermission: (permission: string) => RequestHandler;
  audienceGuard: (audience: string) => RequestHandler;
  csrfProtection: RequestHandler;
}

export function createDynamicExpressAuth(options: DynamicExpressAuthOptions): DynamicExpressAuth {
  const requireAuth: RequestHandler = (req: DynamicAuthedRequest, res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (token === null) {
      res.status(401).json({ error: 'missing bearer token' });
      return;
    }
    try {
      const claims = verifyAccessToken(token, options.jwtSecret);
      req.maw = { claims };
      next();
    } catch {
      res.status(401).json({ error: 'invalid or expired token' });
    }
  };

  const requirePermission =
    (permission: string): RequestHandler =>
    (req: DynamicAuthedRequest, res: Response, next: NextFunction) => {
      if (req.maw === undefined) {
        res.status(401).json({ error: 'not authenticated' });
        return;
      }

      const maw = req.maw;
      const run = async () => {
        if (options.loadUserContext !== undefined && maw.roleId === undefined) {
          const ctx = await options.loadUserContext(maw.claims);
          maw.roleId = ctx.roleId;
          maw.permissions = ctx.permissions;
        }

        // Superuser bypass via static config
        if (options.superuserRoles?.includes(maw.claims.role)) {
          next();
          return;
        }

        const result = await checkPermissionDynamic(
          { userId: maw.claims.userId, roleId: maw.roleId, permissions: maw.permissions },
          permission,
          options.cache,
        );

        if (result.granted) {
          next();
        } else {
          res.status(403).json({ error: 'forbidden', permission, reason: result.reason });
        }
      };

      run().catch(() => res.status(500).json({ error: 'permission check failed' }));
    };

  const audienceGuard =
    (audience: string): RequestHandler =>
    (req: DynamicAuthedRequest, res: Response, next: NextFunction) => {
      if (req.maw?.claims.audience !== undefined && req.maw.claims.audience !== audience) {
        res.status(403).json({ error: 'wrong audience', expected: audience });
        return;
      }
      next();
    };

  const csrfProtection: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    if (!UNSAFE_METHODS.includes(req.method)) {
      next();
      return;
    }
    const cookieHeader = req.headers.cookie ?? '';
    const cookie = /(?:^|;\s*)maw_csrf=([^;]+)/.exec(cookieHeader)?.[1];
    const header = req.headers['x-csrf-token'];
    if (csrfTokensMatch(cookie, typeof header === 'string' ? header : undefined)) {
      next();
    } else {
      res.status(403).json({ error: 'invalid csrf token' });
    }
  };

  return { requireAuth, requirePermission, audienceGuard, csrfProtection };
}
