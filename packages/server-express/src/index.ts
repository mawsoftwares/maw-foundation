import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { IFileStorage, StoredFile, UploadRequest } from '@mawsoftwares/sdk/contracts/IFileStorage';
import { sanitizeFilename, getMimeType } from '@mawsoftwares/sdk/kernel/file';
import { verifyAccessToken, csrfTokensMatch, UNSAFE_METHODS, type AuthClaims } from '@mawsoftwares/auth-core';
import {
  resolveEffectiveAccess,
  type RbacConfig,
  type UserAccessContext,
  type EffectiveAccess,
  type AuthzContext,
  type MasterCache,
  checkPermissionDynamic,
} from '@mawsoftwares/rbac-core';
import { HttpStatus } from '@mawsoftwares/sdk';

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
 * Express adapter binding `@mawsoftwares/auth-core` (token verify) + `@mawsoftwares/rbac-core` (the single
 * `resolveEffectiveAccess` resolver) into middleware. Semantics ported from Restaurant OS
 * `requireAuth`/`requirePermission` and Sushmapet `audienceGuard`/`csrf` — but the
 * authorization decision runs through the SAME resolver the client uses.
 */
export function createExpressAuth(options: ExpressAuthOptions): ExpressAuth {
  const requireAuth: RequestHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (token === null) {
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'missing bearer token' });
      return;
    }
    try {
      req.maw = { claims: await verifyAccessToken(token, options.jwtSecret) };
      next();
    } catch {
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'invalid or expired token' });
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
            res.status(HttpStatus.FORBIDDEN).json({ error: 'forbidden', permission });
          }
        })
        .catch(() => res.status(401).json({ error: 'not authenticated' }));
    };

  const audienceGuard =
    (audience: string): RequestHandler =>
    (req: AuthedRequest, res: Response, next: NextFunction) => {
      if (req.maw?.claims.audience !== undefined && req.maw.claims.audience !== audience) {
        res.status(HttpStatus.FORBIDDEN).json({ error: 'wrong audience', expected: audience });
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
      res.status(HttpStatus.FORBIDDEN).json({ error: 'invalid csrf token' });
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

// ---------------------------------------------------------------------------
// File Upload middleware
// ---------------------------------------------------------------------------

export interface FileUploadOptions {
  readonly storage: IFileStorage;
  readonly maxSize?: number;
  readonly allowedTypes?: string[];
  readonly keyPrefix?: string;
  readonly generateKey?: (file: { originalName: string; mimeType: string }) => string;
}

export interface MulterLikeFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadedRequest extends Request {
  uploadedFiles?: StoredFile[];
}

function defaultKeyGenerator(prefix: string, originalName: string): string {
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const safe = sanitizeFilename(originalName);
  return prefix ? `${prefix}/${timestamp}-${rand}-${safe}` : `${timestamp}-${rand}-${safe}`;
}

export function createFileUploadHandler(options: FileUploadOptions): RequestHandler {
  const maxSize = options.maxSize ?? 10 * 1024 * 1024;
  const prefix = options.keyPrefix ?? 'uploads';

  return async (req: UploadedRequest, res: Response, next: NextFunction) => {
    try {
      const files: MulterLikeFile[] = [];

      const raw = req as unknown as Record<string, unknown>;
      if (Array.isArray(raw.files)) {
        files.push(...(raw.files as MulterLikeFile[]));
      } else if (raw.file) {
        files.push(raw.file as MulterLikeFile);
      }

      if (files.length === 0) {
        const contentType = req.headers['content-type'] ?? '';
        if (!contentType.includes('multipart/form-data')) {
          next();
          return;
        }
        res.status(400).json({ error: 'No files provided' });
        return;
      }

      const results: StoredFile[] = [];

      for (const file of files) {
        if (file.size > maxSize) {
          res.status(413).json({
            error: `File too large: ${file.originalname} (${file.size} bytes, max ${maxSize})`,
          });
          return;
        }

        const mimeType = file.mimetype || getMimeType(file.originalname);

        if (options.allowedTypes && options.allowedTypes.length > 0) {
          const allowed = options.allowedTypes.some((t) => {
            if (t.endsWith('/*')) return mimeType.startsWith(t.slice(0, -1));
            return mimeType === t;
          });
          if (!allowed) {
            res.status(415).json({ error: `File type not allowed: ${mimeType}` });
            return;
          }
        }

        const key = options.generateKey
          ? options.generateKey({ originalName: file.originalname, mimeType })
          : defaultKeyGenerator(prefix, file.originalname);

        const uploadReq: UploadRequest = {
          key,
          mimeType,
          size: file.size,
          originalName: file.originalname,
        };

        const stored = await options.storage.put(key, file.buffer, uploadReq);
        results.push(stored);
      }

      req.uploadedFiles = results;
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      res.status(500).json({ error: message });
    }
  };
}

export function createFileRoutes(storage: IFileStorage, opts?: { keyPrefix?: string }): {
  list: RequestHandler;
  getUrl: RequestHandler;
  deleteFile: RequestHandler;
} {
  const prefix = opts?.keyPrefix ?? 'uploads';

  const list: RequestHandler = async (_req: Request, res: Response) => {
    try {
      const result = await storage.list({ prefix });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'List failed' });
    }
  };

  const getUrl: RequestHandler = async (req: Request, res: Response) => {
    const key = readKeyParam(req);
    if (typeof key !== 'string') {
      res.status(400).json({ error: 'Missing key parameter' });
      return;
    }
    try {
      const url = await storage.getUrl(key);
      res.json({ url });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get URL' });
    }
  };

  const deleteFile: RequestHandler = async (req: Request, res: Response) => {
    const key = readKeyParam(req);
    if (typeof key !== 'string') {
      res.status(400).json({ error: 'Missing key parameter' });
      return;
    }
    try {
      await storage.delete(key);
      res.json({ deleted: true, key });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Delete failed' });
    }
  };

  return { list, getUrl, deleteFile };
}

/**
 * Storage keys contain slashes, so they arrive through an Express 5 wildcard
 * (`/files/:key*`), which hands back one array element per path segment.
 */
function readKeyParam(req: Request): string | undefined {
  const param = req.params.key;
  if (Array.isArray(param)) return param.join('/');
  return param ?? (req.query.key as string | undefined);
}

export function createDynamicExpressAuth(options: DynamicExpressAuthOptions): DynamicExpressAuth {
  const requireAuth: RequestHandler = async (req: DynamicAuthedRequest, res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (token === null) {
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'missing bearer token' });
      return;
    }
    try {
      const claims = await verifyAccessToken(token, options.jwtSecret);
      req.maw = { claims };
      next();
    } catch {
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'invalid or expired token' });
    }
  };

  const requirePermission =
    (permission: string): RequestHandler =>
    (req: DynamicAuthedRequest, res: Response, next: NextFunction) => {
      if (req.maw === undefined) {
        res.status(HttpStatus.UNAUTHORIZED).json({ error: 'not authenticated' });
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
          res.status(HttpStatus.FORBIDDEN).json({ error: 'forbidden', permission, reason: result.reason });
        }
      };

      run().catch(() => res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'permission check failed' }));
    };

  const audienceGuard =
    (audience: string): RequestHandler =>
    (req: DynamicAuthedRequest, res: Response, next: NextFunction) => {
      if (req.maw?.claims.audience !== undefined && req.maw.claims.audience !== audience) {
        res.status(HttpStatus.FORBIDDEN).json({ error: 'wrong audience', expected: audience });
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
      res.status(HttpStatus.FORBIDDEN).json({ error: 'invalid csrf token' });
    }
  };

  return { requireAuth, requirePermission, audienceGuard, csrfProtection };
}

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------

export { createRateLimitMiddleware, type RateLimitTierMapping, type RateLimitMiddlewareOptions } from './rate-limit';
export { createSecureHeadersMiddleware } from './secure-headers';
export { createCorsMiddleware } from './cors';
export { createGlobalErrorHandler, type GlobalErrorHandlerOptions } from './error-handler';
export { createSanitizeMiddleware } from './sanitize-input';
export { validateBody, validateQuery, validateParams, type ValidationSchema } from './request-validation';
export {
  createSecurityPipeline,
  type SecurityPipelineDeps,
  type SecurityPipelineResult,
} from './security-pipeline';
export { createAuthRoutes, handleAuthError, type AuthRouteDeps } from './auth-routes';
export {
  populateRequestContext,
  executeController,
  createApiRouter,
  type ApiRouteOptions,
  type ApiRouterOptions,
} from './api-adapter';
export { createRequestLogger, type RequestLoggerOptions } from './request-logger';
export { correlationIdMiddleware } from './correlation-id';
