import express from 'express';
import {
  signAccessToken,
  verifyPassword,
  RefreshTokens,
  DEFAULT_ACCESS_TTL_SECONDS,
  type AuthClaims,
  type IRefreshTokenStore,
} from '@maw/auth-core';
import {
  MasterCache,
  syncModules,
  type ISyncStore,
  type ICacheStore,
} from '@maw/rbac-core';
import { createDynamicExpressAuth, type DynamicAuthedRequest } from '@maw/server-express';
import type { Session } from '@maw/sdk/contracts/identity';
import {
  MemoryRefreshStore,
  findUserByEmail,
  findUserById,
  type UserRow,
} from './repo';
import { registry } from './modules/index';
import { MemorySyncStore, MemoryCacheStore } from './dynamic-stores';
import { recordAudit as recordAuditMemory, queryAuditLogs as queryAuditLogsMemory, type AuditEntry } from './audit';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
const PORT = Number(process.env.PORT ?? 4000);
const DATABASE_URL = process.env.DATABASE_URL;
const USE_PG = DATABASE_URL !== undefined && DATABASE_URL !== '';

// ---------------------------------------------------------------------------
// Data layer — Postgres or in-memory, selected by DATABASE_URL env var
// ---------------------------------------------------------------------------

interface DataLayer {
  syncStore: ISyncStore;
  cacheStore: ICacheStore;
  refreshStore: IRefreshTokenStore;
  findUserByEmail: (email: string) => UserRow | undefined | Promise<UserRow | undefined>;
  findUserById: (id: string) => UserRow | undefined | Promise<UserRow | undefined>;
  recordAudit: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void | Promise<void>;
  queryAuditLogs: (filters?: { tenantId?: string; userId?: string; resource?: string; limit?: number }) => AuditEntry[] | Promise<AuditEntry[]>;
  userRoleMap: Record<string, number>;
  rolePermissionMap: Record<number, string[]>;
}

const ROLES = [
  { id: 0, code: 'super_admin', name: 'Super Admin', isActive: true as const, sortOrder: -1 },
  { id: 1, code: 'admin', name: 'Admin', isActive: true as const, sortOrder: 0 },
  { id: 2, code: 'manager', name: 'Manager', isActive: true as const, sortOrder: 1 },
  { id: 3, code: 'clerk', name: 'Clerk', isActive: true as const, sortOrder: 2 },
];

const ROLE_PERMS: Record<number, string[]> = {
  0: [],
  1: [],
  2: [
    'Read_Reports', 'Create_Reports',
    'Read_Orders', 'Create_Orders', 'Update_Orders',
    'Read_Inventory',
    'Create_Billing',
    'Read_AuditLogs',
  ],
  3: [
    'Read_Orders', 'Create_Orders',
    'Create_Billing',
  ],
};

const USER_ROLE_MAP: Record<string, number> = {
  'u-superadmin': 0,
  'u-owner': 1,
  'u-manager': 2,
  'u-clerk': 3,
};

async function buildDataLayer(): Promise<DataLayer> {
  if (USE_PG) {
    const pg = await import('pg');
    const pool = new pg.default.Pool({ connectionString: DATABASE_URL });
    const { PgSyncStore, PgCacheStore, createPgAuditStore } = await import('./pg-stores');
    const { PgRefreshStore, createPgUserRepo } = await import('./repo-pg');

    const userRepo = createPgUserRepo(pool);
    const auditStore = createPgAuditStore(pool);

    console.log('[boot] Using Postgres data layer');
    return {
      syncStore: new PgSyncStore(pool),
      cacheStore: new PgCacheStore(pool),
      refreshStore: new PgRefreshStore(pool),
      findUserByEmail: (email) => userRepo.findByEmail(email),
      findUserById: (id) => userRepo.findById(id),
      recordAudit: (entry) => { void auditStore.record(entry); },
      queryAuditLogs: (filters) => auditStore.query(filters),
      userRoleMap: USER_ROLE_MAP,
      rolePermissionMap: ROLE_PERMS,
    };
  }

  const syncStore = new MemorySyncStore();
  return {
    syncStore,
    cacheStore: new MemoryCacheStore(syncStore, ROLES, ROLE_PERMS),
    refreshStore: new MemoryRefreshStore(),
    findUserByEmail,
    findUserById,
    recordAudit: (entry) => { recordAuditMemory(entry); },
    queryAuditLogs: queryAuditLogsMemory,
    userRoleMap: USER_ROLE_MAP,
    rolePermissionMap: ROLE_PERMS,
  };
}

const data = await buildDataLayer();

// ---------------------------------------------------------------------------
// Step 1: Registry is already populated (see ./modules/index.ts)
// ---------------------------------------------------------------------------

console.log(`[boot] Registry: ${registry.getAll().length} modules, ${registry.getAllPermissions().length} permissions`);

// ---------------------------------------------------------------------------
// Step 2: Sync engine — auto-upsert permissions to the store on boot
// ---------------------------------------------------------------------------

const consoleLogger = {
  info: (msg: string) => console.log(`[sync] ${msg}`),
  warn: (msg: string) => console.warn(`[sync] ${msg}`),
  error: (msg: string, err?: unknown) => console.error(`[sync] ${msg}`, err),
};

await syncModules(data.syncStore, registry, consoleLogger);

// ---------------------------------------------------------------------------
// Step 3: Master cache — loads roles/permissions, auto-refreshes every 5 min
// ---------------------------------------------------------------------------

const cache = new MasterCache(data.cacheStore, 5 * 60 * 1000, consoleLogger);
await cache.load();
cache.startAutoRefresh();

console.log(`[boot] Cache loaded: ${cache.getCache()!.roles.length} roles, ${cache.getCache()!.permissions.length} permissions`);

// ---------------------------------------------------------------------------
// Step 4: Dynamic auth middleware — uses cache for permission checks
// ---------------------------------------------------------------------------

const auth = createDynamicExpressAuth({
  jwtSecret: JWT_SECRET,
  cache,
  superuserRoles: ['super_admin', 'owner'],
  loadUserContext: async (claims) => ({
    roleId: data.userRoleMap[claims.userId],
  }),
});

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

const refreshTokens = new RefreshTokens(data.refreshStore, 60 * 60 * 24 * 30);

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin ?? '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// --- Auth routes ---

app.post('/auth/login', (req, res) => {
  void (async () => {
    const { email, password } = req.body as { email?: string; password?: string };
    const user = email !== undefined ? await data.findUserByEmail(email) : undefined;
    if (user === undefined || password === undefined || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'invalid credentials' });
      return;
    }
    const claims: AuthClaims = {
      tenantId: user.tenantId, userId: user.id, role: user.role,
      audience: user.audience, scopeId: user.scopeId,
    };
    const accessToken = signAccessToken(claims, JWT_SECRET, DEFAULT_ACCESS_TTL_SECONDS);
    const refreshToken = await refreshTokens.issue(user.tenantId, user.id);
    const roleId = data.userRoleMap[user.id];
    const permissions = roleId !== undefined ? (data.rolePermissionMap[roleId] ?? []) : [];
    res.json({
      session: {
        userId: user.id, tenantId: user.tenantId, role: user.role,
        audience: user.audience, entitlements: registry.getAll().map((m) => m.key),
        capabilities: [], rolePermissions: {},
      } satisfies Session,
      tokens: { accessToken, refreshToken },
      permissions,
      modules: registry.getAll().map((m) => ({ key: m.key, name: m.name, audience: m.audience ?? 'admin' })),
    });
  })();
});

app.post('/auth/refresh', (req, res) => {
  void (async () => {
    const { refreshToken } = req.body as { refreshToken?: string };
    const rotated = refreshToken !== undefined ? await refreshTokens.rotate(refreshToken) : null;
    if (rotated === null) { res.status(401).json({ error: 'invalid refresh token' }); return; }
    const user = await data.findUserById(rotated.userId);
    if (user === undefined) { res.status(401).json({ error: 'unknown user' }); return; }
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
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken !== undefined) await refreshTokens.revoke(refreshToken);
    res.json({ ok: true });
  })();
});

// --- Audit trail middleware — auto-logs every authenticated action ---

app.use((req, res, next) => {
  const origEnd = res.end;
  res.end = function (...args: Parameters<typeof origEnd>) {
    const maw = (req as DynamicAuthedRequest).maw;
    if (maw !== undefined && req.path !== '/health' && !req.path.startsWith('/auth/')) {
      void data.recordAudit({
        tenantId: maw.claims.tenantId,
        userId: maw.claims.userId,
        action: req.method,
        resource: req.path,
        ip: req.ip,
        details: { statusCode: res.statusCode },
      });
    }
    return origEnd.apply(res, args);
  } as typeof origEnd;
  next();
});

// --- Protected resources (dynamic RBAC) ---

app.get('/me', auth.requireAuth, (req, res) => {
  const { claims } = (req as DynamicAuthedRequest).maw!;
  const roleId = data.userRoleMap[claims.userId];
  const permissions = roleId !== undefined ? (data.rolePermissionMap[roleId] ?? []) : [];
  res.json({
    userId: claims.userId, tenantId: claims.tenantId, role: claims.role,
    audience: claims.audience, permissions,
  });
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

app.get('/admin/users', auth.requireAuth, auth.audienceGuard('admin'), auth.requirePermission('Read_Users'), (_req, res) => {
  res.json({ users: ['superadmin@demo.test', 'owner@demo.test', 'manager@demo.test', 'clerk@demo.test'] });
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
    const logs = await data.queryAuditLogs({
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
    const logs = await data.queryAuditLogs({ tenantId: maw.claims.tenantId });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    const header = 'id,timestamp,userId,action,resource,resourceId,statusCode,ip\n';
    const rows = logs.map((l) =>
      `${l.id},${l.timestamp},${l.userId},${l.action},${l.resource},${l.resourceId ?? ''},${(l.details as Record<string, unknown>)?.statusCode ?? ''},${l.ip ?? ''}`
    ).join('\n');
    res.send(header + rows);
  })();
});

// --- Info routes ---

app.get('/modules', (_req, res) => {
  res.json({
    modules: registry.getAll().map((m) => ({
      key: m.key,
      name: m.name,
      audience: m.audience ?? 'admin',
      permissions: (m.permissions ?? []).map((p) => p.code),
      feature: m.featureSync?.code,
    })),
  });
});

app.get('/health', (_req, res) => res.json({ ok: true, mode: USE_PG ? 'postgres' : 'memory' }));

app.listen(PORT, () => {
  console.log(`[sample-server] http://localhost:${PORT} (${USE_PG ? 'Postgres' : 'in-memory'})`);
  console.log(`[sample-server] Users: superadmin@ / owner@ / manager@ / clerk@demo.test (pw: password123)`);
  console.log(`[sample-server] Try: GET /modules to see all registered modules + permissions`);
});
