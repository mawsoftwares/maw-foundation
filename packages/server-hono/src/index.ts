import type { Context, MiddlewareHandler } from 'hono';
import { verifyAccessToken, type AuthClaims } from '@mawsoftwares/auth-core';
import {
  resolveEffectiveAccess,
  type RbacConfig,
  type UserAccessContext,
  type EffectiveAccess,
  type AuthzContext,
} from '@mawsoftwares/rbac-core';

export interface HonoAuthOptions {
  readonly jwtSecret: string;
  readonly rbac: RbacConfig;
  readonly loadAccessContext: (claims: AuthClaims) => Promise<UserAccessContext>;
}

export interface HonoAuth {
  requireAuth: MiddlewareHandler;
  requirePermission: (
    permission: string,
    context?: (c: Context) => AuthzContext,
  ) => MiddlewareHandler;
  audienceGuard: (audience: string) => MiddlewareHandler;
}

function bearer(c: Context): string | null {
  const header = c.req.header('Authorization');
  if (header === undefined || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/**
 * Hono adapter — identical surface and behavior to `@mawsoftwares/server-express`, over Hono's
 * `Context` instead of Express's `(req,res,next)`. That two frameworks share one auth +
 * RBAC core, with only these thin adapters differing, is the whole point of the
 * "framework-agnostic core + adapters" decision.
 */
export function createHonoAuth(options: HonoAuthOptions): HonoAuth {
  const requireAuth: MiddlewareHandler = async (c, next) => {
    const token = bearer(c);
    if (token === null) return c.json({ error: 'missing bearer token' }, 401);
    try {
      c.set('mawClaims', await verifyAccessToken(token, options.jwtSecret));
      await next();
      return;
    } catch {
      return c.json({ error: 'invalid or expired token' }, 401);
    }
  };

  async function ensureAccess(c: Context): Promise<EffectiveAccess> {
    const cached = c.get('mawAccess') as EffectiveAccess | undefined;
    if (cached !== undefined) return cached;
    const claims = c.get('mawClaims') as AuthClaims | undefined;
    if (claims === undefined) throw new Error('requireAuth must run before authorization');
    const access = resolveEffectiveAccess(await options.loadAccessContext(claims), options.rbac);
    c.set('mawAccess', access);
    return access;
  }

  const requirePermission =
    (permission: string, context?: (c: Context) => AuthzContext): MiddlewareHandler =>
    async (c, next) => {
      let access: EffectiveAccess;
      try {
        access = await ensureAccess(c);
      } catch {
        return c.json({ error: 'not authenticated' }, 401);
      }
      if (!access.can(permission, context?.(c))) {
        return c.json({ error: 'forbidden', permission }, 403);
      }
      await next();
      return;
    };

  const audienceGuard =
    (audience: string): MiddlewareHandler =>
    async (c, next) => {
      const claims = c.get('mawClaims') as AuthClaims | undefined;
      if (claims?.audience !== undefined && claims.audience !== audience) {
        return c.json({ error: 'wrong audience', expected: audience }, 403);
      }
      await next();
      return;
    };

  return { requireAuth, requirePermission, audienceGuard };
}

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------

export { createRateLimitMiddleware, type RateLimitTierMapping, type RateLimitMiddlewareOptions } from './rate-limit';
export { createSecureHeadersMiddleware } from './secure-headers';
export { createCorsMiddleware } from './cors';
export { createGlobalErrorHandler, type GlobalErrorHandlerOptions } from './error-handler';
export { createSanitizeMiddleware } from './sanitize-input';
export { createCsrfMiddleware, type CsrfOptions } from './csrf';
export { validateBody, validateQuery, type ValidationSchema } from './request-validation';
export {
  createSecurityPipeline,
  type SecurityPipelineDeps,
  type SecurityPipelineResult,
} from './security-pipeline';
export {
  populateRequestContext,
  executeController,
  createApiRouter,
  type ApiRouteOptions,
  type ApiRouterOptions,
} from './api-adapter';
export { createRequestLogger, type RequestLoggerOptions } from './request-logger';
export { correlationIdMiddleware } from './correlation-id';
export { createHonoAuthRoutes, handleHonoAuthError, type HonoAuthRouteDeps } from './auth-routes';
export {
  createHonoFileUploadHandler,
  createHonoFileRoutes,
  type HonoFileUploadOptions,
} from './file-upload';
export {
  createHonoDynamicPermission,
  type HonoDynamicAuthOptions,
} from './rbac-middleware';
