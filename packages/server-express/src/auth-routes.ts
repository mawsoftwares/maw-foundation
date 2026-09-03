import { Router, type Request, type Response } from 'express';
import { AppError, type Logger } from '@mawsoftwares/sdk';
import { AccountLockedError, PasswordPolicyError } from '@mawsoftwares/auth-core';
import type { AuthedRequest } from './index';
import type { RegistrationService } from '@mawsoftwares/auth-core';
import type { PasswordResetService } from '@mawsoftwares/auth-core';
import type { PasswordChangeService } from '@mawsoftwares/auth-core';
import type { SessionService } from '@mawsoftwares/auth-core';
import type { MfaService } from '@mawsoftwares/auth-core';
import type { RequestHandler } from 'express';

export interface AuthRouteDeps {
  readonly requireAuth: RequestHandler;
  readonly registrationService?: RegistrationService;
  readonly passwordResetService?: PasswordResetService;
  readonly passwordChangeService?: PasswordChangeService;
  readonly sessionService?: SessionService;
  readonly mfaService?: MfaService;
  readonly logger?: Logger;
}

export function createAuthRoutes(deps: AuthRouteDeps): Router {
  const router = Router();
  const log = deps.logger;

  if (deps.registrationService) {
    const reg = deps.registrationService;

    router.post('/register', async (req: Request, res: Response) => {
      try {
        const { email, password, tenantId, role, name } = req.body as Record<string, string>;
        if (!email || !password || !tenantId) {
          res.status(400).json({ error: 'email, password, and tenantId are required' });
          return;
        }
        const result = await reg.register({ email, password, tenantId, role, name });
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
        const { tenantId, email } = req.body as { tenantId?: string; email?: string };
        if (!tenantId || !email) {
          res.status(400).json({ error: 'tenantId and email are required' });
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
        await prs.executeReset(token, newPassword);
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
        await pcs.change(userId, currentPassword, newPassword);
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

  return router;
}

export function handleAuthError(res: Response, err: unknown): void {
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
