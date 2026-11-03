import { Router, type Request, type Response } from 'express';
import { AppError, type Logger } from '@mawsoftwares/sdk';
import { AccountLockedError, PasswordPolicyError, resolvePassword, PREHASH_HEADER, PrehashRequiredError, PrehashFormatError } from '@mawsoftwares/auth-core';
import type { AuthedRequest } from './index';
import type { RegistrationService } from '@mawsoftwares/auth-core';
import type { PasswordResetService } from '@mawsoftwares/auth-core';
import type { PasswordChangeService } from '@mawsoftwares/auth-core';
import type { SessionService } from '@mawsoftwares/auth-core';
import type { MfaService } from '@mawsoftwares/auth-core';
import type { AccountPurgeService } from '@mawsoftwares/auth-core';
import type { RequestHandler } from 'express';
import type { ITenantResolver } from '@mawsoftwares/tenancy';

export interface AuthRouteDeps {
  readonly requireAuth: RequestHandler;
  readonly registrationService?: Pick<RegistrationService, 'register' | 'verifyEmail'>;
  readonly passwordResetService?: Pick<PasswordResetService, 'requestReset' | 'executeReset'>;
  readonly passwordChangeService?: PasswordChangeService;
  readonly sessionService?: SessionService;
  readonly mfaService?: MfaService;
  readonly accountPurgeService?: AccountPurgeService;
  readonly requirePrehash?: boolean;
  readonly logger?: Logger;
  /**
   * Decides the tenant of the public endpoints (`/register`, `/forgot-password`) from the server side.
   * When set, a `tenantId` in the request body is never used to pick a tenant: it may be omitted, and if
   * present it must equal the resolved tenant or the request is rejected (400 `FORBIDDEN_FIELD`).
   * **Strongly recommended.** Without it the legacy behaviour applies (the caller names its own tenant)
   * and a warning is logged once; that is only acceptable for a single-tenant demo.
   */
  readonly tenantResolver?: ITenantResolver;
}

const FORBIDDEN_FIELD = 'FORBIDDEN_FIELD';

function forbiddenField(res: Response, message: string): void {
  res.status(400).json({ error: { code: FORBIDDEN_FIELD, message } });
}

export function createAuthRoutes(deps: AuthRouteDeps): Router {
  const router = Router();
  const log = deps.logger;
  const requirePrehash = deps.requirePrehash ?? false;
  let warnedClientTenant = false;

  /**
   * Tenant for a public (unauthenticated) endpoint. With a resolver the server decides and a conflicting
   * body value is rejected; without one the legacy body value is used (warned once). Responds and returns
   * null when the request must stop.
   */
  async function publicTenant(req: Request, res: Response, bodyTenantId: unknown): Promise<string | null> {
    if (deps.tenantResolver === undefined) {
      if (!warnedClientTenant) {
        warnedClientTenant = true;
        const message = 'createAuthRoutes has no tenantResolver: public endpoints trust a client-supplied tenantId. Pass tenantResolver.';
        if (log) log.warn(message); else console.warn(`[auth-routes] ${message}`);
      }
      return typeof bodyTenantId === 'string' && bodyTenantId !== '' ? bodyTenantId : null;
    }
    const resolved = await deps.tenantResolver.resolve({ hostname: req.hostname });
    if (resolved === null) {
      res.status(403).json({ error: { code: 'TENANT_NOT_RESOLVED', message: 'Tenant could not be resolved' } });
      return null;
    }
    if (resolved.tenantStatus !== undefined && resolved.tenantStatus !== 'active') {
      res.status(403).json({ error: { code: 'TENANT_INACTIVE', message: 'Tenant is not active' } });
      return null;
    }
    if (bodyTenantId !== undefined && bodyTenantId !== resolved.tenantId) {
      forbiddenField(res, 'tenantId cannot be supplied by the client');
      return null;
    }
    return resolved.tenantId;
  }

  function resolvePw(req: Request, rawPassword: string): string {
    const header = req.headers[PREHASH_HEADER] as string | undefined;
    return resolvePassword(rawPassword, header, requirePrehash);
  }

  if (deps.registrationService) {
    const reg = deps.registrationService;

    router.post('/register', async (req: Request, res: Response) => {
      try {
        const { email, password, tenantId: bodyTenantId, role, name } = req.body as Record<string, string>;
        // Authority is never self-assigned: a public caller cannot pick a role (it used to be passed straight
        // through, so anyone could register as super_admin). Roles are assigned by the service's default
        // or by an administrator through the users API.
        if (role !== undefined) {
          forbiddenField(res, 'role cannot be supplied by the client');
          return;
        }
        if (!email || !password) {
          res.status(400).json({ error: 'email and password are required' });
          return;
        }
        const tenantId = await publicTenant(req, res, bodyTenantId);
        if (res.headersSent) return;
        if (tenantId === null) {
          res.status(400).json({ error: 'tenantId is required' });
          return;
        }
        const resolved = resolvePw(req, password);
        const result = await reg.register({ email, password: resolved, tenantId, name });
        res.status(201).json({ userId: result.user.id, emailVerificationRequired: !!result.verificationToken });
      } catch (err) {
        handleAuthError(res, err);
      }
    });

    router.post('/verify-email', async (req: Request, res: Response) => {
      try {
        const { token } = req.body as { token?: string };
        if (!token) {
          res.status(400).json({ error: 'token is required' });
          return;
        }
        await reg.verifyEmail(token);
        res.json({ verified: true });
      } catch (err) {
        handleAuthError(res, err);
      }
    });
  }

  if (deps.passwordResetService) {
    const prs = deps.passwordResetService;

    router.post('/forgot-password', async (req: Request, res: Response) => {
      try {
        const { tenantId: bodyTenantId, email } = req.body as { tenantId?: string; email?: string };
        if (!email) {
          res.status(400).json({ error: 'email is required' });
          return;
        }
        const tenantId = await publicTenant(req, res, bodyTenantId);
        if (res.headersSent) return;
        if (tenantId === null) {
          res.status(400).json({ error: 'tenantId is required' });
          return;
        }
        if (log) log.info('Forgot-password request received', { tenantId, email });
        await prs.requestReset(tenantId, email);
        if (log) log.info('Forgot-password request completed', { tenantId, email });
        res.json({ message: 'If an account exists, a reset email has been sent' });
      } catch (err) {
        if (log) log.error('Error requesting password reset', { error: String(err), stack: (err as Error).stack });
        else console.error('[forgot-password] Error requesting password reset:', err);
        res.json({ message: 'If an account exists, a reset email has been sent' });
      }
    });

    router.post('/reset-password', async (req: Request, res: Response) => {
      try {
        const { token, newPassword } = req.body as { token?: string; newPassword?: string };
        if (!token || !newPassword) {
          res.status(400).json({ error: 'token and newPassword are required' });
          return;
        }
        const resolvedNew = resolvePw(req, newPassword);
        await prs.executeReset(token, resolvedNew);
        res.json({ reset: true });
      } catch (err) {
        handleAuthError(res, err);
      }
    });
  }

  if (deps.passwordChangeService) {
    const pcs = deps.passwordChangeService;

    router.post('/change-password', deps.requireAuth, async (req: Request, res: Response) => {
      try {
        const authed = req as AuthedRequest;
        const userId = authed.maw?.claims.userId;
        if (!userId) {
          res.status(401).json({ error: 'not authenticated' });
          return;
        }
        const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
        if (!currentPassword || !newPassword) {
          res.status(400).json({ error: 'currentPassword and newPassword are required' });
          return;
        }
        const resolvedCurrent = resolvePw(req, currentPassword);
        const resolvedNew = resolvePw(req, newPassword);
        await pcs.change(userId, resolvedCurrent, resolvedNew);
        res.json({ changed: true });
      } catch (err) {
        handleAuthError(res, err);
      }
    });
  }

  if (deps.sessionService) {
    const ss = deps.sessionService;

    router.get('/sessions', deps.requireAuth, async (req: Request, res: Response) => {
      try {
        const authed = req as AuthedRequest;
        const claims = authed.maw?.claims;
        if (!claims) {
          res.status(401).json({ error: 'not authenticated' });
          return;
        }
        const sessions = await ss.listForUser(claims.tenantId, claims.userId);
        res.json({ sessions: sessions.map((s) => ({ id: s.id, deviceInfo: s.deviceInfo, createdAt: s.createdAt, lastActiveAt: s.lastActiveAt })) });
      } catch (err) {
        handleAuthError(res, err);
      }
    });

    router.delete('/sessions/:id', deps.requireAuth, async (req: Request, res: Response) => {
      try {
        const authed = req as AuthedRequest;
        const claims = authed.maw?.claims;
        if (!claims) {
          res.status(401).json({ error: 'not authenticated' });
          return;
        }
        const revoked = await ss.revokeOwned(req.params.id as string, claims.tenantId, claims.userId);
        if (!revoked) {
          res.status(404).json({ error: 'session not found' });
          return;
        }
        res.json({ revoked: true });
      } catch (err) {
        handleAuthError(res, err);
      }
    });

    router.delete('/sessions', deps.requireAuth, async (req: Request, res: Response) => {
      try {
        const authed = req as AuthedRequest;
        const claims = authed.maw?.claims;
        if (!claims) {
          res.status(401).json({ error: 'not authenticated' });
          return;
        }
        const currentSessionId = (req.query.except as string) ?? undefined;
        await ss.revokeAll(claims.tenantId, claims.userId, currentSessionId);
        res.json({ revokedAll: true });
      } catch (err) {
        handleAuthError(res, err);
      }
    });
  }

  if (deps.mfaService) {
    const mfa = deps.mfaService;

    router.post('/mfa/enroll', deps.requireAuth, async (req: Request, res: Response) => {
      try {
        const authed = req as AuthedRequest;
        const userId = authed.maw?.claims.userId;
        if (!userId) {
          res.status(401).json({ error: 'not authenticated' });
          return;
        }
        const { accountName } = (req.body ?? {}) as { accountName?: string };
        const result = await mfa.enroll(userId, accountName ?? userId);
        res.json({ secret: result.secret, otpauthUri: result.otpauthUri, backupCodes: result.backupCodes });
      } catch (err) {
        handleAuthError(res, err);
      }
    });

    router.post('/mfa/verify', deps.requireAuth, async (req: Request, res: Response) => {
      try {
        const authed = req as AuthedRequest;
        const userId = authed.maw?.claims.userId;
        if (!userId) {
          res.status(401).json({ error: 'not authenticated' });
          return;
        }
        const { token } = req.body as { token?: string };
        if (!token) {
          res.status(400).json({ error: 'token is required' });
          return;
        }
        await mfa.activate(userId, token);
        res.json({ activated: true });
      } catch (err) {
        handleAuthError(res, err);
      }
    });

    router.post('/mfa/disable', deps.requireAuth, async (req: Request, res: Response) => {
      try {
        const authed = req as AuthedRequest;
        const userId = authed.maw?.claims.userId;
        if (!userId) {
          res.status(401).json({ error: 'not authenticated' });
          return;
        }
        const { token } = req.body as { token?: string };
        if (!token) {
          res.status(400).json({ error: 'token is required' });
          return;
        }
        await mfa.disable(userId, token);
        res.json({ disabled: true });
      } catch (err) {
        handleAuthError(res, err);
      }
    });
  }

  if (deps.accountPurgeService) {
    const purge = deps.accountPurgeService;

    router.delete('/account', deps.requireAuth, async (req: Request, res: Response) => {
      try {
        const authed = req as AuthedRequest;
        const userId = authed.maw?.claims.userId;
        if (!userId) {
          res.status(401).json({ error: 'not authenticated' });
          return;
        }
        const { password } = req.body as { password?: string };
        if (!password) {
          res.status(400).json({ error: 'password is required for account deletion' });
          return;
        }
        const resolvedPw = resolvePw(req, password);
        await purge.purge(userId, resolvedPw);
        res.json({ purged: true });
      } catch (err) {
        handleAuthError(res, err);
      }
    });
  }

  return router;
}

export function handleAuthError(res: Response, err: unknown): void {
  if (err instanceof PrehashRequiredError || err instanceof PrehashFormatError) {
    res.status(400).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err instanceof PasswordPolicyError ? { violations: err.violations } : {}),
      ...(err instanceof AccountLockedError && err.retryAfterMs !== undefined
        ? { retryAfterMs: err.retryAfterMs }
        : {}),
    });
    return;
  }
  const duck = err as Record<string, unknown>;
  if (duck && typeof duck.statusCode === 'number' && typeof duck.message === 'string') {
    res.status(duck.statusCode).json({ error: duck.message, ...(duck.code ? { code: duck.code } : {}) });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
}
