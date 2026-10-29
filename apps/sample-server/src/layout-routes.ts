import { createApiRouter } from '@mawsoftwares/server-express';
import type { RequestHandler } from 'express';
import { ok, type Controller } from '@mawsoftwares/api';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@mawsoftwares/sdk/kernel/errors';
import type { IAuditStore } from '@mawsoftwares/audit';
import { ProjectUiStoreError, type LayoutIssue } from '@mawsoftwares/layout';
import type { LayoutStore } from './layout-store';

/** A project UI config is a few hundred bytes; anything near this is not one. */
export const MAX_LAYOUT_BODY_BYTES = 32 * 1024;

function tenantAndUser(context: { tenantId?: string; userId?: string }): { tenantId: string; userId: string } {
  if (!context.tenantId || !context.userId) throw new UnauthorizedError('Tenant context required');
  return { tenantId: context.tenantId, userId: context.userId };
}

/** Domain errors → the platform's AppError, so the standard envelope and field highlighting apply. */
async function translate<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (e) {
    if (e instanceof ProjectUiStoreError) {
      if (e.code === 'INVALID') throw new ValidationError(e.issues.map((i: LayoutIssue) => ({ field: i.path, error: i.message })), e.message);
      if (e.code === 'NO_DRAFT') throw new ConflictError('There is no saved draft to publish.');
      throw new NotFoundError('Layout revision');
    }
    throw e;
  }
}

export function createLayoutRouter(
  store: LayoutStore,
  deps: {
    requireAuth: RequestHandler;
    requirePermission: (perm: string) => RequestHandler;
    auditStore?: IAuditStore;
  },
) {
  const audit = (context: { tenantId?: string; userId?: string; ipAddress?: string }, action: string, details: Record<string, unknown>): void => {
    if (deps.auditStore === undefined || !context.tenantId || !context.userId) return;
    void deps.auditStore.record({
      tenantId: context.tenantId,
      userId: context.userId,
      action,
      resource: 'layout',
      resourceId: undefined,
      details,
      ip: context.ipAddress,
    });
  };

  // Every signed-in user needs the LIVE layout to render the app. It never includes the draft, history or who changed it.
  const getPublished: Controller = async ({ context }) => {
    const { tenantId } = tenantAndUser(context);
    return ok(await store.getPublished(tenantId));
  };

  const getStudio: Controller = async ({ context }) => {
    const { tenantId } = tenantAndUser(context);
    return ok(await store.load(tenantId));
  };

  const saveDraft: Controller = async ({ body, context }) => {
    const { tenantId, userId } = tenantAndUser(context);
    if (JSON.stringify(body ?? null).length > MAX_LAYOUT_BODY_BYTES) {
      throw new ValidationError([{ field: '', error: 'The layout configuration is too large.' }]);
    }
    const state = await translate(store.saveDraft(tenantId, body, userId));
    audit(context, 'layout.draft.save', { preset: state.draft?.layout.presetId ?? null });
    return ok(state);
  };

  const discardDraft: Controller = async ({ context }) => {
    const { tenantId, userId } = tenantAndUser(context);
    const state = await store.discardDraft(tenantId, userId);
    audit(context, 'layout.draft.discard', {});
    return ok(state);
  };

  const publish: Controller = async ({ context }) => {
    const { tenantId, userId } = tenantAndUser(context);
    const state = await translate(store.publish(tenantId, userId));
    audit(context, 'layout.publish', { revision: state.publishedRevision, preset: state.published?.layout.presetId ?? null });
    return ok(state);
  };

  const rollback: Controller = async ({ body, context }) => {
    const { tenantId, userId } = tenantAndUser(context);
    const revision = (body as { revision?: unknown } | undefined)?.revision;
    if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 1) {
      throw new ValidationError([{ field: 'revision', error: 'Expected a positive whole number.' }]);
    }
    const state = await translate(store.rollback(tenantId, revision, userId));
    audit(context, 'layout.rollback', { toRevision: revision, newRevision: state.publishedRevision });
    return ok(state);
  };

  const { router, get, put, post, delete: destroy } = createApiRouter({ version: 'v1', prefix: '/api/v1/layout' });
  const { requireAuth, requirePermission } = deps;

  get('/', getPublished, { middleware: [requireAuth], metadata: { summary: 'Live layout for the signed-in tenant', tags: ['layout'] } });
  get('/studio', getStudio, { middleware: [requireAuth, requirePermission('Read_Layout')], metadata: { summary: 'Draft, live layout and history', tags: ['layout'] } });
  put('/draft', saveDraft, { middleware: [requireAuth, requirePermission('Update_Layout')], metadata: { summary: 'Save the draft layout', tags: ['layout'] } });
  destroy('/draft', discardDraft, { middleware: [requireAuth, requirePermission('Update_Layout')], metadata: { summary: 'Discard the draft layout', tags: ['layout'] } });
  post('/publish', publish, { middleware: [requireAuth, requirePermission('Publish_Layout')], metadata: { summary: 'Publish the saved draft', tags: ['layout'] } });
  post('/rollback', rollback, { middleware: [requireAuth, requirePermission('Publish_Layout')], metadata: { summary: 'Re-publish an earlier revision', tags: ['layout'] } });

  return router;
}
