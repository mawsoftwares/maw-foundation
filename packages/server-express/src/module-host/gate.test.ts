import { describe, it, expect } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { ModuleRegistry } from '@mawsoftwares/rbac-core';
import { requireModuleEnabled } from './gate';

describe('requireModuleEnabled', () => {
  it('passes while enabled (or unknown to the registry) and answers 404 once disabled', async () => {
    const registry = new ModuleRegistry();
    registry.register({ key: 'tasks', name: 'Tasks', version: '1.0.0', routePrefix: '/api/tasks' });
    await registry.enable('tasks');
    const app = express();
    app.use('/tasks', requireModuleEnabled(registry, 'tasks'), (_req, res) => { res.json({ ok: true }); });
    app.use('/other', requireModuleEnabled(registry, 'not-registered'), (_req, res) => { res.json({ ok: true }); });
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', () => r()));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      expect((await fetch(`${base}/tasks`)).status).toBe(200);
      await registry.disable('tasks');
      const res = await fetch(`${base}/tasks`);
      expect(res.status).toBe(404);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('MODULE_DISABLED');
      expect((await fetch(`${base}/other`)).status).toBe(200);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
