/**
 * Layout persistence against a real Postgres: migration 033, row locking, append-only history, tolerance of bad rows.
 * Runs only when LAYOUT_TEST_DATABASE_URL points at a scratch database (each run uses its own schema and drops it):
 *
 *   LAYOUT_TEST_DATABASE_URL=postgres:///maw_layout_test pnpm vitest run apps/sample-server/src/__tests__/layout-store.pg.integration.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { createDrizzle, type DrizzleDb } from '@mawsoftwares/database';
import { createLayoutStore, PgLayoutPersistence } from '../layout-store';

const DATABASE_URL = process.env['LAYOUT_TEST_DATABASE_URL'];
const MIGRATIONS = path.resolve(__dirname, '../../migrations');

const config = (presetId: string) => ({
  version: 1,
  layout: { version: 1, presetId },
  theme: { themeId: null, colorMode: 'system', typography: 'default', spacing: 'default' },
});

describe.skipIf(!DATABASE_URL)('layout persistence (Postgres)', () => {
  const schema = `layout_it_${randomBytes(4).toString('hex')}`;
  let pool: pg.Pool;
  let db: DrizzleDb;
  const fresh = () => createLayoutStore(new PgLayoutPersistence(db));

  beforeAll(async () => {
    const admin = new pg.Pool({ connectionString: DATABASE_URL });
    await admin.query(`CREATE SCHEMA ${schema}`);
    await admin.end();
    pool = new pg.Pool({ connectionString: DATABASE_URL, options: `-c search_path=${schema}`, max: 8 });
    await pool.query(await readFile(path.join(MIGRATIONS, '033_tenant_layout.up.sql'), 'utf8'));
    db = createDrizzle(pool as never);
  });

  afterAll(async () => {
    await pool.end();
    const admin = new pg.Pool({ connectionString: DATABASE_URL });
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  });

  it('starts empty, then draft → publish → rollback survive a "restart" (new store instance)', async () => {
    const a = fresh();
    expect(await a.getPublished('t1')).toEqual({ published: null, publishedRevision: null });

    await a.saveDraft('t1', config('floating-sidebar'), 'u1');
    // a different process sees the draft but still no live config
    const b = fresh();
    expect((await b.load('t1')).draft).toMatchObject({ layout: { presetId: 'floating-sidebar' } });
    expect((await b.getPublished('t1')).published).toBeNull();

    await b.publish('t1', 'u2');
    await b.saveDraft('t1', config('enterprise-dashboard'), 'u1');
    await b.publish('t1', 'u2');
    const state = await fresh().rollback('t1', 1, 'u3');

    expect(state.publishedRevision).toBe(3);
    expect(state.published).toMatchObject({ layout: { presetId: 'floating-sidebar' } });
    expect(state.history.map((h) => [h.revision, h.action, h.sourceRevision, h.by])).toEqual([
      [3, 'rollback', 1, 'u3'],
      [2, 'publish', null, 'u2'],
      [1, 'publish', null, 'u2'],
    ]);
  });

  it('writes the denormalised live columns and an append-only revision log', async () => {
    const { rows } = await pool.query(
      `SELECT published_revision, published_by, published->'layout'->>'presetId' AS preset, draft FROM tenant_layout WHERE tenant_id = 't1' AND scope = 'tenant' AND scope_id = ''`,
    );
    expect(rows).toEqual([{ published_revision: 3, published_by: 'u3', preset: 'floating-sidebar', draft: null }]);
    const rev = await pool.query(`SELECT revision, action, source_revision, config_version FROM tenant_layout_revision WHERE tenant_id = 't1' ORDER BY revision`);
    expect(rev.rows).toEqual([
      { revision: 1, action: 'publish', source_revision: null, config_version: 1 },
      { revision: 2, action: 'publish', source_revision: null, config_version: 1 },
      { revision: 3, action: 'rollback', source_revision: 1, config_version: 1 },
    ]);
  });

  it('keeps tenants separate', async () => {
    expect((await fresh().getPublished('t2')).published).toBeNull();
    const s = fresh();
    await s.saveDraft('t2', config('listing-workspace'), 'x');
    await s.publish('t2', 'x');
    expect((await fresh().getPublished('t1')).published).toMatchObject({ layout: { presetId: 'floating-sidebar' } });
    expect((await fresh().getPublished('t2')).published).toMatchObject({ layout: { presetId: 'listing-workspace' } });
  });

  it('a failed operation changes nothing (transaction rolls back)', async () => {
    const s = fresh();
    await expect(s.saveDraft('t3', config('no-such-preset'), 'u')).rejects.toMatchObject({ code: 'INVALID' });
    await expect(s.publish('t3', 'u')).rejects.toMatchObject({ code: 'NO_DRAFT' });
    expect((await s.load('t3')).history).toEqual([]);
  });

  it('serialises concurrent publishes with the row lock: one wins, history stays gap-free', async () => {
    const s = fresh();
    await s.saveDraft('t4', config('analytics-dashboard'), 'u');
    const results = await Promise.allSettled(Array.from({ length: 5 }, (_, i) => fresh().publish('t4', `u${i}`)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(4);
    const rev = await pool.query(`SELECT revision FROM tenant_layout_revision WHERE tenant_id = 't4' ORDER BY revision`);
    expect(rev.rows).toEqual([{ revision: 1 }]);
  });

  it('concurrent rollbacks never create duplicate or skipped revision numbers', async () => {
    const s = fresh();
    await s.saveDraft('t5', config('split-workspace'), 'u'); await s.publish('t5', 'u');
    await s.saveDraft('t5', config('project-workspace'), 'u'); await s.publish('t5', 'u');
    await Promise.all(Array.from({ length: 4 }, (_, i) => fresh().rollback('t5', 1, `r${i}`)));
    const rev = await pool.query(`SELECT revision FROM tenant_layout_revision WHERE tenant_id = 't5' ORDER BY revision`);
    expect(rev.rows.map((r) => r.revision)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('skips stored rows it cannot understand instead of failing the whole load', async () => {
    const s = fresh();
    await s.saveDraft('t6', config('floating-sidebar'), 'u'); await s.publish('t6', 'u');
    // an unreadable revision (future version) and an unreadable draft, as an older/newer release might leave behind
    await pool.query(
      `INSERT INTO tenant_layout_revision (tenant_id, revision, config, config_version, action) VALUES ('t6', 2, '{"version":99,"layout":{},"theme":{}}', 99, 'publish')`,
    );
    await pool.query(`UPDATE tenant_layout SET draft = '{"junk":true}' WHERE tenant_id = 't6'`);
    const state = await fresh().load('t6');
    expect(state.draft).toBeNull();
    expect(state.history.map((h) => h.revision)).toEqual([1]);
    expect(state.published).toMatchObject({ layout: { presetId: 'floating-sidebar' } });
  });

  it('migration 033 is reversible', async () => {
    await pool.query(await readFile(path.join(MIGRATIONS, '033_tenant_layout.down.sql'), 'utf8'));
    const { rows } = await pool.query(`SELECT to_regclass('tenant_layout') AS a, to_regclass('tenant_layout_revision') AS b`);
    expect(rows[0]).toEqual({ a: null, b: null });
    await pool.query(await readFile(path.join(MIGRATIONS, '033_tenant_layout.up.sql'), 'utf8'));
  });
});
