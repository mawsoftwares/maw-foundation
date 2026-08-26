import type { PgClient } from '@maw/database';
import type { PaginatedResult } from '@maw/sdk/config/constants';
import type { Master, MasterField, MasterValue, MasterOption } from './entities';
import type {
  CreateMasterInput, UpdateMasterInput,
  CreateFieldInput, UpdateFieldInput,
  CreateValueInput, UpdateValueInput,
  MasterListQuery, ValueListQuery,
  OperationContext,
} from './dto';

export interface IMasterRepository {
  findById(tenantId: string, id: string, client?: PgClient): Promise<Master | null>;
  findByCode(tenantId: string, code: string, client?: PgClient): Promise<Master | null>;
  list(tenantId: string, query: MasterListQuery, client?: PgClient): Promise<PaginatedResult<Master>>;
  create(tenantId: string, input: CreateMasterInput, ctx: OperationContext, client?: PgClient): Promise<Master>;
  update(tenantId: string, id: string, input: UpdateMasterInput, ctx: OperationContext, client?: PgClient): Promise<Master>;
  softDelete(tenantId: string, id: string, ctx: OperationContext, client?: PgClient): Promise<boolean>;
  restore(tenantId: string, id: string, ctx: OperationContext, client?: PgClient): Promise<boolean>;
}

export interface IMasterFieldRepository {
  findById(masterId: string, id: string, client?: PgClient): Promise<MasterField | null>;
  findByCode(masterId: string, code: string, client?: PgClient): Promise<MasterField | null>;
  listByMaster(masterId: string, client?: PgClient): Promise<MasterField[]>;
  create(masterId: string, input: CreateFieldInput, ctx: OperationContext, client?: PgClient): Promise<MasterField>;
  update(masterId: string, id: string, input: UpdateFieldInput, ctx: OperationContext, client?: PgClient): Promise<MasterField>;
  softDelete(masterId: string, id: string, client?: PgClient): Promise<boolean>;
}

export interface IMasterValueRepository {
  findById(masterId: string, id: string, client?: PgClient): Promise<MasterValue | null>;
  findByCode(masterId: string, code: string, client?: PgClient): Promise<MasterValue | null>;
  list(masterId: string, query: ValueListQuery, client?: PgClient): Promise<PaginatedResult<MasterValue>>;
  options(masterId: string, search?: string, client?: PgClient): Promise<MasterOption[]>;
  create(masterId: string, input: CreateValueInput, ctx: OperationContext, client?: PgClient): Promise<MasterValue>;
  createBulk(masterId: string, inputs: readonly CreateValueInput[], ctx: OperationContext, client?: PgClient): Promise<MasterValue[]>;
  update(masterId: string, id: string, input: UpdateValueInput, ctx: OperationContext, client?: PgClient): Promise<MasterValue>;
  softDelete(masterId: string, id: string, client?: PgClient): Promise<boolean>;
  restore(masterId: string, id: string, client?: PgClient): Promise<boolean>;
  reorder(masterId: string, valueIds: readonly string[], client?: PgClient): Promise<void>;
}
