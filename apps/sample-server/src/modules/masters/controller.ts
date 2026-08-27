import type { Controller } from '@mawsoftwares/api';
import { ok, created, paginated } from '@mawsoftwares/api';
import type { MasterService } from '@mawsoftwares/masters';
import type {
  CreateMasterInput, UpdateMasterInput,
  CreateFieldInput, UpdateFieldInput,
  CreateValueInput, UpdateValueInput,
  MasterListQuery, ValueListQuery,
} from '@mawsoftwares/masters';

type P = { id: string; code: string; masterId: string; fieldId: string; valueId: string };

export function createMasterControllers(service: MasterService) {
  const listMasters: Controller = async ({ query, context }) => {
    const tenantId = context.tenantId!;
    const listQuery: MasterListQuery = {
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      search: query.search as string | undefined,
      sortBy: query.sortBy as string | undefined,
      sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
      status: query.status as 'active' | 'inactive' | undefined,
      isSystem: query.isSystem === 'true' ? true : query.isSystem === 'false' ? false : undefined,
    };
    const result = await service.listMasters(tenantId, listQuery);
    return paginated(result);
  };

  const getMaster: Controller = async ({ params: raw, context }) => {
    const params = raw as unknown as P;
    const master = await service.getMaster(context.tenantId!, params.id);
    return ok(master);
  };

  const createMaster: Controller = async ({ body, context }) => {
    const tenantId = context.tenantId!;
    const userId = context.userId!;
    const master = await service.createMaster(tenantId, body as CreateMasterInput, { tenantId, userId });
    return created(master, 'Master created');
  };

  const updateMaster: Controller = async ({ params: raw, body, context }) => {
    const params = raw as unknown as P;
    const tenantId = context.tenantId!;
    const userId = context.userId!;
    const master = await service.updateMaster(tenantId, params.id, body as UpdateMasterInput, { tenantId, userId });
    return ok(master);
  };

  const deleteMaster: Controller = async ({ params: raw, context }) => {
    const params = raw as unknown as P;
    const tenantId = context.tenantId!;
    const userId = context.userId!;
    await service.deleteMaster(tenantId, params.id, { tenantId, userId });
    return ok({ deleted: true });
  };

  const getOptions: Controller = async ({ params: raw, query, context }) => {
    const params = raw as unknown as P;
    const options = await service.getOptions(context.tenantId!, params.code, query.search as string | undefined);
    return ok(options);
  };

  const listFields: Controller = async ({ params: raw, context }) => {
    const params = raw as unknown as P;
    const fields = await service.listFields(context.tenantId!, params.masterId);
    return ok(fields);
  };

  const createField: Controller = async ({ params: raw, body, context }) => {
    const params = raw as unknown as P;
    const tenantId = context.tenantId!;
    const userId = context.userId!;
    const field = await service.createField(tenantId, params.masterId, body as CreateFieldInput, { tenantId, userId });
    return created(field, 'Field created');
  };

  const updateField: Controller = async ({ params: raw, body, context }) => {
    const params = raw as unknown as P;
    const tenantId = context.tenantId!;
    const userId = context.userId!;
    const field = await service.updateField(tenantId, params.masterId, params.fieldId, body as UpdateFieldInput, { tenantId, userId });
    return ok(field);
  };

  const deleteField: Controller = async ({ params: raw, context }) => {
    const params = raw as unknown as P;
    await service.deleteField(context.tenantId!, params.masterId, params.fieldId);
    return ok({ deleted: true });
  };

  const listValues: Controller = async ({ params: raw, query, context }) => {
    const params = raw as unknown as P;
    const listQuery: ValueListQuery = {
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      search: query.search as string | undefined,
      isActive: query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
    };
    const result = await service.listValues(context.tenantId!, params.masterId, listQuery);
    return paginated(result);
  };

  const createValue: Controller = async ({ params: raw, body, context }) => {
    const params = raw as unknown as P;
    const tenantId = context.tenantId!;
    const userId = context.userId!;
    const value = await service.createValue(tenantId, params.masterId, body as CreateValueInput, { tenantId, userId });
    return created(value, 'Value created');
  };

  const createBulkValues: Controller = async ({ params: raw, body, context }) => {
    const params = raw as unknown as P;
    const tenantId = context.tenantId!;
    const userId = context.userId!;
    const { values } = body as { values: CreateValueInput[] };
    const result = await service.createValuesBulk(tenantId, params.masterId, values, { tenantId, userId });
    return created(result, 'Values created');
  };

  const updateValue: Controller = async ({ params: raw, body, context }) => {
    const params = raw as unknown as P;
    const tenantId = context.tenantId!;
    const userId = context.userId!;
    const value = await service.updateValue(tenantId, params.masterId, params.valueId, body as UpdateValueInput, { tenantId, userId });
    return ok(value);
  };

  const deleteValue: Controller = async ({ params: raw, context }) => {
    const params = raw as unknown as P;
    await service.deleteValue(context.tenantId!, params.masterId, params.valueId);
    return ok({ deleted: true });
  };

  const reorderValues: Controller = async ({ params: raw, body, context }) => {
    const params = raw as unknown as P;
    const { valueIds } = body as { valueIds: string[] };
    await service.reorderValues(context.tenantId!, params.masterId, valueIds);
    return ok({ reordered: true });
  };

  return {
    listMasters, getMaster, createMaster, updateMaster, deleteMaster, getOptions,
    listFields, createField, updateField, deleteField,
    listValues, createValue, createBulkValues, updateValue, deleteValue, reorderValues,
  };
}
