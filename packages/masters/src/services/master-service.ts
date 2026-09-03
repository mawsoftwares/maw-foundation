import type { DrizzleDb } from '@mawsoftwares/database';
import type { Logger } from '@mawsoftwares/sdk/kernel/logger';
import { createLogger } from '@mawsoftwares/sdk/kernel/logger';
import type { PaginatedResult } from '@mawsoftwares/sdk/config/constants';
import type {
  Master, MasterField, MasterValue, MasterOption,
} from '../types/entities';
import type {
  CreateMasterInput, UpdateMasterInput,
  CreateFieldInput, UpdateFieldInput,
  CreateValueInput, UpdateValueInput,
  MasterListQuery, ValueListQuery,
  OperationContext,
} from '../types/dto';
import type {
  IMasterRepository, IMasterFieldRepository, IMasterValueRepository,
} from '../types/ports';
import {
  masterNotFound, masterCodeExists, masterSystemProtected,
  fieldNotFound, fieldCodeExists,
  valueNotFound, valueCodeExists,
  referenceInvalid,
} from '../errors/index';
import { validateCreateMaster, validateCreateField, validateCreateValue } from '../validation/index';

export interface MasterServiceOptions {
  readonly db: DrizzleDb;
  readonly masterRepo: IMasterRepository;
  readonly fieldRepo: IMasterFieldRepository;
  readonly valueRepo: IMasterValueRepository;
  readonly logger?: Logger;
}

export class MasterService {
  private readonly db: DrizzleDb;
  private readonly masters: IMasterRepository;
  private readonly fields: IMasterFieldRepository;
  private readonly values: IMasterValueRepository;
  private readonly log: Logger;

  constructor(opts: MasterServiceOptions) {
    this.db = opts.db;
    this.masters = opts.masterRepo;
    this.fields = opts.fieldRepo;
    this.values = opts.valueRepo;
    this.log = opts.logger ?? createLogger('masters');
  }

  // ─── Master CRUD ───────────────────────────────────────────────────────────

  async getMaster(tenantId: string, id: string): Promise<Master> {
    const master = await this.masters.findById(tenantId, id);
    if (!master) throw masterNotFound(id);
    return master;
  }

  async getMasterByCode(tenantId: string, code: string): Promise<Master> {
    const master = await this.masters.findByCode(tenantId, code);
    if (!master) throw masterNotFound(code);
    return master;
  }

  async listMasters(tenantId: string, query: MasterListQuery): Promise<PaginatedResult<Master>> {
    return this.masters.list(tenantId, query);
  }

  async createMaster(tenantId: string, input: CreateMasterInput, ctx: OperationContext): Promise<Master> {
    validateCreateMaster(input);

    const existing = await this.masters.findByCode(tenantId, input.code);
    if (existing) throw masterCodeExists(input.code);

    const master = await this.masters.create(tenantId, input, ctx);
    this.log.info('Master created', { id: master.id, code: master.code, tenantId });
    return master;
  }

  async updateMaster(tenantId: string, id: string, input: UpdateMasterInput, ctx: OperationContext): Promise<Master> {
    const existing = await this.masters.findById(tenantId, id);
    if (!existing) throw masterNotFound(id);
    if (existing.isSystem) throw masterSystemProtected(existing.code);

    const updated = await this.masters.update(tenantId, id, input, ctx);
    this.log.info('Master updated', { id, tenantId });
    return updated;
  }

  async deleteMaster(tenantId: string, id: string, ctx: OperationContext): Promise<void> {
    const existing = await this.masters.findById(tenantId, id);
    if (!existing) throw masterNotFound(id);
    if (existing.isSystem) throw masterSystemProtected(existing.code);

    await this.masters.softDelete(tenantId, id, ctx);
    this.log.info('Master deleted', { id, tenantId });
  }

  async restoreMaster(tenantId: string, id: string, ctx: OperationContext): Promise<void> {
    const restored = await this.masters.restore(tenantId, id, ctx);
    if (!restored) throw masterNotFound(id);
    this.log.info('Master restored', { id, tenantId });
  }

  // ─── Fields ────────────────────────────────────────────────────────────────

  async listFields(tenantId: string, masterId: string): Promise<MasterField[]> {
    await this.getMaster(tenantId, masterId);
    return this.fields.listByMaster(masterId);
  }

  async createField(tenantId: string, masterId: string, input: CreateFieldInput, ctx: OperationContext): Promise<MasterField> {
    await this.getMaster(tenantId, masterId);
    validateCreateField(input);

    const existing = await this.fields.findByCode(masterId, input.code);
    if (existing) throw fieldCodeExists(input.code, masterId);

    if (input.config?.referenceMaster) {
      const refMaster = await this.masters.findByCode(tenantId, input.config.referenceMaster);
      if (!refMaster) throw referenceInvalid(input.code, input.config.referenceMaster);
    }

    return this.fields.create(masterId, input, ctx);
  }

  async updateField(tenantId: string, masterId: string, fieldId: string, input: UpdateFieldInput, ctx: OperationContext): Promise<MasterField> {
    await this.getMaster(tenantId, masterId);
    const existing = await this.fields.findById(masterId, fieldId);
    if (!existing) throw fieldNotFound(fieldId);

    return this.fields.update(masterId, fieldId, input, ctx);
  }

  async deleteField(tenantId: string, masterId: string, fieldId: string): Promise<void> {
    await this.getMaster(tenantId, masterId);
    const deleted = await this.fields.softDelete(masterId, fieldId);
    if (!deleted) throw fieldNotFound(fieldId);
  }

  // ─── Values ────────────────────────────────────────────────────────────────

  async listValues(tenantId: string, masterId: string, query: ValueListQuery): Promise<PaginatedResult<MasterValue>> {
    await this.getMaster(tenantId, masterId);
    return this.values.list(masterId, query);
  }

  async getOptions(tenantId: string, masterCode: string, search?: string): Promise<MasterOption[]> {
    const master = await this.getMasterByCode(tenantId, masterCode);
    return this.values.options(master.id, search);
  }

  async createValue(tenantId: string, masterId: string, input: CreateValueInput, ctx: OperationContext): Promise<MasterValue> {
    await this.getMaster(tenantId, masterId);
    validateCreateValue(input);

    const existing = await this.values.findByCode(masterId, input.code);
    if (existing) throw valueCodeExists(input.code, masterId);

    return this.values.create(masterId, input, ctx);
  }

  async createValuesBulk(tenantId: string, masterId: string, inputs: readonly CreateValueInput[], ctx: OperationContext): Promise<MasterValue[]> {
    await this.getMaster(tenantId, masterId);
    for (const input of inputs) validateCreateValue(input);

    return this.db.transaction(async (tx) => {
      const results: MasterValue[] = [];
      for (const input of inputs) {
        const existing = await this.values.findByCode(masterId, input.code, tx);
        if (existing) throw valueCodeExists(input.code, masterId);
        results.push(await this.values.create(masterId, input, ctx, tx));
      }
      return results;
    });
  }

  async updateValue(tenantId: string, masterId: string, valueId: string, input: UpdateValueInput, ctx: OperationContext): Promise<MasterValue> {
    await this.getMaster(tenantId, masterId);
    const existing = await this.values.findById(masterId, valueId);
    if (!existing) throw valueNotFound(valueId);

    return this.values.update(masterId, valueId, input, ctx);
  }

  async deleteValue(tenantId: string, masterId: string, valueId: string): Promise<void> {
    await this.getMaster(tenantId, masterId);
    const deleted = await this.values.softDelete(masterId, valueId);
    if (!deleted) throw valueNotFound(valueId);
  }

  async restoreValue(tenantId: string, masterId: string, valueId: string): Promise<void> {
    await this.getMaster(tenantId, masterId);
    const restored = await this.values.restore(masterId, valueId);
    if (!restored) throw valueNotFound(valueId);
  }

  async reorderValues(tenantId: string, masterId: string, valueIds: readonly string[]): Promise<void> {
    await this.getMaster(tenantId, masterId);
    await this.values.reorder(masterId, valueIds);
  }
}
