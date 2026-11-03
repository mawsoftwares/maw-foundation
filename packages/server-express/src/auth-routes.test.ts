import { describe, it, expect, afterEach } from 'vitest';
import express, { type RequestHandler } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { AccountStatus } from '@mawsoftwares/sdk';
import type { UserRecord } from '@mawsoftwares/sdk/contracts/IUserRepository';
import { StaticTenantResolver, type ITenantResolver } from '@mawsoftwares/tenancy';
import { createAuthRoutes, type AuthRouteDeps } from './auth-routes';

interface RegisterCall { readonly email: string; readonly password: string; readonly tenantId: string; readonly role?: string; readonly name?: string }

function userFor(input: RegisterCall): UserRecord {
  return {
    id: 'u1', tenantId: input.tenantId, email: input.email, passwordHash: 'x', role: 'viewer',
    accountStatus: AccountStatus.PENDING_VERIFICATION, emailVerified: false, mfaEnabled: false,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const requireAuth: RequestHandler = (_req, _res, next) => { next(); };

function setup(tenantResolver?: ITenantResolver) {
  const registered: RegisterCall[] = [];
  const resets: { tenantId: string; email: string }[] = [];
  const deps: AuthRouteDeps = {
    requireAuth,
    ...(tenantResolver === undefined ? {} : { tenantResolver }),
    registrationService: {
      register: (input) => {
        registered.push(input);
        return Promise.resolve({ user: userFor(input), verificationToken: 't' });
      },
      verifyEmail: () => Promise.reject(new Error('unused')),
    },
    passwordResetService: {
      requestReset: (tenantId, email) => { resets.push({ tenantId, email }); return Promise.resolve(); },
      executeReset: () => Promise.reject(new Error('unused')),
    },
  };
  const app = express();
  app.use(express.json());
  app.use('/auth', createAuthRoutes(deps));
  return { app, registered, resets };
}

const servers: http.Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))));
});

async function post(app: express.Express, path: string, body: object): Promise<{ status: number; json: unknown }> {
  const server = http.createServer(app);
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const person = { email: 'a@b.test', password: 'Str0ng!Passw0rd#2026', name: 'A' };

describe('createAuthRoutes — public register', () => {
  it('refuses a client-supplied role, with or without a tenant resolver', async () => {
    for (const resolver of [undefined, new StaticTenantResolver({ tenantId: 'acme' })]) {
      const { app, registered } = setup(resolver);
      const res = await post(app, '/auth/register', { ...person, tenantId: 'acme', role: 'super_admin' });
      expect(res.status).toBe(400);
      expect(res.json).toMatchObject({ error: { code: 'FORBIDDEN_FIELD' } });
      expect(registered).toEqual([]);
    }
  });

  it('with a resolver: uses the server tenant, accepts an omitted or equal tenantId, rejects a different one', async () => {
    const { app, registered } = setup(new StaticTenantResolver({ tenantId: 'acme' }));
    expect((await post(app, '/auth/register', person)).status).toBe(201);
    expect((await post(app, '/auth/register', { ...person, email: 'c@d.test', tenantId: 'acme' })).status).toBe(201);
    const forged = await post(app, '/auth/register', { ...person, email: 'e@f.test', tenantId: 'other' });
    expect(forged.status).toBe(400);
    expect(forged.json).toMatchObject({ error: { code: 'FORBIDDEN_FIELD' } });
    expect(registered.map((r) => r.tenantId)).toEqual(['acme', 'acme']);
    expect(registered.every((r) => r.role === undefined)).toBe(true);
  });

  it('with a resolver: refuses when the tenant cannot be resolved or is not active', async () => {
    const none: ITenantResolver = { resolve: () => Promise.resolve(null) };
    expect((await post(setup(none).app, '/auth/register', person)).status).toBe(403);
    const suspended = new StaticTenantResolver({ tenantId: 'acme', tenantStatus: 'suspended' });
    const res = await post(setup(suspended).app, '/auth/register', person);
    expect(res.status).toBe(403);
    expect(res.json).toMatchObject({ error: { code: 'TENANT_INACTIVE' } });
  });

  it('without a resolver (legacy): still needs a tenantId from the body', async () => {
    const { app, registered } = setup();
    expect((await post(app, '/auth/register', person)).status).toBe(400);
    expect((await post(app, '/auth/register', { ...person, tenantId: 'acme' })).status).toBe(201);
    expect(registered).toHaveLength(1);
  });
});

describe('createAuthRoutes — forgot-password', () => {
  it('with a resolver: resets only within the server tenant and rejects a different tenantId', async () => {
    const { app, resets } = setup(new StaticTenantResolver({ tenantId: 'acme' }));
    expect((await post(app, '/auth/forgot-password', { email: 'a@b.test' })).status).toBe(200);
    const forged = await post(app, '/auth/forgot-password', { email: 'a@b.test', tenantId: 'other' });
    expect(forged.status).toBe(400);
    expect(resets).toEqual([{ tenantId: 'acme', email: 'a@b.test' }]);
  });

  it('without a resolver (legacy): requires tenantId and email', async () => {
    const { app, resets } = setup();
    expect((await post(app, '/auth/forgot-password', { email: 'a@b.test' })).status).toBe(400);
    expect((await post(app, '/auth/forgot-password', { email: 'a@b.test', tenantId: 'acme' })).status).toBe(200);
    expect(resets).toEqual([{ tenantId: 'acme', email: 'a@b.test' }]);
  });
});
