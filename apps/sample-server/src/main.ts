import express from 'express';
import {
  signAccessToken,
  hashToken,
  RefreshTokens,
  DEFAULT_ACCESS_TTL_SECONDS,
  type AuthClaims,
  type IRefreshTokenStore,
  ScryptHasher,
  MemorySessionStore,
  SessionService,
  EmailVerification,
  MemoryEmailVerificationStore,
  RegistrationService,
  PasswordResetService,
  MemoryPasswordResetStore,
  PasswordChangeService,
  OtpService,
  MfaService,
  MemoryOtpSecretStore,
  MemoryLoginAttemptStore,
  MemoryMfaChallengeStore,
  AuthenticationService,
  type AuthenticateContext,
  type ServerSession,
  type ISessionStore,
  type IEmailVerificationStore,
  type IPasswordResetStore,
  type IOtpSecretStore,
  type ILoginAttemptStore,
  type IMfaChallengeStore,
} from '@maw/auth-core';
import {
  MasterCache,
  syncModules,
  type ISyncStore,
  type ICacheStore,
} from '@maw/rbac-core';
import { createDynamicExpressAuth, createFileUploadHandler, createFileRoutes, createSecurityPipeline, createAuthRoutes, handleAuthError, correlationIdMiddleware, createRequestLogger, populateRequestContext, type DynamicAuthedRequest, type UploadedRequest } from '@maw/server-express';
import { LocalFileStorage } from '@maw/platform';
import { AesEncryptionService } from '@maw/platform/security/AesEncryptionService';
import { MemoryRateLimiter } from '@maw/platform/security/MemoryRateLimiter';
import { redact } from '@maw/platform/security/LogRedactor';
import { LoginProtection } from '@maw/auth-core';
import { DEFAULT_SECURITY_CONFIG, parseCorsOrigins } from '@maw/sdk/security/SecurityConfig';
import multer from 'multer';
import * as path from 'node:path';
import type { Session } from '@maw/sdk/contracts/identity';
import type { IUserRepository, UserRecord } from '@maw/sdk/contracts/IUserRepository';
import {
  createLogger,
  getEnv,
  getEnvInt,
  HttpStatus,
  createHealthChecker,
  createConfigEngine,
  APP_CONFIG_DEFAULTS,
  type ConfigEngine,
} from '@maw/sdk';
import {
  MemoryRefreshStore,
  MemoryUserRepository,
  DEMO_TENANT,
  USERS,
} from './repo';
import { registry } from './modules/index';
import { MemorySyncStore, MemoryCacheStore } from './dynamic-stores';
import { createReportingService } from './reporting-setup';
import { createReportingRoutes } from './reporting-routes';
import {
  MemoryAuditStore,
  PgAuditStore,
  createAuditMiddleware,
  type IAuditStore,
} from '@maw/audit';
import { createCommunication } from '@maw/communication';
import { NotificationChannel, type NotificationChannelValue } from '@maw/sdk/communication/types';
import {
  QueueService,
  JobRunner,
  WorkerRegistry,
  InMemoryQueueProvider,
} from '@maw/queue';
import {
  ExportService,
  InMemoryHistoryStore,
  ExportFormat,
  type ExportDefinition,
  type IExportDataProvider,
} from '@maw/import-export';

const log = createLogger('sample-server');

const JWT_SECRET = getEnv('JWT_SECRET', 'dev-only-secret-change-me')!;
const PORT = getEnvInt('PORT', 4000);
const DATABASE_URL = getEnv('DATABASE_URL');
const USE_PG = DATABASE_URL !== undefined && DATABASE_URL !== '';

// ---------------------------------------------------------------------------
// Data layer — Postgres or in-memory, selected by DATABASE_URL env var
// ---------------------------------------------------------------------------

interface DataLayer {
  pool?: import('@maw/database').PgTransactionPool;
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
}

const ROLES = [
  { id: 0, code: 'super_admin', name: 'Super Admin', isActive: true as const, sortOrder: -1 },
  { id: 1, code: 'admin', name: 'Admin', isActive: true as const, sortOrder: 0 },
  { id: 2, code: 'manager', name: 'Manager', isActive: true as const, sortOrder: 1 },
  { id: 3, code: 'clerk', name: 'Clerk', isActive: true as const, sortOrder: 2 },
];

async function buildDataLayer(): Promise<DataLayer> {
  if (USE_PG) {
    const { createDatabasePool } = await import('@maw/database');
    const pool = await createDatabasePool({ connectionString: DATABASE_URL! });
    const { PgSyncStore, PgCacheStore } = await import('./pg-stores');
    const { PgRefreshStore } = await import('./repo-pg');
    const {
      PgUserRepository, PgSessionStore, PgEmailVerificationStore,
      PgPasswordResetStore, PgOtpSecretStore, PgLoginAttemptStore, PgMfaChallengeStore,
    } = await import('./auth-stores-pg');

    log.info('Using Postgres data layer');
    return {
      pool,
      syncStore: new PgSyncStore(pool),
      cacheStore: new PgCacheStore(pool),
      refreshStore: new PgRefreshStore(pool),
      auditStore: new PgAuditStore(pool),
      userRepository: new PgUserRepository(pool),
      sessionStore: new PgSessionStore(pool),
      emailVerificationStore: new PgEmailVerificationStore(pool),
      passwordResetStore: new PgPasswordResetStore(pool),
      otpSecretStore: new PgOtpSecretStore(pool),
      loginAttemptStore: new PgLoginAttemptStore(pool),
      mfaChallengeStore: new PgMfaChallengeStore(pool),
    };
  }

  const syncStore = new MemorySyncStore();
  const memoryRolePerms: Record<number, string[]> = {
    0: [],
    1: [],
    2: ['Read_Reports', 'Create_Reports', 'Read_Orders', 'Create_Orders', 'Update_Orders', 'Read_Inventory', 'Create_Billing', 'Read_AuditLogs'],
    3: ['Read_Orders', 'Create_Orders', 'Create_Billing'],
  };
  return {
    syncStore,
    cacheStore: new MemoryCacheStore(syncStore, ROLES, memoryRolePerms),
    refreshStore: new MemoryRefreshStore(),
    auditStore: new MemoryAuditStore(),
    userRepository: new MemoryUserRepository(USERS),
    sessionStore: new MemorySessionStore(),
    emailVerificationStore: new MemoryEmailVerificationStore(),
    passwordResetStore: new MemoryPasswordResetStore(),
    otpSecretStore: new MemoryOtpSecretStore(),
    loginAttemptStore: new MemoryLoginAttemptStore(),
    mfaChallengeStore: new MemoryMfaChallengeStore(),
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
// Step 4: Dynamic auth middleware — uses cache for permission checks
// ---------------------------------------------------------------------------

const auth = createDynamicExpressAuth({
  jwtSecret: JWT_SECRET,
  cache,
  superuserRoles: ['super_admin', 'owner'],
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
// Communication — uses ConsoleNotificationProvider (logs to stdout in dev)
// ---------------------------------------------------------------------------

const communication = createCommunication({ logger: log.child('communication') });

const deliverToken = (kind: string) => async (email: string, token: string): Promise<void> => {
  await communication.service.send({
    channel: NotificationChannel.EMAIL,
    metadata: { tenantId: DEMO_TENANT, source: 'auth' },
    email: { to: email, subject: `${kind} token`, body: `Your ${kind.toLowerCase()} token: ${token}` },
  });
};

const registrationService = new RegistrationService({
  userRepository,
  hasher,
  passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
  registrationConfig: DEFAULT_SECURITY_CONFIG.registration,
  emailVerification,
  sendVerificationEmail: deliverToken('Email verification'),
});

const passwordResetService = new PasswordResetService({
  userRepository,
  hasher,
  passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
  resetConfig: DEFAULT_SECURITY_CONFIG.passwordReset,
  store: data.passwordResetStore,
  sendResetEmail: deliverToken('Password reset'),
  sessionService,
});

const passwordChangeService = new PasswordChangeService({
  userRepository,
  hasher,
  passwordPolicy: DEFAULT_SECURITY_CONFIG.passwordPolicy,
});

// TOTP secrets are stored encrypted at rest, so MFA needs a real key in production.
const MFA_ENCRYPTION_KEY = getEnv('MFA_ENCRYPTION_KEY', '0'.repeat(64))!;
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
// Queue — background job processing (Postgres when USE_PG, else in-memory)
// ---------------------------------------------------------------------------

const queueProvider = await (async () => {
  if (USE_PG) {
    const { PgQueueProvider } = await import('./queue-pg');
    return new PgQueueProvider(data.pool!);
  }
  return new InMemoryQueueProvider();
})();
const queueService = new QueueService({ provider: queueProvider, logger: log.child('queue') });
const workerRegistry = new WorkerRegistry();

workerRegistry.register('audit.cleanup', async (job) => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  log.info('Running audit cleanup', { cutoff, tenantId: job.context.tenantId });
  return { success: true, result: { cutoff } };
});

workerRegistry.register('notification.send', async (job) => {
  const { channel, email: emailAddr, subject, body } = job.data as {
    channel: string; email: string; subject: string; body: string;
  };
  await communication.service.send({
    channel: channel as NotificationChannelValue,
    metadata: { tenantId: job.context.tenantId, source: 'queue' },
    email: { to: emailAddr, subject, body },
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
  csrf: { ...DEFAULT_SECURITY_CONFIG.csrf, enabled: false },
};

const { middleware: securityMiddleware, errorHandler: securityErrorHandler } = createSecurityPipeline(
  securityConfig,
  { rateLimiter, redact, logger: log },
);

const app = express();
app.use(express.json());
for (const mw of securityMiddleware) app.use(mw);
app.use(correlationIdMiddleware());
app.use(createRequestLogger({ logger: log, ignorePaths: ['/health'] }));
app.use(populateRequestContext());

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
  const accessToken = signAccessToken(claims, JWT_SECRET, DEFAULT_ACCESS_TTL_SECONDS);
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
  void (async () => {
    try {
      const { email, password, tenantId, rememberMe } = req.body as {
        email?: string; password?: string; tenantId?: string; rememberMe?: boolean;
      };
      if (email === undefined || password === undefined) {
        res.status(HttpStatus.BAD_REQUEST).json({ error: 'email and password are required' });
        return;
      }

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
    const accessToken = signAccessToken(claims, JWT_SECRET);
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
}));

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

const fileMetadataStore = await (async () => {
  if (USE_PG) {
    const { PgFileMetadataStore } = await import('./file-metadata-pg');
    return new PgFileMetadataStore(data.pool!);
  }
  return null;
})();

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

// --- Users routes (User module) ---
import { createUsersRouter } from './users-routes';
if (data.pool) {
  app.use('/api/v1/users', createUsersRouter(data.pool, auth.requireAuth));
}

// --- Masters routes (dynamic master data) ---
import { createMastersRouter } from './modules/masters/routes';
import {
  MasterService,
  PgMasterRepository,
  PgMasterFieldRepository,
  PgMasterValueRepository,
} from '@maw/masters';

const masterRepo = new PgMasterRepository(data.pool!);
const masterFieldRepo = new PgMasterFieldRepository(data.pool!);
const masterValueRepo = new PgMasterValueRepository(data.pool!);
const masterService = new MasterService({ pool: data.pool!, masterRepo, fieldRepo: masterFieldRepo, valueRepo: masterValueRepo });

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
    const jobs = await queueProvider.listJobs(type ?? 'audit.cleanup', status as import('@maw/sdk').JobStatusValue | undefined, limit);
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
    await communication.service.send({
      channel: (channel ?? 'EMAIL') as NotificationChannelValue,
      metadata: { tenantId: maw.claims.tenantId, source: 'manual' },
      email: { to: email, subject, body },
    });
    res.json({ data: { sent: true, channel: channel ?? 'EMAIL', to: email } });
  })();
});

app.get('/api/v1/notifications/channels', auth.requireAuth, (_req, res) => {
  res.json({
    data: [
      { id: 'EMAIL', name: 'Email', enabled: true, description: 'Email notifications via console provider' },
      { id: 'SMS', name: 'SMS', enabled: false, description: 'SMS notifications (not configured)' },
      { id: 'PUSH', name: 'Push', enabled: false, description: 'Push notifications (not configured)' },
      { id: 'IN_APP', name: 'In-App', enabled: false, description: 'In-app notification center (not configured)' },
    ],
  });
});

// --- Health check (composable) ---

const health = createHealthChecker();
health.register('cache', () => {
  if (cache.getCache() === null) throw new Error('Cache not loaded');
});
if (USE_PG) {
  const { createDatabasePool, poolHealthCheck } = await import('@maw/database');
  const healthPool = await createDatabasePool({ connectionString: DATABASE_URL! });
  health.register('postgres', async () => {
    const result = await poolHealthCheck(healthPool);
    if (!result.healthy) throw new Error(result.message);
  });
}

app.get('/health', (_req, res) => {
  void (async () => {
    const report = await health.run();
    const statusCode = report.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(statusCode).json({ ...report, mode: USE_PG ? 'postgres' : 'memory' });
  })();
});

app.use(securityErrorHandler);

const server = app.listen(PORT, () => {
  log.info(`http://localhost:${PORT} (${USE_PG ? 'Postgres' : 'in-memory'})`);
  log.info('Users: superadmin@ / owner@ / manager@ / clerk@demo.test (pw: password123)');
  log.info('Try: GET /modules to see all registered modules + permissions');
});

process.on('SIGTERM', () => {
  void jobRunner.stop();
  server.close();
});
