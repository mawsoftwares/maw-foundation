import { Hono } from 'hono';
import { AppError, type Logger } from '@mawsoftwares/sdk';
import { AccountLockedError, PasswordPolicyError, resolvePassword, PREHASH_HEADER, PrehashRequiredError, PrehashFormatError } from '@mawsoftwares/auth-core';
import type { RegistrationService } from '@mawsoftwares/auth-core';
import type { PasswordResetService } from '@mawsoftwares/auth-core';
import type { PasswordChangeService } from '@mawsoftwares/auth-core';
import type { SessionService } from '@mawsoftwares/auth-core';
import type { MfaService } from '@mawsoftwares/auth-core';
import type { AccountPurgeService } from '@mawsoftwares/auth-core';
import type { AuthClaims } from '@mawsoftwares/auth-core';
import type { MiddlewareHandler, Context } from 'hono';

export interface HonoAuthRouteDeps {
  readonly requireAuth: MiddlewareHandler;
  readonly registrationService?: RegistrationService;
  readonly passwordResetService?: PasswordResetService;
  readonly passwordChangeService?: PasswordChangeService;
  readonly sessionService?: SessionService;
  readonly mfaService?: MfaService;
  readonly accountPurgeService?: AccountPurgeService;
  readonly requirePrehash?: boolean;
  readonly logger?: Logger;
}

function getClaims(c: Context): AuthClaims | undefined {
  return c.get('mawClaims') as AuthClaims | undefined;
}

export function createHonoAuthRoutes(deps: HonoAuthRouteDeps): Hono {
  const app = new Hono();
  const log = deps.logger;
  const requirePrehash = deps.requirePrehash ?? false;

  function resolvePw(c: Context, rawPassword: string): string {
    const header = c.req.header(PREHASH_HEADER);
    return resolvePassword(rawPassword, header, requirePrehash);
  }

  if (deps.registrationService) {
    const reg = deps.registrationService;

    app.post('/register', async (c) => {
      try {
        const { email, password, tenantId, role, name } = await c.req.json<Record<string, string>>();
        if (!email || !password || !tenantId) {
          return c.json({ error: 'email, password, and tenantId are required' }, 400);
        }
        const resolved = resolvePw(c, password);
        const result = await reg.register({ email, password: resolved, tenantId, role, name });
        return c.json({ userId: result.user.id, emailVerificationRequired: !!result.verificationToken }, 201);
      } catch (err) {
        return handleHonoAuthError(c, err);
      }
    });

    app.post('/verify-email', async (c) => {
      try {
        const { token } = await c.req.json<{ token?: string }>();
        if (!token) return c.json({ error: 'token is required' }, 400);
        await reg.verifyEmail(token);
        return c.json({ verified: true });
      } catch (err) {
        return handleHonoAuthError(c, err);
      }
    });
  }

  if (deps.passwordResetService) {
    const prs = deps.passwordResetService;

    app.post('/forgot-password', async (c) => {
      try {
        const { tenantId, email } = await c.req.json<{ tenantId?: string; email?: string }>();
        if (!tenantId || !email) {
          return c.json({ error: 'tenantId and email are required' }, 400);
        }
        if (log) log.info('Forgot-password request received', { tenantId, email });
        await prs.requestReset(tenantId, email);
        if (log) log.info('Forgot-password request completed', { tenantId, email });
        return c.json({ message: 'If an account exists, a reset email has been sent' });
      } catch (err) {
        if (log) log.error('Error requesting password reset', { error: String(err) });
        return c.json({ message: 'If an account exists, a reset email has been sent' });
      }
    });

    app.post('/reset-password', async (c) => {
      try {
        const { token, newPassword } = await c.req.json<{ token?: string; newPassword?: string }>();
        if (!token || !newPassword) {
          return c.json({ error: 'token and newPassword are required' }, 400);
        }
        const resolvedNew = resolvePw(c, newPassword);
        await prs.executeReset(token, resolvedNew);
        return c.json({ reset: true });
      } catch (err) {
        return handleHonoAuthError(c, err);
      }
    });
  }

  if (deps.passwordChangeService) {
    const pcs = deps.passwordChangeService;

    app.post('/change-password', deps.requireAuth, async (c) => {
      try {
        const claims = getClaims(c);
        if (!claims) return c.json({ error: 'not authenticated' }, 401);
        const { currentPassword, newPassword } = await c.req.json<{ currentPassword?: string; newPassword?: string }>();
        if (!currentPassword || !newPassword) {
          return c.json({ error: 'currentPassword and newPassword are required' }, 400);
        }
        const resolvedCurrent = resolvePw(c, currentPassword);
        const resolvedNew = resolvePw(c, newPassword);
        await pcs.change(claims.userId, resolvedCurrent, resolvedNew);
        return c.json({ changed: true });
      } catch (err) {
        return handleHonoAuthError(c, err);
      }
    });
  }

  if (deps.sessionService) {
    const ss = deps.sessionService;

    app.get('/sessions', deps.requireAuth, async (c) => {
      try {
        const claims = getClaims(c);
        if (!claims) return c.json({ error: 'not authenticated' }, 401);
        const sessions = await ss.listForUser(claims.tenantId, claims.userId);
        return c.json({
          sessions: sessions.map((s) => ({
            id: s.id,
            deviceInfo: s.deviceInfo,
            createdAt: s.createdAt,
            lastActiveAt: s.lastActiveAt,
          })),
        });
      } catch (err) {
        return handleHonoAuthError(c, err);
      }
    });

    app.delete('/sessions/:id', deps.requireAuth, async (c) => {
      try {
        const claims = getClaims(c);
        if (!claims) return c.json({ error: 'not authenticated' }, 401);
        const revoked = await ss.revokeOwned(c.req.param('id'), claims.tenantId, claims.userId);
        if (!revoked) return c.json({ error: 'session not found' }, 404);
        return c.json({ revoked: true });
      } catch (err) {
        return handleHonoAuthError(c, err);
      }
    });

    app.delete('/sessions', deps.requireAuth, async (c) => {
      try {
        const claims = getClaims(c);
        if (!claims) return c.json({ error: 'not authenticated' }, 401);
        const currentSessionId = c.req.query('except');
        await ss.revokeAll(claims.tenantId, claims.userId, currentSessionId);
        return c.json({ revokedAll: true });
      } catch (err) {
        return handleHonoAuthError(c, err);
      }
    });
  }

  if (deps.mfaService) {
    const mfa = deps.mfaService;

    app.post('/mfa/enroll', deps.requireAuth, async (c) => {
      try {
        const claims = getClaims(c);
        if (!claims) return c.json({ error: 'not authenticated' }, 401);
        const { accountName } = await c.req.json<{ accountName?: string }>();
        const result = await mfa.enroll(claims.userId, accountName ?? claims.userId);
        return c.json({ secret: result.secret, otpauthUri: result.otpauthUri, backupCodes: result.backupCodes });
      } catch (err) {
        return handleHonoAuthError(c, err);
      }
    });

    app.post('/mfa/verify', deps.requireAuth, async (c) => {
      try {
        const claims = getClaims(c);
        if (!claims) return c.json({ error: 'not authenticated' }, 401);
        const { token } = await c.req.json<{ token?: string }>();
        if (!token) return c.json({ error: 'token is required' }, 400);
        await mfa.activate(claims.userId, token);
        return c.json({ activated: true });
      } catch (err) {
        return handleHonoAuthError(c, err);
      }
    });

    app.post('/mfa/disable', deps.requireAuth, async (c) => {
      try {
        const claims = getClaims(c);
        if (!claims) return c.json({ error: 'not authenticated' }, 401);
        const { token } = await c.req.json<{ token?: string }>();
        if (!token) return c.json({ error: 'token is required' }, 400);
        await mfa.disable(claims.userId, token);
        return c.json({ disabled: true });
      } catch (err) {
        return handleHonoAuthError(c, err);
      }
    });
  }

  if (deps.accountPurgeService) {
    const purge = deps.accountPurgeService;

    app.delete('/account', deps.requireAuth, async (c) => {
      try {
        const claims = getClaims(c);
        if (!claims) return c.json({ error: 'not authenticated' }, 401);
        const { password } = await c.req.json<{ password?: string }>();
        if (!password) {
          return c.json({ error: 'password is required for account deletion' }, 400);
        }
        const resolvedPw = resolvePw(c, password);
        await purge.purge(claims.userId, resolvedPw);
        return c.json({ purged: true });
      } catch (err) {
        return handleHonoAuthError(c, err);
      }
    });
  }

  return app;
}

export function handleHonoAuthError(c: Context, err: unknown): Response {
  if (err instanceof PrehashRequiredError || err instanceof PrehashFormatError) {
    return c.json({ error: err.message, code: err.code }, 400);
  }
  if (err instanceof AppError) {
    return c.json(
      {
        error: err.message,
        code: err.code,
        ...(err instanceof PasswordPolicyError ? { violations: err.violations } : {}),
        ...(err instanceof AccountLockedError && err.retryAfterMs !== undefined
          ? { retryAfterMs: err.retryAfterMs }
          : {}),
      },
      err.statusCode as 400,
    );
  }
  return c.json({ error: 'Internal server error' }, 500);
}
