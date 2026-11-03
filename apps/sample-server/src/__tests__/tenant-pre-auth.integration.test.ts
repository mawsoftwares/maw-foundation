import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { Pool } from 'pg';
import { PREHASH_HEADER, prehashPassword } from '@mawsoftwares/sdk/security/password-prehash';
import { createApp, type MawApp } from '../app';

/**
 * Pre-authentication tenant and authority rules (docs/customer-technician-phase2-design.md section 2A):
 * the caller never chooses the tenant or a role. Needs a migrated + seeded throwaway Postgres: set
 * TEST_DATABASE_URL. Skipped otherwise. The database-level RLS tests live only in servicerequest
 * until that step is adopted everywhere.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const SEED_PASSWORD = 'password123';
const OTHER_TENANT = 'other-tenant';
const OTHER_EMAIL = 'alice@other.test';

const options = { databaseUrl: TEST_DATABASE_URL ?? '', jwtSecret: 'tenant-test-jwt-secret-not-for-production', port: 0 };

async function withServer<T>(app: http.RequestListener, fn: (base: string) => Promise<T>): Promise<T> {
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  try {
    const address: AddressInfo | string | null = server.address();
    if (address === null || typeof address === 'string') throw new Error('no TCP address');
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
}

interface LoginResult { readonly status: number; readonly token?: string; readonly tenantId?: string }

async function login(base: string, email: string, bodyTenantId?: string): Promise<LoginResult> {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [PREHASH_HEADER]: 'sha256' },
    body: JSON.stringify({
      email,
      password: await prehashPassword(SEED_PASSWORD),
      ...(bodyTenantId === undefined ? {} : { tenantId: bodyTenantId }),
    }),
  });
  const body: { tokens?: { accessToken?: string }; user?: { tenantId?: string } } = await res.json().catch(() => ({}));
  return { status: res.status, token: body.tokens?.accessToken, tenantId: body.user?.tenantId };
}

describe.skipIf(TEST_DATABASE_URL === undefined)('pre-auth tenant rules', () => {
  let maw: MawApp;
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DATABASE_URL });
    await pool.query(
      `INSERT INTO tenants (id, name, slug, status) VALUES ($1, 'Other Tenant', $1, 'active') ON CONFLICT (id) DO NOTHING`,
      [OTHER_TENANT],
    );
    // Same password hash as the seeded clerk, so the same seed password logs in.
    await pool.query(
      `INSERT INTO users (id, tenant_id, email, role, audience, password_hash, name, account_status, email_verified)
       SELECT 'u-other-alice', $1, $2, role, audience, password_hash, 'Alice Other', 'ACTIVE', TRUE
         FROM users WHERE email = 'clerk@demo.test' LIMIT 1
       ON CONFLICT (id) DO NOTHING`,
      [OTHER_TENANT, OTHER_EMAIL],
    );
    maw = await createApp(options);
  }, 60_000);

  afterAll(async () => {
    await maw.shutdown();
    await pool.query(`DELETE FROM users WHERE id = 'u-other-alice' OR email LIKE 'evil%@attacker.test'`);
    await pool.query(`DELETE FROM tenants WHERE id = $1`, [OTHER_TENANT]);
    await pool.end();
  });

  it('BASELINE: a token for the default tenant does not list another tenant\'s users', async () => {
    await withServer(maw.app, async (base) => {
      const admin = await login(base, 'superadmin@demo.test');
      expect(admin.token).toBeDefined();
      const res = await fetch(`${base}/api/v1/users`, { headers: { authorization: `Bearer ${admin.token ?? ''}` } });
      expect(res.status).toBe(200);
      expect(JSON.stringify(await res.json())).not.toContain(OTHER_EMAIL);
    });
  });

  it('TARGET: login ignores or rejects a client-supplied tenantId (audit T1)', async () => {
    await withServer(maw.app, async (base) => {
      const forged = await login(base, OTHER_EMAIL, OTHER_TENANT);
      // Required: the caller cannot choose a tenant. Either rejected (400) or resolved from the server's
      // configured tenant, in which case this user does not exist there and the login fails (401). Never a token.
      expect(forged.token).toBeUndefined();
      expect([400, 401]).toContain(forged.status);
    });
  });

  it('TARGET: public registration cannot choose a role or a different tenant', async () => {
    await withServer(maw.app, async (base) => {
      const post = (path: string, body: object): Promise<Response> => fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      // Raw password (no prehash header) so the request passes the password policy and the test reaches the
      // authorisation logic instead of failing validation for an unrelated reason.
      const password = 'Str0ng!Passw0rd#2026';
      const escalate = await post('/auth/register', { email: 'evil1@attacker.test', password, tenantId: 'demo-tenant', role: 'super_admin', name: 'Evil' });
      expect(escalate.status, `register with role: ${await escalate.clone().text()}`).toBe(400);
      const crossTenant = await post('/auth/register', { email: 'evil2@attacker.test', password, tenantId: OTHER_TENANT, name: 'Evil' });
      expect(crossTenant.status, `register other tenant: ${await crossTenant.clone().text()}`).toBe(400);
      const forgot = await post('/auth/forgot-password', { email: OTHER_EMAIL, tenantId: OTHER_TENANT });
      expect(forgot.status, `forgot other tenant: ${await forgot.clone().text()}`).toBe(400);
      const { rows } = await pool.query<{ email: string; role: string }>(`SELECT email, role FROM users WHERE email LIKE 'evil%@attacker.test'`);
      expect(rows).toEqual([]);
    });
  });
});
