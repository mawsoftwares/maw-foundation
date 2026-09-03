import type { DrizzleTxn } from '@mawsoftwares/database';
import type { PaginatedResult } from '@mawsoftwares/sdk/config/constants';
import type { Master, MasterField, MasterValue, MasterOption } from './entities';
import type {
  CreateMasterInput, UpdateMasterInput,
  CreateFieldInput, UpdateFieldInput,
  CreateValueInput, UpdateValueInput,
  MasterListQuery, ValueListQuery,
  OperationContext,
} from './dto';

export interface IMasterRepository {
  findById(tenantId: string, id: string, tx?: DrizzleTxn): Promise<Master | null>;
  findByCode(tenantId: string, code: string, tx?: DrizzleTxn): Promise<Master | null>;
  list(tenantId: string, query: MasterListQuery, tx?: DrizzleTxn): Promise<PaginatedResult<Master>>;
  create(tenantId: string, input: CreateMasterInput, ctx: OperationContext, tx?: DrizzleTxn): Promise<Master>;
  update(tenantId: string, id: string, input: UpdateMasterInput, ctx: OperationContext, tx?: DrizzleTxn): Promise<Master>;
  softDelete(tenantId: string, id: string, ctx: OperationContext, tx?: DrizzleTxn): Promise<boolean>;
  restore(tenantId: string, id: string, ctx: OperationContext, tx?: DrizzleTxn): Promise<boolean>;
}

export interface IMasterFieldRepository {
  findById(masterId: string, id: string, tx?: DrizzleTxn): Promise<MasterField | null>;
  findByCode(masterId: string, code: string, tx?: DrizzleTxn): Promise<MasterField | null>;
  listByMaster(masterId: string, tx?: DrizzleTxn): Promise<MasterField[]>;
  create(masterId: string, input: CreateFieldInput, ctx: OperationContext, tx?: DrizzleTxn): Promise<MasterField>;
  update(masterId: string, id: string, input: UpdateFieldInput, ctx: OperationContext, tx?: DrizzleTxn): Promise<MasterField>;
  softDelete(masterId: string, id: string, tx?: DrizzleTxn): Promise<boolean>;
}

export interface IMasterValueRepository {
  findById(masterId: string, id: string, tx?: DrizzleTxn): Promise<MasterValue | null>;
  findByCode(masterId: string, code: string, tx?: DrizzleTxn): Promise<MasterValue | null>;
  list(masterId: string, query: ValueListQuery, tx?: DrizzleTxn): Promise<PaginatedResult<MasterValue>>;
  options(masterId: string, search?: string, tx?: DrizzleTxn): Promise<MasterOption[]>;
  create(masterId: string, input: CreateValueInput, ctx: OperationContext, tx?: DrizzleTxn): Promise<MasterValue>;
  createBulk(masterId: string, inputs: readonly CreateValueInput[], ctx: OperationContext, tx?: DrizzleTxn): Promise<MasterValue[]>;
  update(masterId: string, id: string, input: UpdateValueInput, ctx: OperationContext, tx?: DrizzleTxn): Promise<MasterValue>;
  softDelete(masterId: string, id: string, tx?: DrizzleTxn): Promise<boolean>;
  restore(masterId: string, id: string, tx?: DrizzleTxn): Promise<boolean>;
  reorder(masterId: string, valueIds: readonly string[], tx?: DrizzleTxn): Promise<void>;
}
