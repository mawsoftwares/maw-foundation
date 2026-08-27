import { createApiRouter } from '@mawsoftwares/server-express';
import type { RequestHandler } from 'express';
import type { MasterService } from '@mawsoftwares/masters';
import { createMasterControllers } from './controller';

export function createMastersRouter(deps: {
  service: MasterService;
  requireAuth: RequestHandler;
  requirePermission: (perm: string) => RequestHandler;
}) {
  const ctrl = createMasterControllers(deps.service);

  const { router, get, post, put, delete: destroy } = createApiRouter({
    version: 'v1',
    prefix: '/api/v1/masters',
  });

  // Masters CRUD
  get('/', ctrl.listMasters, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_View')],
    metadata: { summary: 'List masters', tags: ['masters'] },
  });

  get('/:id', ctrl.getMaster, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_View')],
    metadata: { summary: 'Get master by ID', tags: ['masters'] },
  });

  post('/', ctrl.createMaster, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_Create')],
    metadata: { summary: 'Create master', tags: ['masters'] },
  });

  put('/:id', ctrl.updateMaster, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_Edit')],
    metadata: { summary: 'Update master', tags: ['masters'] },
  });

  destroy('/:id', ctrl.deleteMaster, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_Delete')],
    metadata: { summary: 'Delete master', tags: ['masters'] },
  });

  // Options (lightweight dropdown API)
  get('/options/:code', ctrl.getOptions, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_View')],
    metadata: { summary: 'Get master options for dropdown', tags: ['masters'] },
  });

  // Fields
  get('/:masterId/fields', ctrl.listFields, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_View')],
    metadata: { summary: 'List fields', tags: ['masters', 'fields'] },
  });

  post('/:masterId/fields', ctrl.createField, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_Manage_Fields')],
    metadata: { summary: 'Create field', tags: ['masters', 'fields'] },
  });

  put('/:masterId/fields/:fieldId', ctrl.updateField, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_Manage_Fields')],
    metadata: { summary: 'Update field', tags: ['masters', 'fields'] },
  });

  destroy('/:masterId/fields/:fieldId', ctrl.deleteField, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_Manage_Fields')],
    metadata: { summary: 'Delete field', tags: ['masters', 'fields'] },
  });

  // Values
  get('/:masterId/values', ctrl.listValues, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_View')],
    metadata: { summary: 'List values', tags: ['masters', 'values'] },
  });

  post('/:masterId/values', ctrl.createValue, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_Manage_Values')],
    metadata: { summary: 'Create value', tags: ['masters', 'values'] },
  });

  post('/:masterId/values/bulk', ctrl.createBulkValues, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_Manage_Values')],
    metadata: { summary: 'Bulk create values', tags: ['masters', 'values'] },
  });

  put('/:masterId/values/:valueId', ctrl.updateValue, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_Manage_Values')],
    metadata: { summary: 'Update value', tags: ['masters', 'values'] },
  });

  destroy('/:masterId/values/:valueId', ctrl.deleteValue, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_Manage_Values')],
    metadata: { summary: 'Delete value', tags: ['masters', 'values'] },
  });

  post('/:masterId/values/reorder', ctrl.reorderValues, {
    middleware: [deps.requireAuth, deps.requirePermission('Master_Manage_Values')],
    metadata: { summary: 'Reorder values', tags: ['masters', 'values'] },
  });

  return router;
}
