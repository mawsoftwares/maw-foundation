import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { ModuleRegistry } from '@mawsoftwares/rbac-core';
import type { MawModule } from '@mawsoftwares/server-express';
import { createApp, type MawApp } from '../app';

/**
 * Needs a migrated + seeded throwaway Postgres: set TEST_DATABASE_URL (see `pnpm db:setup`).
 * Skipped otherwise, so the default test run stays database-free.
 */
const TEST_DATABASE_URL = process.env['TEST_DATABASE_URL'];
const options = { databaseUrl: TEST_DATABASE_URL ?? '', jwtSecret: 'integration-test-jwt-secret-not-for-production', port: 0 };

const pingModule: MawModule = {
  definition: { key: 'ping-mod', name: 'Ping', version: '0.1.0', routePrefix: '/api/v1/ping-mod' },
  registerRoutes: ({ router, requireAuth }) => { router.get('/ping', requireAuth, (_req, res) => { res.json({ pong: true }); }); },
};

async function withServer<T>(maw: MawApp, fn: (base: string) => Promise<T>): Promise<T> {
  const server = http.createServer(maw.app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  try {
    const address = server.address() as AddressInfo;
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
}

describe.skipIf(TEST_DATABASE_URL === undefined)('sample-server createApp (integration)', () => {
  it('builds without listening, serves /health and shuts down idempotently', async () => {
    const listenSpy = vi.spyOn(http.Server.prototype, 'listen');
    const maw = await createApp({ ...options, registry: new ModuleRegistry() });
    expect(listenSpy).not.toHaveBeenCalled();
    listenSpy.mockRestore();
    await withServer(maw, async (base) => {
      expect((await fetch(`${base}/health`)).status).toBe(200);
    });
    await maw.shutdown();
    await maw.shutdown();
  }, 60_000);

  describe('with a plugged-in module', () => {
    let maw: MawApp;
    beforeAll(async () => {
      maw = await createApp({ ...options, registry: new ModuleRegistry(), modules: [pingModule] });
    }, 60_000);
    afterAll(async () => { await maw.shutdown(); });

    it('mounts its routes behind authentication and lists it in /modules', async () => {
      await withServer(maw, async (base) => {
        expect((await fetch(`${base}/api/v1/ping-mod/ping`)).status).toBe(401);
        const body = (await (await fetch(`${base}/modules`)).json()) as { modules: { key: string; status: string }[] };
        expect(body.modules.find((m) => m.key === 'ping-mod')?.status).toBe('enabled');
      });
    });
  });

  it('does not mount a module that is disabled by selection', async () => {
    const maw = await createApp({
      ...options,
      registry: new ModuleRegistry(),
      modules: [pingModule],
      moduleSelection: { enabled: new Set() },
    });
    try {
      await withServer(maw, async (base) => {
        expect((await fetch(`${base}/api/v1/ping-mod/ping`)).status).toBe(404);
        const body = (await (await fetch(`${base}/modules`)).json()) as { modules: { key: string; status: string }[] };
        expect(body.modules.find((m) => m.key === 'ping-mod')?.status).toBe('disabled');
      });
    } finally {
      await maw.shutdown();
    }
  }, 60_000);
});
