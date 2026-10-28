import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { type RequestHandler } from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createLayoutRouter, MAX_LAYOUT_BODY_BYTES } from '../layout-routes';
import { createLayoutStore, MemoryLayoutPersistence } from '../layout-store';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: { fields?: { field: string; error: string }[] } };
}
interface State { draft: unknown; published: { layout: { presetId: string } } | null; publishedRevision: number | null; history: { revision: number; action: string; sourceRevision: number | null; by: string | null }[] }

const config = (presetId: string, extra: Record<string, unknown> = {}) => ({
  version: 1,
  layout: { version: 1, presetId },
  theme: { themeId: null, colorMode: 'system', typography: 'default', spacing: 'default' },
  ...extra,
});

describe('layout API', () => {
  let persistence: MemoryLayoutPersistence;
  let server: Server;
  let base: string;
  const audited: { action: string; userId: string; tenantId: string; details: unknown }[] = [];

  // X-User / X-Tenant / X-Perms stand in for a verified JWT and the permission gate (same approach as the theme API test).
  const requireAuth: RequestHandler = (req, res, next) => {
    const userId = req.header('x-user');
    if (!userId) return void res.status(401).json({ error: 'no auth' });
    (req as unknown as { maw: unknown }).maw = { claims: { userId, tenantId: req.header('x-tenant') ?? 't1', role: 'viewer' } };
    next();
  };
  const requirePermission = (perm: string): RequestHandler => (req, res, next) =>
    (req.header('x-perms') ?? '').split(',').includes(perm) ? next() : void res.status(403).json({ error: `Missing ${perm}` });

  beforeAll(async () => {
    persistence = new MemoryLayoutPersistence();
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use((req, _res, next) => {
      // populateRequestContext() in the real app; reproduced minimally here.
      const maw = (req as unknown as { maw?: { claims: { userId: string; tenantId: string } } }).maw;
      next(maw);
    });
    app.use(
      '/api/v1/layout',
      requireAuth,
      createLayoutRouter(createLayoutStore(persistence), {
        requireAuth,
        requirePermission,
        auditStore: { record: async (e: { action: string; userId: string; tenantId: string; details?: unknown }) => void audited.push({ action: e.action, userId: e.userId, tenantId: e.tenantId, details: e.details }) } as never,
      }),
    );
    await new Promise<void>((resolve) => { server = app.listen(0, () => resolve()); });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/layout`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
  beforeEach(() => { audited.length = 0; });

  const call = async <T = State>(method: string, path: string, headers: Record<string, string>, body?: unknown): Promise<{ status: number; body: Envelope<T> }> => {
    const res = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: (await res.json()) as Envelope<T> };
  };
  const reader = { 'x-user': 'u-reader', 'x-perms': 'Read_Layout' };
  const editor = { 'x-user': 'u-editor', 'x-perms': 'Read_Layout,Update_Layout' };
  const publisher = { 'x-user': 'u-pub', 'x-perms': 'Read_Layout,Publish_Layout' };
  const viewer = { 'x-user': 'u-viewer', 'x-perms': '' };

  describe('permissions are enforced on the server', () => {
    const routes: [string, string, string, unknown?][] = [
      ['GET', '/studio', 'Read_Layout'],
      ['PUT', '/draft', 'Update_Layout', config('floating-sidebar')],
      ['DELETE', '/draft', 'Update_Layout'],
      ['POST', '/publish', 'Publish_Layout'],
      ['POST', '/rollback', 'Publish_Layout', { revision: 1 }],
    ];

    it.each(routes)('%s %s needs sign-in', async (method, path, _perm, body) => {
      expect((await call(method, path, {}, body)).status).toBe(401);
    });

    it.each(routes)('%s %s is refused without %s', async (method, path, perm, body) => {
      const others = ['Read_Layout', 'Update_Layout', 'Publish_Layout', 'Manage_Theme', 'Read_Users'].filter((p) => p !== perm).join(',');
      expect((await call(method, path, { 'x-user': 'u-x', 'x-perms': others }, body)).status).toBe(403);
    });

    it('editing does not imply publishing, and publishing does not imply editing', async () => {
      expect((await call('POST', '/publish', editor)).status).toBe(403);
      expect((await call('PUT', '/draft', publisher, config('floating-sidebar'))).status).toBe(403);
    });
  });

  it('any signed-in user can read the live layout, which is empty at first', async () => {
    const r = await call<{ published: unknown; publishedRevision: number | null }>('GET', '/', viewer);
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ published: null, publishedRevision: null });
  });

  it('saving a draft does not change what other users get', async () => {
    const saved = await call('PUT', '/draft', editor, config('floating-sidebar'));
    expect(saved.status).toBe(200);
    expect((saved.body.data as State).draft).toMatchObject({ layout: { presetId: 'floating-sidebar' } });

    const live = await call<{ published: unknown }>('GET', '/', viewer);
    expect(live.body.data?.published).toBeNull();
    // ...and the live read never exposes the draft or history.
    expect(JSON.stringify(live.body)).not.toContain('floating-sidebar');
    expect(Object.keys(live.body.data ?? {}).sort()).toEqual(['published', 'publishedRevision']);
  });

  it('a publisher publishes the saved draft; everyone then sees it, and the draft is cleared', async () => {
    const r = await call('POST', '/publish', publisher);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ publishedRevision: 1, draft: null, published: { layout: { presetId: 'floating-sidebar' } } });
    expect(r.body.data?.history[0]).toMatchObject({ revision: 1, action: 'publish', by: 'u-pub' });

    const live = await call<{ published: { layout: { presetId: string } } }>('GET', '/', viewer);
    expect(live.body.data?.published.layout.presetId).toBe('floating-sidebar');
  });

  it('publishing with no draft is a conflict', async () => {
    const r = await call('POST', '/publish', publisher);
    expect(r.status).toBe(409);
    expect(r.body.success).toBe(false);
  });

  it('rolls back by publishing the old config again as a new revision', async () => {
    await call('PUT', '/draft', editor, config('enterprise-dashboard'));
    await call('POST', '/publish', publisher);
    const r = await call('POST', '/rollback', publisher, { revision: 1 });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ publishedRevision: 3, published: { layout: { presetId: 'floating-sidebar' } } });
    expect(r.body.data?.history.map((h) => [h.revision, h.action, h.sourceRevision])).toEqual([[3, 'rollback', 1], [2, 'publish', null], [1, 'publish', null]]);
  });

  it('rejects an unknown revision (404) and a malformed one (400 with the field)', async () => {
    expect((await call('POST', '/rollback', publisher, { revision: 99 })).status).toBe(404);
    const bad = await call('POST', '/rollback', publisher, { revision: 'x' });
    expect(bad.status).toBe(400);
    expect(bad.body.error?.details?.fields?.[0]?.field).toBe('revision');
  });

  describe('validation', () => {
    it('returns field paths for an invalid config and saves nothing', async () => {
      const before = (await call('GET', '/studio', reader)).body.data as State;
      const bad = await call('PUT', '/draft', editor, config('classic-admin', { layout: { version: 1, presetId: 'classic-admin', overrides: { sidebar: { width: 'giant', onClick: 'alert(1)', top: ['evil'] } } } }));
      expect(bad.status).toBe(400);
      const fields = bad.body.error?.details?.fields?.map((f) => f.field) ?? [];
      expect(fields).toEqual(expect.arrayContaining(['layout.overrides.sidebar.width', 'layout.overrides.sidebar.onClick', 'layout.overrides.sidebar.top[0]']));
      expect((await call('GET', '/studio', reader)).body.data).toEqual(before);
    });

    it('rejects an unknown preset, a bad theme id, junk and oversized bodies', async () => {
      expect((await call('PUT', '/draft', editor, config('does-not-exist'))).status).toBe(400);
      expect((await call('PUT', '/draft', editor, { ...config('classic-admin'), theme: { themeId: '../../etc', colorMode: 'system', typography: 'default', spacing: 'default' } })).status).toBe(400);
      expect((await call('PUT', '/draft', editor, [])).status).toBe(400);
      expect((await call('PUT', '/draft', editor, config('classic-admin', { pad: 'x'.repeat(MAX_LAYOUT_BODY_BYTES) }))).status).toBe(400);
    });
  });

  it('keeps tenants apart', async () => {
    const t2 = { 'x-user': 'u-t2', 'x-tenant': 't2', 'x-perms': 'Read_Layout,Update_Layout,Publish_Layout' };
    expect((await call<{ published: unknown }>('GET', '/', t2)).body.data?.published).toBeNull();
    await call('PUT', '/draft', t2, config('listing-workspace'));
    await call('POST', '/publish', t2);
    const t1 = (await call<{ published: { layout: { presetId: string } } }>('GET', '/', viewer)).body.data?.published.layout.presetId;
    expect(t1).toBe('floating-sidebar');
  });

  it('discarding a draft leaves the live layout alone', async () => {
    await call('PUT', '/draft', editor, config('split-workspace'));
    const r = await call('DELETE', '/draft', editor);
    expect(r.body.data).toMatchObject({ draft: null, published: { layout: { presetId: 'floating-sidebar' } } });
  });

  it('records who changed what in the audit log', async () => {
    audited.length = 0;
    await call('PUT', '/draft', editor, config('project-workspace'));
    await call('POST', '/publish', publisher);
    expect(audited.map((a) => [a.action, a.userId, a.tenantId])).toEqual([
      ['layout.draft.save', 'u-editor', 't1'],
      ['layout.publish', 'u-pub', 't1'],
    ]);
  });

  it('serialises concurrent publishes: exactly one wins, the other finds no draft', async () => {
    await call('PUT', '/draft', editor, config('analytics-dashboard'));
    const [a, b] = await Promise.all([call('POST', '/publish', publisher), call('POST', '/publish', { ...publisher, 'x-user': 'u-pub2' })]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });
});
