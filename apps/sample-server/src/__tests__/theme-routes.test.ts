import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type RequestHandler } from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createThemeRouter, MAX_DESIGN_MD_BYTES, type ThemeRecord, type ThemeStore } from '../theme-routes';

class MemoryThemeStore implements ThemeStore {
  readonly rows = new Map<string, ThemeRecord>();
  async get(tenantId: string) { return this.rows.get(tenantId) ?? null; }
  async set(tenantId: string, designMd: string, updatedBy: string) {
    const row = { designMd, updatedBy, updatedAt: new Date().toISOString() };
    this.rows.set(tenantId, row);
    return row;
  }
  async clear(tenantId: string) { this.rows.delete(tenantId); }
}

const DESIGN_MD = `---
version: alpha
name: Test Theme
colors:
  background: "#0f172a"
  on-background: "#f8fafc"
  primary: "#a855f7"
  on-primary: "#ffffff"
---`;

describe('application-wide theme API', () => {
  const store = new MemoryThemeStore();
  let server: Server;
  let base: string;

  // The test "auth": X-User / X-Tenant / X-Perms headers stand in for a verified JWT + the permission gate.
  const requireAuth: RequestHandler = (req, res, next) => {
    const userId = req.header('x-user');
    if (!userId) return void res.status(401).json({ error: 'no auth' });
    (req as unknown as { maw: unknown }).maw = { claims: { userId, tenantId: req.header('x-tenant') ?? 't1', role: 'viewer' } };
    next();
  };
  const requirePermission = (perm: string): RequestHandler => (req, res, next) =>
    (req.header('x-perms') ?? '').split(',').includes(perm) ? next() : void res.status(403).json({ error: `Missing ${perm}` });

  beforeAll(async () => {
    const app = express();
    app.use('/api/v1/theme', createThemeRouter(store, { requireAuth, requirePermission }));
    await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/theme`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const call = (method: string, headers: Record<string, string>, body?: unknown) =>
    fetch(base, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const admin = { 'x-user': 'u-admin', 'x-perms': 'Manage_Theme' };

  it('requires sign-in to read', async () => {
    expect((await call('GET', {})).status).toBe(401);
  });

  it('starts with no custom theme', async () => {
    const res = await call('GET', { 'x-user': 'u-viewer' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: null });
  });

  it('one admin sets it and every other user of the tenant then reads the same theme', async () => {
    const put = await call('PUT', admin, { designMd: DESIGN_MD });
    expect(put.status).toBe(200);

    const seenByOthers = await Promise.all(
      ['u-viewer', 'u-manager', 'u-clerk'].map(async (u) => (await (await call('GET', { 'x-user': u })).json()) as { data: ThemeRecord }),
    );
    for (const body of seenByOthers) {
      expect(body.data.designMd).toContain('#a855f7');
      expect(body.data.updatedBy).toBe('u-admin');
    }
  });

  it('keeps tenants separate', async () => {
    const other = await (await call('GET', { 'x-user': 'u-x', 'x-tenant': 't2' })).json();
    expect(other).toEqual({ data: null });
  });

  it('only Manage_Theme may change or reset it', async () => {
    expect((await call('PUT', { 'x-user': 'u-viewer' }, { designMd: DESIGN_MD })).status).toBe(403);
    expect((await call('DELETE', { 'x-user': 'u-viewer' })).status).toBe(403);
    expect(store.rows.get('t1')?.designMd).toContain('#a855f7'); // untouched
  });

  it('rejects empty, oversized and unreadable input without touching the stored theme', async () => {
    const before = store.rows.get('t1');
    expect((await call('PUT', admin, {})).status).toBe(400);
    expect((await call('PUT', admin, { designMd: '   ' })).status).toBe(400);
    expect((await call('PUT', admin, { designMd: 'x'.repeat(MAX_DESIGN_MD_BYTES + 1) })).status).toBe(413);
    expect((await call('PUT', admin, { designMd: 'just some prose, no colors here' })).status).toBe(422);
    expect(store.rows.get('t1')).toBe(before);
  });

  it('reset removes the theme for everyone', async () => {
    expect((await call('DELETE', admin)).status).toBe(200);
    expect(await (await call('GET', { 'x-user': 'u-viewer' })).json()).toEqual({ data: null });
  });
});
