import { and, asc, eq } from 'drizzle-orm';
import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { createLogger } from '@mawsoftwares/sdk';
import {
  createMemoryProjectUiStore,
  defaultLayoutRegistry,
  layoutConfigsEqual,
  upgradeProjectUiConfig,
  validateProjectUiConfig,
  type LayoutRegistry,
  type PersistedProjectUi,
  type ProjectUiConfig,
  type ProjectUiState,
  type ProjectUiStore,
  type StoredRevision,
} from '@mawsoftwares/layout';

const log = createLogger('layout-store');

/** Everything is stored per (tenant, scope, scopeId); only the tenant-wide scope is used today. */
const SCOPE = 'tenant';
const SCOPE_ID = '';

/** What a persistence backend must provide. `transact` is atomic per tenant: concurrent admins cannot interleave. */
export interface LayoutPersistence {
  read(tenantId: string): Promise<PersistedProjectUi>;
  transact<T>(
    tenantId: string,
    mutate: (current: PersistedProjectUi) => Promise<{ readonly next: PersistedProjectUi; readonly result: T }>,
    actor: string | null,
  ): Promise<T>;
}

export interface LayoutStore {
  /** The live config only — safe to show to every signed-in user. */
  getPublished(tenantId: string): Promise<{ readonly published: ProjectUiConfig | null; readonly publishedRevision: number | null }>;
  /** Draft, live config and history — for Layout Studio users. */
  load(tenantId: string): Promise<ProjectUiState>;
  saveDraft(tenantId: string, config: unknown, actor: string): Promise<ProjectUiState>;
  discardDraft(tenantId: string, actor: string): Promise<ProjectUiState>;
  publish(tenantId: string, actor: string): Promise<ProjectUiState>;
  rollback(tenantId: string, revision: number, actor: string): Promise<ProjectUiState>;
}

export interface LayoutStoreOptions {
  readonly registry?: LayoutRegistry;
  readonly now?: () => Date;
}

/**
 * Tenant-scoped layout store. The draft / publish / rollback rules are NOT re-implemented here: each call replays the
 * same `ProjectUiStore` the client libraries test, over the tenant's persisted state, inside one atomic transaction.
 */
export function createLayoutStore(persistence: LayoutPersistence, options: LayoutStoreOptions = {}): LayoutStore {
  const registry = options.registry ?? defaultLayoutRegistry;

  const view = async (tenantId: string): Promise<ProjectUiState> =>
    createMemoryProjectUiStore({ registry, initial: await persistence.read(tenantId) }).load();

  const mutate = (tenantId: string, actor: string, op: (store: ProjectUiStore) => Promise<ProjectUiState>): Promise<ProjectUiState> =>
    persistence.transact(
      tenantId,
      async (current) => {
        let next = current;
        const store = createMemoryProjectUiStore({
          registry,
          initial: current,
          actor,
          ...(options.now === undefined ? {} : { now: options.now }),
          persist: (state) => { next = state; },
        });
        const result = await op(store);
        return { next, result };
      },
      actor,
    );

  return {
    async getPublished(tenantId) {
      const { published, publishedRevision } = await view(tenantId);
      return { published, publishedRevision };
    },
    load: view,
    saveDraft: (tenantId, config, actor) => mutate(tenantId, actor, (s) => s.saveDraft(config as ProjectUiConfig)),
    discardDraft: (tenantId, actor) => mutate(tenantId, actor, (s) => s.discardDraft()),
    publish: (tenantId, actor) => mutate(tenantId, actor, (s) => s.publish()),
    rollback: (tenantId, revision, actor) => mutate(tenantId, actor, (s) => s.rollback(revision)),
  };
}

/** In-memory persistence (tests, local runs without Postgres). Calls for one tenant run one at a time, like a row lock. */
export class MemoryLayoutPersistence implements LayoutPersistence {
  private readonly rows = new Map<string, PersistedProjectUi>();
  private readonly tails = new Map<string, Promise<unknown>>();

  async read(tenantId: string): Promise<PersistedProjectUi> {
    return this.rows.get(tenantId) ?? { draft: null, revisions: [] };
  }

  transact<T>(
    tenantId: string,
    mutate: (current: PersistedProjectUi) => Promise<{ readonly next: PersistedProjectUi; readonly result: T }>,
  ): Promise<T> {
    const run = (this.tails.get(tenantId) ?? Promise.resolve()).then(async () => {
      const { next, result } = await mutate(await this.read(tenantId));
      this.rows.set(tenantId, next);
      return result;
    });
    this.tails.set(tenantId, run.catch(() => undefined));
    return run;
  }
}

/** Postgres persistence over `tenant_layout` + `tenant_layout_revision` (migration 033). */
export class PgLayoutPersistence implements LayoutPersistence {
  constructor(
    private readonly db: DrizzleDb,
    private readonly registry: LayoutRegistry = defaultLayoutRegistry,
  ) {}

  async read(tenantId: string): Promise<PersistedProjectUi> {
    return this.load(this.db, tenantId);
  }

  async transact<T>(
    tenantId: string,
    mutate: (current: PersistedProjectUi) => Promise<{ readonly next: PersistedProjectUi; readonly result: T }>,
    actor: string | null,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      // Make sure the row exists, then lock it: a second admin saving at the same moment waits and then sees our result.
      await tx.insert(schema.tenantLayout).values({ tenantId, scope: SCOPE, scopeId: SCOPE_ID }).onConflictDoNothing();
      await tx
        .select({ tenantId: schema.tenantLayout.tenantId })
        .from(schema.tenantLayout)
        .where(this.rowKey(tenantId))
        .for('update');

      const current = await this.load(tx, tenantId);
      const { next, result } = await mutate(current);
      await this.write(tx, tenantId, current, next, actor);
      return result;
    });
  }

  private rowKey(tenantId: string) {
    return and(eq(schema.tenantLayout.tenantId, tenantId), eq(schema.tenantLayout.scope, SCOPE), eq(schema.tenantLayout.scopeId, SCOPE_ID));
  }

  /** Reads and upgrades rows written by older releases; a row that cannot be understood is skipped and logged, never fatal. */
  private async load(db: Pick<DrizzleDb, 'select'>, tenantId: string): Promise<PersistedProjectUi> {
    const [row] = await db.select().from(schema.tenantLayout).where(this.rowKey(tenantId)).limit(1);
    const revisionRows = await db
      .select()
      .from(schema.tenantLayoutRevisions)
      .where(and(eq(schema.tenantLayoutRevisions.tenantId, tenantId), eq(schema.tenantLayoutRevisions.scope, SCOPE), eq(schema.tenantLayoutRevisions.scopeId, SCOPE_ID)))
      .orderBy(asc(schema.tenantLayoutRevisions.revision));

    const components = this.registry.componentIds();
    const understand = (raw: unknown, what: string): ProjectUiConfig | null => {
      const upgraded = upgradeProjectUiConfig(raw);
      if (!upgraded.ok) {
        log.warn('Skipping layout config that cannot be upgraded', { tenantId, what, issues: upgraded.issues.slice(0, 3) });
        return null;
      }
      const valid = validateProjectUiConfig(upgraded.value, components);
      if (!valid.ok) {
        log.warn('Skipping invalid stored layout config', { tenantId, what, issues: valid.issues.slice(0, 3) });
        return null;
      }
      return valid.value;
    };

    const revisions: StoredRevision[] = [];
    for (const r of revisionRows) {
      const config = understand(r.config, `revision ${r.revision}`);
      if (config === null) continue;
      revisions.push({
        revision: r.revision,
        action: r.action === 'rollback' ? 'rollback' : 'publish',
        sourceRevision: r.sourceRevision,
        at: r.createdAt.toISOString(),
        by: r.createdBy,
        config,
      });
    }
    return { draft: row?.draft == null ? null : understand(row.draft, 'draft'), revisions };
  }

  private async write(
    tx: Pick<DrizzleDb, 'update' | 'insert'>,
    tenantId: string,
    before: PersistedProjectUi,
    after: PersistedProjectUi,
    actor: string | null,
  ): Promise<void> {
    const known = new Set(before.revisions.map((r) => r.revision));
    const added = after.revisions.filter((r) => !known.has(r.revision));
    if (added.length > 0) {
      await tx.insert(schema.tenantLayoutRevisions).values(
        added.map((r) => ({
          tenantId,
          scope: SCOPE,
          scopeId: SCOPE_ID,
          revision: r.revision,
          config: r.config,
          configVersion: r.config.layout.version,
          action: r.action,
          sourceRevision: r.sourceRevision,
          createdBy: r.by,
          createdAt: new Date(r.at),
        })),
      );
    }
    const latest = after.revisions[after.revisions.length - 1];
    const draftChanged = !layoutConfigsEqual(before.draft, after.draft);
    await tx
      .update(schema.tenantLayout)
      .set({
        ...(draftChanged ? { draft: after.draft, draftUpdatedBy: after.draft === null ? null : actor, draftUpdatedAt: after.draft === null ? null : new Date() } : {}),
        ...(added.length > 0 && latest !== undefined
          ? { published: latest.config, publishedRevision: latest.revision, publishedBy: latest.by, publishedAt: new Date(latest.at) }
          : {}),
      })
      .where(this.rowKey(tenantId));
  }
}
