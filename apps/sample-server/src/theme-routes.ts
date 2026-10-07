import { Router, json, type RequestHandler } from 'express';
import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq } from 'drizzle-orm';
import { normalizeDesignMarkdown } from '@mawsoftwares/theme';
import { actorOf } from './role-hierarchy-guard';

export interface ThemeRecord {
  readonly designMd: string;
  readonly updatedBy: string | null;
  readonly updatedAt: string;
}

/** Where the application-wide theme lives. Swappable so the routes are testable without Postgres. */
export interface ThemeStore {
  get(tenantId: string): Promise<ThemeRecord | null>;
  set(tenantId: string, designMd: string, updatedBy: string): Promise<ThemeRecord>;
  clear(tenantId: string): Promise<void>;
}

export class PgThemeStore implements ThemeStore {
  constructor(private readonly db: DrizzleDb) {}

  async get(tenantId: string): Promise<ThemeRecord | null> {
    const [row] = await this.db.select().from(schema.tenantTheme).where(eq(schema.tenantTheme.tenantId, tenantId)).limit(1);
    return row ? toRecord(row) : null;
  }

  async set(tenantId: string, designMd: string, updatedBy: string): Promise<ThemeRecord> {
    const values = { tenantId, designMd, updatedBy, updatedAt: new Date() };
    const [row] = await this.db
      .insert(schema.tenantTheme)
      .values(values)
      .onConflictDoUpdate({ target: schema.tenantTheme.tenantId, set: { designMd, updatedBy, updatedAt: values.updatedAt } })
      .returning();
    return toRecord(row!);
  }

  async clear(tenantId: string): Promise<void> {
    await this.db.delete(schema.tenantTheme).where(eq(schema.tenantTheme.tenantId, tenantId));
  }
}

function toRecord(row: typeof schema.tenantTheme.$inferSelect): ThemeRecord {
  return { designMd: row.designMd, updatedBy: row.updatedBy, updatedAt: row.updatedAt.toISOString() };
}

/** A design.md is a few KB; anything near this is not a theme. */
export const MAX_DESIGN_MD_BYTES = 64 * 1024;

export function createThemeRouter(
  store: ThemeStore,
  deps: { requireAuth: RequestHandler; requirePermission: (perm: string) => RequestHandler },
): Router {
  const router = Router();
  router.use(deps.requireAuth);

  // Every signed-in user reads the shared theme; only Manage_Theme may change it.
  router.get('/', async (req, res, next) => {
    try {
      const actor = actorOf(req);
      if (!actor) return void res.status(401).json({ error: 'Unauthenticated' });
      res.json({ data: await store.get(actor.tenantId) });
    } catch (err) {
      next(err);
    }
  });

  router.put('/', deps.requirePermission('Manage_Theme'), json({ limit: '128kb' }), async (req, res, next) => {
    try {
      const actor = actorOf(req);
      if (!actor) return void res.status(401).json({ error: 'Unauthenticated' });
      const designMd = (req.body as { designMd?: unknown } | undefined)?.designMd;
      if (typeof designMd !== 'string' || designMd.trim() === '') {
        return void res.status(400).json({ error: 'designMd (string) is required.' });
      }
      if (Buffer.byteLength(designMd, 'utf8') > MAX_DESIGN_MD_BYTES) {
        return void res.status(413).json({ error: 'design.md is too large.' });
      }
      // Reject text that yields no theme at all, so a bad paste can't replace the whole app's look.
      const normalized = normalizeDesignMarkdown(designMd);
      if (normalized.recognized.length === 0) {
        return void res.status(422).json({ error: 'No theme colors or tokens could be read from that design.md.' });
      }
      res.json({ data: await store.set(actor.tenantId, normalized.canonical, actor.userId) });
    } catch (err) {
      next(err);
    }
  });

  // Back to the built-in default for everyone.
  router.delete('/', deps.requirePermission('Manage_Theme'), async (req, res, next) => {
    try {
      const actor = actorOf(req);
      if (!actor) return void res.status(401).json({ error: 'Unauthenticated' });
      await store.clear(actor.tenantId);
      res.json({ data: null });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
