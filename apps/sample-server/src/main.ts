import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Programmatically load .env file if it exists and we're not in production,
// since start script or deployed environments might not pass --env-file.
if (process.env.NODE_ENV !== 'production') {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    try {
      if (typeof (process as any).loadEnvFile === 'function') {
        (process as any).loadEnvFile(envPath);
      }
    } catch (e) {
      console.warn('Failed to programmatically load .env file:', e);
    }
  }
}

import express from 'express';
import {
  signAccessToken,
  hashToken,
  RefreshTokens,
  DEFAULT_ACCESS_TTL_SECONDS,
  type AuthClaims,
  type IRefreshTokenStore,
  ScryptHasher,
  SessionService,
  EmailVerification,
  RegistrationService,
  PasswordResetService,
  PasswordChangeService,
  OtpService,
  MfaService,
  AuthenticationService,
  type AuthenticateContext,
  type ServerSession,
  type ISessionStore,
  type IEmailVerificationStore,
  type IPasswordResetStore,
  type IOtpSecretStore,
  type ILoginAttemptStore,
  type IMfaChallengeStore,
  AccountPurgeService,
  SocialAuthService,
  type ISocialAccountStore,
  PgSocialAccountStore,
  GoogleAuthProvider,
  GitHubAuthProvider,
} from '@mawsoftwares/auth-core';
import {
  MasterCache,
  syncModules,
  type ISyncStore,
  type ICacheStore,
} from '@mawsoftwares/rbac-core';
import { createDynamicExpressAuth, createFileUploadHandler, createFileRoutes, createSecurityPipeline, createAuthRoutes, handleAuthError, populateRequestContext, createTenantMiddleware, createTenantRoutes, type DynamicAuthedRequest, type UploadedRequest } from '@mawsoftwares/server-express';
import { PgTenantRepository, AlsTenantContextHolder, HeaderTenantResolver } from '@mawsoftwares/tenancy';
import { initializeObservability } from '@mawsoftwares/observability';
import { observabilityContextMiddleware, createRequestLogger as createObsRequestLogger } from '@mawsoftwares/observability/adapters/express';
import { LocalFileStorage, PgFileMetadataStore, validateSecuritySecrets } from '@mawsoftwares/platform/server';
import { AesEncryptionService } from '@mawsoftwares/platform/security/AesEncryptionService';
import { MemoryRateLimiter } from '@mawsoftwares/platform/security/MemoryRateLimiter';
import { redact } from '@mawsoftwares/platform/security/LogRedactor';
import { LoginProtection, MemoryTokenBlacklist } from '@mawsoftwares/auth-core';
import { DEFAULT_SECURITY_CONFIG, parseCorsOrigins } from '@mawsoftwares/sdk/security/SecurityConfig';
import multer from 'multer';
import * as path from 'node:path';
import type { Session } from '@mawsoftwares/sdk/contracts/identity';
import type { IUserRepository, UserRecord } from '@mawsoftwares/sdk/contracts/IUserRepository';
import {
  getEnv,
  getEnvInt,
  getRequiredEnv,
  HttpStatus,
  createHealthChecker,
  createConfigEngine,
  APP_CONFIG_DEFAULTS,
  type ConfigEngine,
} from '@mawsoftwares/sdk';
import { DEMO_TENANT } from './repo';
import { registry } from './modules/index';
import { createReportingService } from './reporting-setup';
import { createReportingRoutes } from './reporting-routes';
import {
  PgAuditStore,
  createAuditMiddleware,
  type IAuditStore,
} from '@mawsoftwares/audit';
import { createCommunication, SmtpNotificationProvider } from '@mawsoftwares/communication';
import { createAuthEmailSender } from './auth-emails';
import {
  QueueService,
  JobRunner,
  WorkerRegistry,
  PgQueueProvider,
} from '@mawsoftwares/queue';
import {
  ExportService,
  InMemoryHistoryStore,
  ExportFormat,
  type ExportDefinition,
  type IExportDataProvider,
} from '@mawsoftwares/import-export';

const obs = initializeObservability();
const log = obs.logger.child('sample-server');

const JWT_SECRET = getEnv('JWT_SECRET', 'dev-only-secret-change-me')!;
const PORT = getEnvInt('PORT', 4000);
const DATABASE_URL = getRequiredEnv('DATABASE_URL');

// ---------------------------------------------------------------------------
// Data layer — Postgres only (auth + users module share the same users table)
// ---------------------------------------------------------------------------

interface DataLayer {
  db: import('@mawsoftwares/database').DrizzleDb;
  syncStore: ISyncStore;
  cacheStore: ICacheStore;
  refreshStore: IRefreshTokenStore;
  auditStore: IAuditStore;
  /** The one user store. Login and every auth service read through this port. */
  userRepository: IUserRepository;
  sessionStore: ISessionStore;
  emailVerificationStore: IEmailVerificationStore;
  passwordResetStore: IPasswordResetStore;
  otpSecretStore: IOtpSecretStore;
  loginAttemptStore: ILoginAttemptStore;
  mfaChallengeStore: IMfaChallengeStore;
  socialAccountStore: ISocialAccountStore;
}

async function buildDataLayer(): Promise<DataLayer> {
  const { createDatabasePool, createDrizzle } = await import('@mawsoftwares/database');
  const pool = await createDatabasePool({ connectionString: DATABASE_URL });
  const db = createDrizzle(pool);
  const { PgSyncStore, PgCacheStore } = await import('./pg-stores');
  const { PgRefreshStore } = await import('./repo-pg');
  const {
    PgUserRepository, PgSessionStore, PgEmailVerificationStore,
    PgPasswordResetStore, PgOtpSecretStore, PgLoginAttemptStore, PgMfaChallengeStore,
  } = await import('./auth-stores-pg');

  log.info('Using Postgres data layer');
  return {
    db,
    syncStore: new PgSyncStore(db),
    cacheStore: new PgCacheStore(db),
    refreshStore: new PgRefreshStore(db),
    auditStore: new PgAuditStore(db),
    userRepository: new PgUserRepository(db),
    sessionStore: new PgSessionStore(db),
    emailVerificationStore: new PgEmailVerificationStore(db),
    passwordResetStore: new PgPasswordResetStore(db),
    otpSecretStore: new PgOtpSecretStore(db),
    loginAttemptStore: new PgLoginAttemptStore(db),
    mfaChallengeStore: new PgMfaChallengeStore(db),
    socialAccountStore: new PgSocialAccountStore(db),
  };
}

const data = await buildDataLayer();

// ---------------------------------------------------------------------------
// Config Engine — multi-level config with precedence
// ---------------------------------------------------------------------------

const config: ConfigEngine = createConfigEngine();

config.loadLayer('environment', {
  nodeEnv: getEnv('NODE_ENV', 'development')!,
  port: PORT,
  databaseUrl: DATABASE_URL ?? '',
  jwtSecret: '[redacted]',
});

config.loadLayer('app', {
  ...(APP_CONFIG_DEFAULTS as unknown as Record<string, string>),
  appName: 'MAW Sample Server',
  appVersion: '0.1.0',
});

log.info('Config engine ready', {
  layers: ['environment', 'app'],
  appName: config.getString('appName'),
  currency: config.getString('defaultCurrency'),
});

// ---------------------------------------------------------------------------
// Step 1: Registry is already populated (see ./modules/index.ts)
// ---------------------------------------------------------------------------

log.info('Registry loaded', { modules: registry.getAll().length, permissions: registry.getAllPermissions().length });

// ---------------------------------------------------------------------------
// Step 2: Sync engine — auto-upsert permissions to the store on boot
// ---------------------------------------------------------------------------

const syncLog = log.child('sync');

await syncModules(data.syncStore, registry, syncLog);

// ---------------------------------------------------------------------------
// Step 3: Master cache — loads roles/permissions, auto-refreshes every 5 min
// ---------------------------------------------------------------------------

const cache = new MasterCache(data.cacheStore, 5 * 60 * 1000, syncLog);
await cache.load();
cache.startAutoRefresh();

log.info('Cache loaded', { roles: cache.getCache()!.roles.length, permissions: cache.getCache()!.permissions.length });

// ---------------------------------------------------------------------------
// Step 4: Tenancy — resolve tenant from request headers
// ---------------------------------------------------------------------------

const tenantRepository = new PgTenantRepository(data.db);
const tenantContextHolder = new AlsTenantContextHolder();
const tenantResolver = new HeaderTenantResolver(tenantRepository);

// ---------------------------------------------------------------------------
// Step 5: Dynamic auth middleware — uses cache for permission checks
// ---------------------------------------------------------------------------

const tokenBlacklist = new MemoryTokenBlacklist();

const auth = createDynamicExpressAuth({
  jwtSecret: JWT_SECRET,
  cache,
  blacklist: tokenBlacklist,
  loadUserContext: async (claims) => {
    const role = cache.getRoleByCode(claims.role);
    return { roleId: role?.id };
  },
});

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

const refreshTokens = new RefreshTokens(data.refreshStore, 60 * 60 * 24 * 30);

// ---------------------------------------------------------------------------
// New auth services (registration, password reset/change, sessions, MFA)
// ---------------------------------------------------------------------------

const hasher = ScryptHasher;
const userRepository = data.userRepository;
const sessionService = new SessionService({
  store: data.sessionStore,
  config: DEFAULT_SECURITY_CONFIG.session,
});

const emailVerification = new EmailVerification({
  store: data.emailVerificationStore,
  ttlSeconds: DEFAULT_SECURITY_CONFIG.registration.emailVerificationTtlSeconds,
});

// ---------------------------------------------------------------------------
// Communication — registers SmtpNotificationProvider if env vars are present
// ---------------------------------------------------------------------------

const smtpHost = getEnv('SMTP_HOST');
const smtpPort = getEnvInt('SMTP_PORT', 587);
const smtpUser = getEnv('SMTP_USER');
const smtpPass = getEnv('SMTP_PASS');
const smtpFrom = getEnv('SMTP_FROM') || getEnv('SMTP_USER') || 'no-reply@example.com';
const hasSmtp = Boolean(smtpHost && smtpUser && smtpPass);

const communication = createCommunication({
  logger: log.child('communication'),
  defaultFromEmail: smtpFrom,
  useConsoleProviders: !hasSmtp,
});

if (hasSmtp && smtpHost && smtpUser && smtpPass) {
  log.info('Registering real SMTP email provider', { host: smtpHost, port: smtpPort });
  communication.registry.register(
    new SmtpNotificationProvider({
      host: smtpHost,
      port: smtpPort,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  );
} else {
  log.warn('SMTP environment variables missing; falling back to Console log provider');
}

const authEmails = createAuthEmailSender({
  emailService: communication.emailService,
  tenantId: DEMO_TENANT,
  webOrigin: getEnv('PUBLIC_WEB_URL', 'http://localhost:5173')!,
  from: smtpFrom,
  logger: log.child('auth-email'),
});

const registrationService = new RegistrationService({
  userRepository,
  hasher,
  passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
  registrationConfig: DEFAULT_SECURITY_CONFIG.registration,
  emailVerification,
  sendVerificationEmail: authEmails.sendVerificationEmail,
});

const passwordResetService = new PasswordResetService({
  userRepository,
  hasher,
  passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
  resetConfig: DEFAULT_SECURITY_CONFIG.passwordReset,
  store: data.passwordResetStore,
  sendResetEmail: authEmails.sendResetEmail,
  sessionService,
  logger: log.child('password-reset'),
});

const passwordChangeService = new PasswordChangeService({
  userRepository,
  hasher,
  passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
});

// TOTP secrets are stored encrypted at rest, so MFA needs a real key in production.
const MFA_ENCRYPTION_KEY = getEnv('MFA_ENCRYPTION_KEY', '0'.repeat(64))!;

validateSecuritySecrets({ jwtSecret: JWT_SECRET, mfaEncryptionKey: MFA_ENCRYPTION_KEY });

const otpService = new OtpService(DEFAULT_SECURITY_CONFIG.otp);
const mfaService = new MfaService({
  otpService,
  store: data.otpSecretStore,
  encryptionService: new AesEncryptionService(MFA_ENCRYPTION_KEY),
  userRepository,
  hasher: {
    hash: async (value) => hasher.hash(value),
    verify: async (value, hash) => hasher.verify(value, hash),
  },
});

const accountPurgeService = new AccountPurgeService({
  userRepository,
  hasher,
  sessionService,
  otpSecretStore: data.otpSecretStore,
});

const socialAuthProviders = new Map<string, import('@mawsoftwares/auth-core').ISocialAuthProvider>();
const googleClientId = getEnv('GOOGLE_CLIENT_ID');
const googleClientSecret = getEnv('GOOGLE_CLIENT_SECRET');
if (googleClientId && googleClientSecret) {
  socialAuthProviders.set('google', new GoogleAuthProvider({ clientId: googleClientId, clientSecret: googleClientSecret }));
}
const githubClientId = getEnv('GITHUB_CLIENT_ID');
const githubClientSecret = getEnv('GITHUB_CLIENT_SECRET');
if (githubClientId && githubClientSecret) {
  socialAuthProviders.set('github', new GitHubAuthProvider({ clientId: githubClientId, clientSecret: githubClientSecret }));
}

const socialAuthService = new SocialAuthService({
  providers: socialAuthProviders,
  socialAccountStore: data.socialAccountStore,
  userRepository,
  hasher,
});

const loginProtection = new LoginProtection(DEFAULT_SECURITY_CONFIG.loginProtection);

const authService = new AuthenticationService({
  userRepository,
  hasher,
  sessionService,
  loginProtection,
  loginAttemptStore: data.loginAttemptStore,
  mfaService,
  mfaChallengeStore: data.mfaChallengeStore,
});

// ---------------------------------------------------------------------------
// Queue — background job processing (Postgres)
// ---------------------------------------------------------------------------

const queueProvider = new PgQueueProvider(data.db);
const queueService = new QueueService({ provider: queueProvider, logger: log.child('queue') });
const workerRegistry = new WorkerRegistry();

workerRegistry.register('audit.cleanup', async (job) => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  log.info('Running audit cleanup', { cutoff, tenantId: job.context.tenantId });
  return { success: true, result: { cutoff } };
});

workerRegistry.register('notification.send', async (job) => {
  const { email: emailAddr, subject, body } = job.data as {
    email: string; subject: string; body: string;
  };
  await communication.emailService.send({
    tenantId: job.context.tenantId,
    email: { to: emailAddr, subject, body },
    metadata: { source: 'queue' },
  });
  return { success: true };
});

const jobRunner = new JobRunner({
  provider: queueProvider,
  registry: workerRegistry,
  options: { pollIntervalMs: 5000 },
  logger: log.child('job-runner'),
});
jobRunner.start();

// ---------------------------------------------------------------------------
// Import/Export — CSV order exports
// ---------------------------------------------------------------------------

const exportHistory = new InMemoryHistoryStore();
const exportService = new ExportService({ history: exportHistory, logger: log.child('export') });

const ordersExportDefinition: ExportDefinition = {
  name: 'orders',
  format: ExportFormat.CSV,
  fields: [
    { name: 'id', label: 'Order ID' },
    { name: 'item', label: 'Item' },
    { name: 'qty', label: 'Quantity' },
    { name: 'status', label: 'Status' },
  ],
};

const ordersExportProvider: IExportDataProvider = {
  async count() { return 2; },
  async fetch() {
    return [
      { id: 'o1', item: 'Widget A', qty: 5, status: 'pending' },
      { id: 'o2', item: 'Widget B', qty: 3, status: 'delivered' },
    ];
  },
};

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const rateLimiter = new MemoryRateLimiter();

function corsAllowedOrigins(): string[] {
  const origins = parseCorsOrigins(
    getEnv('CORS_ORIGINS') ?? 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000',
  );
  // Vite falls through to 5174+ when 5173 is taken; browsers treat that as a new origin.
  if (getEnv('NODE_ENV', 'development') === 'development') {
    for (const extra of ['http://localhost:*', 'http://127.0.0.1:*'] as const) {
      if (!origins.includes(extra)) origins.push(extra);
    }
  }
  return origins;
}

const securityConfig = {
  ...DEFAULT_SECURITY_CONFIG,
  cors: {
    ...DEFAULT_SECURITY_CONFIG.cors,
    allowedOrigins: corsAllowedOrigins(),
  },
  csrf: DEFAULT_SECURITY_CONFIG.csrf,
};

const { middleware: securityMiddleware, errorHandler: securityErrorHandler } = createSecurityPipeline(
  securityConfig,
  { rateLimiter, redact, logger: log },
);

const app = express();
app.use(express.json());
for (const mw of securityMiddleware) app.use(mw);
app.use(observabilityContextMiddleware());
app.use(createObsRequestLogger({ logger: log, ignorePaths: ['/health'] }));
app.use(populateRequestContext());
app.use(createTenantMiddleware({
  resolver: tenantResolver,
  contextHolder: tenantContextHolder,
  logger: log,
  rejectOnMissing: false,
}));

// --- Auth routes ---

/**
 * Turns an authenticated user + server session into the payload this product's clients
 * expect. `AuthenticationService` deliberately stops at the session, because claims,
 * entitlements and the permission matrix are product decisions, not foundation ones.
 */
async function buildLoginResponse(user: UserRecord, session: ServerSession) {
  const claims: AuthClaims = {
    tenantId: user.tenantId, userId: user.id, role: user.role,
    audience: user.audience, scopeId: user.scopeId,
  };
  const accessToken = signAccessToken(claims, JWT_SECRET, { ttlSeconds: DEFAULT_ACCESS_TTL_SECONDS, issueJti: true });
  const refreshToken = await refreshTokens.issue(user.tenantId, user.id);
  await sessionService.updateRefreshTokenHash(session.id, hashToken(refreshToken));

  const role = cache.getRoleByCode(user.role);
  const permissions = role ? await cache.getUserPermissions(role.id) : [];

  return {
    session: {
      userId: user.id, tenantId: user.tenantId, role: user.role,
      accountStatus: user.accountStatus,
      audience: user.audience, entitlements: registry.getAll().map((m) => m.key),
      capabilities: [], rolePermissions: {},
      scopeId: user.scopeId,
    } satisfies Session,
    sessionId: session.id,
    tokens: { accessToken, refreshToken },
    permissions,
    modules: registry.getAll().map((m) => ({ key: m.key, name: m.name, audience: m.audience ?? 'admin' })),
  };
}

function requestContext(req: express.Request): AuthenticateContext {
  const deviceId = req.get('x-device-id');
  return {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    deviceInfo: deviceId !== undefined ? { deviceId, deviceName: req.get('x-device-name') } : undefined,
  };
}

app.post('/auth/login', (req, res) => {
  console.log('--- POST /auth/login START ---', req.body);
  void (async () => {
    try {
      const { email, password, tenantId, rememberMe } = req.body as {
        email?: string; password?: string; tenantId?: string; rememberMe?: boolean;
      };
      if (email === undefined || password === undefined) {
        res.status(HttpStatus.BAD_REQUEST).json({ error: 'email and password are required' });
        return;
      }

      console.log('Calling authService.authenticate...');
      const result = await authService.authenticate({
        tenantId: tenantId ?? DEMO_TENANT,
        email,
        password,
        rememberMe,
        ...requestContext(req),
      });

      if (result.outcome === 'mfa_required') {
        res.status(HttpStatus.OK).json({
          mfaRequired: true,
          challengeToken: result.challengeToken,
          expiresAt: result.expiresAt,
        });
        return;
      }

      res.json(await buildLoginResponse(result.user, result.session));
    } catch (err) {
      handleAuthError(res, err);
    }
  })();
});

/** Second leg of an MFA login: exchange the challenge token for real tokens. */
app.post('/auth/mfa/challenge', (req, res) => {
  void (async () => {
    try {
      const { challengeToken, code } = req.body as { challengeToken?: string; code?: string };
      if (challengeToken === undefined || code === undefined) {
        res.status(HttpStatus.BAD_REQUEST).json({ error: 'challengeToken and code are required' });
        return;
      }
      const result = await authService.completeMfaChallenge(challengeToken, code, requestContext(req));
      res.json(await buildLoginResponse(result.user, result.session));
    } catch (err) {
      handleAuthError(res, err);
    }
  })();
});

app.post('/auth/refresh', (req, res) => {
  void (async () => {
    const { refreshToken } = req.body as { refreshToken?: string };
    const rotated = refreshToken !== undefined ? await refreshTokens.rotate(refreshToken) : null;
    if (rotated === null) { res.status(HttpStatus.UNAUTHORIZED).json({ error: 'invalid refresh token' }); return; }
    const user = await userRepository.findById(rotated.userId);
    if (user === null) { res.status(HttpStatus.UNAUTHORIZED).json({ error: 'unknown user' }); return; }
    const claims: AuthClaims = {
      tenantId: user.tenantId, userId: user.id, role: user.role,
      audience: user.audience, scopeId: user.scopeId,
    };
    const accessToken = signAccessToken(claims, JWT_SECRET, { issueJti: true });
    res.json({ tokens: { accessToken, refreshToken: rotated.token } });
  })();
});

app.post('/auth/logout', (req, res) => {
  void (async () => {
    const { refreshToken, sessionId } = req.body as { refreshToken?: string; sessionId?: string };
    if (refreshToken !== undefined) await refreshTokens.revoke(refreshToken);
    if (sessionId !== undefined) await sessionService.revoke(sessionId);
    res.json({ ok: true });
  })();
});

// --- New auth routes (registration, password, sessions, MFA) ---

app.use('/auth', createAuthRoutes({
  requireAuth: auth.requireAuth,
  registrationService,
  passwordResetService,
  passwordChangeService,
  sessionService,
  mfaService,
  accountPurgeService,
  logger: log,
}));

// --- Social auth routes ---

app.get('/auth/social/:provider', (req, res) => {
  const provider = req.params.provider as string;
  const p = socialAuthProviders.get(provider) as (GoogleAuthProvider | GitHubAuthProvider) | undefined;
  if (!p) { res.status(404).json({ error: `Unknown provider: ${provider}` }); return; }
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/social/${provider}/callback`;
  const state = randomUUID();
  const url = p.getAuthorizationUrl(redirectUri, state);
  res.json({ url, state });
});

app.get('/auth/social/:provider/callback', async (req, res) => {
  try {
    const provider = req.params.provider as string;
    const code = req.query.code as string | undefined;
    const tenantId = (req.query.tenantId as string) ?? DEMO_TENANT;
    if (!code) { res.status(400).json({ error: 'code is required' }); return; }
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/social/${provider}/callback`;
    const result = await socialAuthService.authenticate(provider, code, redirectUri, tenantId);
    const claims: AuthClaims = { userId: result.user.id, tenantId: result.user.tenantId, role: result.user.role, audience: result.user.audience ?? 'admin', scopeId: result.user.scopeId ?? undefined };
    const accessToken = signAccessToken(claims, JWT_SECRET, { ttlSeconds: DEFAULT_ACCESS_TTL_SECONDS, issueJti: true });
    res.json({ accessToken, user: { id: result.user.id, email: result.user.email, role: result.user.role }, isNewUser: result.isNewUser, linkedProviders: result.linkedProviders });
  } catch (err) {
    handleAuthError(res, err);
  }
});

// --- Reporting routes ---

const reportService = createReportingService();
app.use('/reporting', createReportingRoutes(reportService, auth.requireAuth));

// --- Audit trail middleware — auto-logs every authenticated action ---

app.use(createAuditMiddleware({
  store: data.auditStore,
  extractUser: (req) => {
    const maw = (req as DynamicAuthedRequest).maw;
    return maw ? { tenantId: maw.claims.tenantId, userId: maw.claims.userId } : undefined;
  },
  ignorePaths: ['/health', '/auth'],
}) as express.RequestHandler);

// --- Protected resources (dynamic RBAC) ---

app.get('/me', auth.requireAuth, (req, res) => {
  void (async () => {
    const { claims } = (req as DynamicAuthedRequest).maw!;
    const role = cache.getRoleByCode(claims.role);
    const permissions = role ? await cache.getUserPermissions(role.id) : [];
    res.json({
      userId: claims.userId, tenantId: claims.tenantId, role: claims.role,
      audience: claims.audience, permissions,
    });
  })();
});

app.get('/reports', auth.requireAuth, auth.requirePermission('Read_Reports'), (_req, res) => {
  res.json({ report: 'Q3 numbers', rows: [{ label: 'Revenue', value: 128000 }] });
});

app.get('/orders', auth.requireAuth, auth.requirePermission('Read_Orders'), (_req, res) => {
  res.json({ orders: [{ id: 'o1', item: 'Widget A', qty: 5 }, { id: 'o2', item: 'Widget B', qty: 3 }] });
});

app.post('/orders', auth.requireAuth, auth.requirePermission('Create_Orders'), (req, res) => {
  res.json({ created: true, order: req.body });
});

app.get('/inventory', auth.requireAuth, auth.requirePermission('Read_Inventory'), (_req, res) => {
  res.json({ items: [{ sku: 'W-001', name: 'Widget A', stock: 150 }] });
});

app.get('/admin/users', auth.requireAuth, auth.audienceGuard('admin'), auth.requirePermission('Read_Users'), (req, res) => {
  void (async () => {
    const maw = (req as DynamicAuthedRequest).maw!;
    const users = await userRepository.listByTenant(maw.claims.tenantId);
    res.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.name,
        audience: u.audience,
        accountStatus: u.accountStatus,
        emailVerified: u.emailVerified,
        mfaEnabled: u.mfaEnabled,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
    });
  })();
});

app.get('/billing', auth.requireAuth, auth.requirePermission('Read_Billing'), (_req, res) => {
  res.json({ bills: [{ id: 'b1', amount: 4200, status: 'paid' }] });
});

app.post('/billing', auth.requireAuth, auth.requirePermission('Create_Billing'), (req, res) => {
  res.json({ created: true, bill: req.body });
});

// --- Audit Logs module ---

app.get('/audit-logs', auth.requireAuth, auth.audienceGuard('admin'), auth.requirePermission('Read_AuditLogs'), (req, res) => {
  void (async () => {
    const { userId, resource, limit } = req.query as { userId?: string; resource?: string; limit?: string };
    const maw = (req as DynamicAuthedRequest).maw!;
    const logs = await data.auditStore.query({
      tenantId: maw.claims.tenantId,
      userId,
      resource,
      limit: limit !== undefined ? parseInt(limit, 10) : 50,
    });
    res.json({ logs });
  })();
});

app.get('/audit-logs/export', auth.requireAuth, auth.audienceGuard('admin'), auth.requirePermission('Export_AuditLogs'), (req, res) => {
  void (async () => {
    const maw = (req as DynamicAuthedRequest).maw!;
    const logs = await data.auditStore.query({ tenantId: maw.claims.tenantId });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    const header = 'id,timestamp,userId,action,resource,resourceId,statusCode,ip\n';
    const rows = logs.map((l) =>
      `${l.id},${l.timestamp},${l.userId},${l.action},${l.resource},${l.resourceId ?? ''},${(l.details as Record<string, unknown>)?.statusCode ?? ''},${l.ip ?? ''}`
    ).join('\n');
    res.send(header + rows);
  })();
});

// --- File Upload routes ---

const uploadsDir = path.resolve(process.cwd(), 'uploads');
const fileStorage = new LocalFileStorage({
  rootDir: uploadsDir,
  publicUrlPrefix: `${getEnv('PUBLIC_URL', `http://localhost:${PORT}`)}/files`,
});

const multerUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadHandler = createFileUploadHandler({
  storage: fileStorage,
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ['image/*', 'application/pdf', 'text/csv'],
  keyPrefix: 'uploads',
});
const fileRoutes = createFileRoutes(fileStorage);

const fileMetadataStore = new PgFileMetadataStore(data.db);

app.post('/files/upload', auth.requireAuth, multerUpload.array('files', 10), uploadHandler, async (req, res) => {
  const uploaded = (req as UploadedRequest).uploadedFiles ?? [];
  if (fileMetadataStore) {
    const maw = (req as DynamicAuthedRequest).maw;
    for (const f of uploaded) {
      await fileMetadataStore.record({
        tenantId: maw?.claims.tenantId ?? 'unknown',
        storageKey: f.key,
        originalName: f.originalName,
        mimeType: f.mimeType,
        sizeBytes: f.size,
        uploadedBy: maw?.claims.userId,
        url: f.url,
      });
    }
  }
  res.json({ files: uploaded });
});

app.get('/files', auth.requireAuth, fileRoutes.list);
app.get('/files/url/*key', auth.requireAuth, fileRoutes.getUrl);
app.delete('/files/*key', auth.requireAuth, async (req, res, next) => {
  if (fileMetadataStore) {
    const key = Array.isArray(req.params.key) ? req.params.key.join('/') : req.params.key;
    if (key) await fileMetadataStore.softDelete(key);
  }
  fileRoutes.deleteFile(req, res, next);
});

app.use('/files', express.static(uploadsDir));

// --- Info routes ---

app.get('/modules', (_req, res) => {
  res.json({
    modules: registry.getAll().map((m) => ({
      key: m.key,
      name: m.name,
      level: m.level,
      audience: m.audience ?? 'admin',
      status: registry.getStatus(m.key),
      dependencies: registry.getDependencies(m.key),
      permissions: (m.permissions ?? []).map((p) => p.code),
      menus: m.menus ?? [],
      events: (m.events ?? []).map((e) => e.name),
      feature: m.featureSync?.code,
    })),
    initOrder: registry.getInitOrder(),
    menus: registry.getAllMenus(),
    events: registry.getAllEvents(),
  });
});

app.get('/config', (_req, res) => {
  res.json({
    resolved: config.resolve(),
    layers: ['environment', 'app', 'tenant', 'module', 'user'],
  });
});

app.get('/config/:path', (req, res) => {
  const path = req.params.path;
  if (!config.has(path)) {
    res.status(HttpStatus.NOT_FOUND).json({ error: `Config key "${path}" not found` });
    return;
  }
  res.json({ path, value: config.get(path) });
});

// --- API v1 (standard envelope) ---

import { createOrdersRouter } from './modules/orders/routes';
app.use('/api/v1/orders', createOrdersRouter({
  requireAuth: auth.requireAuth,
  requirePermission: (perm) => auth.requirePermission(perm),
}));

// --- Users routes (User module — same Postgres users table as auth) ---
import { createUsersRouter } from './users-routes';
import { AuthSchemaUsersRepository } from './users-from-auth-pg';
import { createRbacRouter } from './rbac-routes';

const usersRepo = new AuthSchemaUsersRepository(data.db);
app.use('/api/v1/users', createUsersRouter(usersRepo, {
  requireAuth: auth.requireAuth,
  requirePermission: (perm) => auth.requirePermission(perm),
}));
app.use('/api/v1/rbac', auth.requireAuth, createRbacRouter(data.db, cache));
app.use('/api/v1/tenants', createTenantRoutes({
  tenantRepository,
  requireAuth: auth.requireAuth,
}));

app.get('/api/v1/roles', auth.requireAuth, (_req, res) => {
  const master = cache.getCache();
  const roles = (master?.roles ?? [])
    .filter((r) => r.isActive && r.code !== 'super_admin')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({ code: r.code, name: r.name, id: r.id }));
  res.json({ data: roles });
});


// --- Masters routes (dynamic master data) ---
import { createMastersRouter } from './modules/masters/routes';
import {
  MasterService,
  PgMasterRepository,
  PgMasterFieldRepository,
  PgMasterValueRepository,
} from '@mawsoftwares/masters';

const masterRepo = new PgMasterRepository(data.db);
const masterFieldRepo = new PgMasterFieldRepository(data.db);
const masterValueRepo = new PgMasterValueRepository(data.db);
const masterService = new MasterService({ db: data.db, masterRepo, fieldRepo: masterFieldRepo, valueRepo: masterValueRepo });

app.use('/api/v1/masters', createMastersRouter({
  service: masterService,
  requireAuth: auth.requireAuth,
  requirePermission: (perm) => auth.requirePermission(perm),
}));

// --- Export routes (import-export package) ---

app.get('/api/v1/orders/export', auth.requireAuth, auth.requirePermission('Read_Orders'), (req, res) => {
  void (async () => {
    const maw = (req as DynamicAuthedRequest).maw!;
    const record = await exportService.createExport(ordersExportDefinition, {
      tenantId: maw.claims.tenantId,
      userId: maw.claims.userId,
    });
    const result = await exportService.processExport(record.id, ordersExportDefinition, ordersExportProvider);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders-export.csv"');
    res.send(result.content);
  })();
});

app.get('/api/v1/exports/:id/status', auth.requireAuth, (req, res) => {
  void (async () => {
    const record = await exportService.getStatus(req.params.id as string);
    res.json({ data: record });
  })();
});

// --- Queue routes (background jobs) ---

app.post('/api/v1/jobs', auth.requireAuth, (req, res) => {
  void (async () => {
    const maw = (req as DynamicAuthedRequest).maw!;
    const { type, data: jobData } = req.body as { type: string; data?: unknown };
    const job = await queueService.enqueue({
      type,
      data: jobData ?? {},
      context: { tenantId: maw.claims.tenantId, userId: maw.claims.userId },
    });
    res.status(HttpStatus.CREATED).json({ data: { jobId: job.id, type: job.type, status: job.status } });
  })();
});

app.get('/api/v1/jobs', auth.requireAuth, (req, res) => {
  void (async () => {
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const jobs = await queueProvider.listJobs(type ?? 'audit.cleanup', status as import('@mawsoftwares/sdk').JobStatusValue | undefined, limit);
    res.json({ data: jobs });
  })();
});

app.get('/api/v1/jobs/:id', auth.requireAuth, (req, res) => {
  void (async () => {
    const job = await queueService.getJob(req.params.id as string);
    if (!job) { res.status(HttpStatus.NOT_FOUND).json({ error: 'Job not found' }); return; }
    res.json({ data: job });
  })();
});

// --- Notification routes ---

app.post('/api/v1/notifications/send', auth.requireAuth, (req, res) => {
  void (async () => {
    const maw = (req as DynamicAuthedRequest).maw!;
    const { channel, email, subject, body } = req.body as {
      channel?: string; email: string; subject: string; body: string;
    };
    await communication.emailService.send({
      tenantId: maw.claims.tenantId,
      email: { to: email, subject, body },
      metadata: { source: 'manual' },
    });
    res.json({ data: { sent: true, channel: channel ?? 'EMAIL', to: email } });
  })();
});

app.get('/api/v1/notifications/in-app', auth.requireAuth, (req, res) => {
  void (async () => {
    const maw = (req as DynamicAuthedRequest).maw!;
    const unreadOnly = req.query.unreadOnly === 'true';
    const notifications = await communication.inAppNotificationService.list(
      maw.claims.userId,
      maw.claims.tenantId,
      { unreadOnly },
    );
    const unreadCount = await communication.inAppNotificationService.unreadCount(
      maw.claims.userId,
      maw.claims.tenantId,
    );
    res.json({ data: { notifications, unreadCount } });
  })();
});

app.get('/api/v1/notifications/channels', auth.requireAuth, (_req, res) => {
  res.json({
    data: [
      { id: 'EMAIL', name: 'Email', enabled: true, description: 'Email notifications via EmailService' },
      { id: 'SMS', name: 'SMS', enabled: true, description: 'SMS notifications via SmsService' },
      { id: 'PUSH', name: 'Push', enabled: false, description: 'Push notifications (not configured)' },
      { id: 'IN_APP', name: 'In-App', enabled: true, description: 'In-app notification center via InAppNotificationService' },
    ],
  });
});

// --- Health check (composable) ---

const health = createHealthChecker();
health.register('cache', () => {
  if (cache.getCache() === null) throw new Error('Cache not loaded');
});
const { drizzleHealthCheck } = await import('@mawsoftwares/database');
health.register('postgres', async () => {
  const result = await drizzleHealthCheck(data.db);
  if (!result.healthy) throw new Error(result.message);
});

app.get('/health', (_req, res) => {
  void (async () => {
    const report = await health.run();
    const statusCode = report.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(statusCode).json({ ...report, mode: 'postgres' });
  })();
});

app.use(securityErrorHandler);

const server = app.listen(PORT, () => {
  log.info(`http://localhost:${PORT} (Postgres)`);
  log.info('Users: superadmin@ / owner Gmail accounts / manager@ / clerk@demo.test (pw: password123)');
  log.info('Try: GET /modules to see all registered modules + permissions');
});

process.on('SIGTERM', () => {
  void jobRunner.stop();
  server.close();
});
