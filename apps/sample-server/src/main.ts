import express from 'express';
import {
  signAccessToken,
  verifyPassword,
  RefreshTokens,
  DEFAULT_ACCESS_TTL_SECONDS,
  type AuthClaims,
  type IRefreshTokenStore,
} from '@maw/auth-core';
import { EXAMPLE_RBAC, type UserAccessContext, type TenantRolePolicy } from '@maw/rbac-core';
import { createExpressAuth, type AuthedRequest } from '@maw/server-express';
import type { Session } from '@maw/sdk/contracts/identity';
import {
  ENABLED_MODULES,
  TENANT_ROLE_POLICY,
  MemoryRefreshStore,
  findUserByEmail,
  findUserById,
  type UserRow,
} from './repo';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
const PORT = Number(process.env.PORT ?? 4000);
const DATABASE_URL = process.env.DATABASE_URL;

// ---------------------------------------------------------------------------
// Data layer: auto-detect Postgres vs in-memory
// ---------------------------------------------------------------------------

interface DataLayer {
  refreshStore: IRefreshTokenStore;
  findByEmail: (email: string) => Promise<UserRow | undefined>;
  findById: (id: string) => Promise<UserRow | undefined>;
  loadPolicy: (tenantId: string) => Promise<TenantRolePolicy>;
}

async function createDataLayer(): Promise<DataLayer> {
  if (DATABASE_URL) {
    const pg = await import('pg');
    const pool = new pg.default.Pool({ connectionString: DATABASE_URL });
    // Verify the connection works
    await pool.query('SELECT 1');
    const { createPgUserRepo, PgRefreshStore, loadTenantRolePolicy } = await import('./repo-pg');
    const userRepo = createPgUserRepo(pool);
    console.log('[sample-server] Using Postgres:', DATABASE_URL.replace(/\/\/[^@]*@/, '//***@'));
    return {
      refreshStore: new PgRefreshStore(pool),
      findByEmail: (email) => userRepo.findByEmail(email),
      findById: (id) => userRepo.findById(id),
      loadPolicy: (tenantId) => loadTenantRolePolicy(pool, tenantId),
    };
  }
  console.log('[sample-server] Using in-memory store (set DATABASE_URL for Postgres).');
  return {
    refreshStore: new MemoryRefreshStore(),
    findByEmail: async (email) => findUserByEmail(email),
    findById: async (id) => findUserById(id),
    loadPolicy: async () => TENANT_ROLE_POLICY,
  };
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

const data = await createDataLayer();
const refreshTokens = new RefreshTokens(data.refreshStore, 60 * 60 * 24 * 30);

async function loadAccessContext(claims: AuthClaims): Promise<UserAccessContext> {
  const user = await data.findById(claims.userId);
  const rolePermissions = await data.loadPolicy(claims.tenantId);
  return {
    userId: claims.userId,
    tenantId: claims.tenantId,
    baseRole: claims.role,
    grantedCapabilities: [],
    enabledModules: ENABLED_MODULES,
    subscriptionActive: true,
    rolePermissions,
    scope: user?.scopeId != null ? { scopeId: user.scopeId, ownPlantId: user.scopeId } : undefined,
  };
}

const auth = createExpressAuth({ jwtSecret: JWT_SECRET, rbac: EXAMPLE_RBAC, loadAccessContext });

const app = express();
app.use(express.json());

// CORS for the local web sample (dev-only, permissive).
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin ?? '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

async function sessionFor(userId: string, tenantId: string, role: string, audience: string): Promise<Session> {
  const rolePermissions = await data.loadPolicy(tenantId);
  return {
    userId,
    tenantId,
    role,
    audience,
    entitlements: ENABLED_MODULES,
    capabilities: [],
    rolePermissions,
  };
}

// --- Auth transport -------------------------------------------------------
app.post('/auth/login', (req, res) => {
  void (async () => {
    const { email, password } = req.body as { email?: string; password?: string };
    const user = email !== undefined ? await data.findByEmail(email) : undefined;
    if (user === undefined || password === undefined || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'invalid credentials' });
      return;
    }
    const claims: AuthClaims = {
      tenantId: user.tenantId,
      userId: user.id,
      role: user.role,
      audience: user.audience,
      scopeId: user.scopeId,
    };
    const accessToken = signAccessToken(claims, JWT_SECRET, DEFAULT_ACCESS_TTL_SECONDS);
    const refreshToken = await refreshTokens.issue(user.tenantId, user.id);
    res.json({
      session: await sessionFor(user.id, user.tenantId, user.role, user.audience),
      tokens: { accessToken, refreshToken },
    });
  })();
});

app.post('/auth/refresh', (req, res) => {
  void (async () => {
    const { refreshToken } = req.body as { refreshToken?: string };
    const rotated = refreshToken !== undefined ? await refreshTokens.rotate(refreshToken) : null;
    if (rotated === null) {
      res.status(401).json({ error: 'invalid refresh token' });
      return;
    }
    const user = await data.findById(rotated.userId);
    if (user === undefined) {
      res.status(401).json({ error: 'unknown user' });
      return;
    }
    const claims: AuthClaims = {
      tenantId: user.tenantId,
      userId: user.id,
      role: user.role,
      audience: user.audience,
      scopeId: user.scopeId,
    };
    const accessToken = signAccessToken(claims, JWT_SECRET);
    res.json({
      session: await sessionFor(user.id, user.tenantId, user.role, user.audience),
      tokens: { accessToken, refreshToken: rotated.token },
    });
  })();
});

app.post('/auth/logout', (req, res) => {
  void (async () => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken !== undefined) await refreshTokens.revoke(refreshToken);
    res.json({ ok: true });
  })();
});

// --- Protected resources --------------------------------------------------
app.get('/me', auth.requireAuth, (req, res) => {
  void (async () => {
    const { claims } = (req as AuthedRequest).maw!;
    res.json(await sessionFor(claims.userId, claims.tenantId, claims.role, claims.audience ?? 'admin'));
  })();
});

app.get('/reports', auth.requireAuth, auth.requirePermission('reports.view'), (_req, res) => {
  res.json({ report: 'Q3 numbers', rows: [{ label: 'Revenue', value: 128000 }] });
});

app.get('/admin/users', auth.requireAuth, auth.audienceGuard('admin'), auth.requirePermission('users.manage'), (_req, res) => {
  res.json({ users: ['owner@demo.test', 'manager@demo.test', 'clerk@demo.test'] });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`[sample-server] http://localhost:${PORT}  (users: owner@ / manager@ / clerk@demo.test, pw: password123)`);
});
