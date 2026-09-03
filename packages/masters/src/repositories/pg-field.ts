import type { DrizzleDb, DrizzleTxn } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { withPgErrorTranslation } from '@mawsoftwares/database';
import { eq, and, isNull, asc } from 'drizzle-orm';
import type { MasterField } from '../types/entities';
import type { CreateFieldInput, UpdateFieldInput, OperationContext } from '../types/dto';
import type { IMasterFieldRepository } from '../types/ports';

type FieldRow = typeof schema.masterFields.$inferSelect;

function toField(row: FieldRow): MasterField {
  return {
    id: row.id,
    masterId: row.masterId,
    code: row.code,
    name: row.name,
    dataType: row.dataType as MasterField['dataType'],
    isRequired: row.isRequired,
    isUnique: row.isUnique,
    isSearchable: row.isSearchable,
    isFilterable: row.isFilterable,
    displayOrder: row.displayOrder,
    defaultValue: row.defaultValue,
    config: row.config as MasterField['config'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

const f = schema.masterFields;

export class PgMasterFieldRepository implements IMasterFieldRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(masterId: string, id: string, tx?: DrizzleTxn): Promise<MasterField | null> {
    const db = tx ?? this.db;
    const rows = await db
      .select().from(f)
      .where(and(eq(f.masterId, masterId), eq(f.id, id), isNull(f.deletedAt)))
      .limit(1);
    return rows[0] ? toField(rows[0]) : null;
  }

  async findByCode(masterId: string, code: string, tx?: DrizzleTxn): Promise<MasterField | null> {
    const db = tx ?? this.db;
    const rows = await db
      .select().from(f)
      .where(and(eq(f.masterId, masterId), eq(f.code, code), isNull(f.deletedAt)))
      .limit(1);
    return rows[0] ? toField(rows[0]) : null;
  }

  async listByMaster(masterId: string, tx?: DrizzleTxn): Promise<MasterField[]> {
    const db = tx ?? this.db;
    const rows = await db
      .select().from(f)
      .where(and(eq(f.masterId, masterId), isNull(f.deletedAt)))
      .orderBy(asc(f.displayOrder), asc(f.name));
    return rows.map(toField);
  }

  async create(masterId: string, input: CreateFieldInput, ctx: OperationContext, tx?: DrizzleTxn): Promise<MasterField> {
    const db = tx ?? this.db;
    const rows = await withPgErrorTranslation(() =>
      db.insert(f).values({
        masterId,
        code: input.code,
        name: input.name,
        dataType: input.dataType,
        isRequired: input.isRequired ?? false,
        isUnique: input.isUnique ?? false,
        isSearchable: input.isSearchable ?? false,
        isFilterable: input.isFilterable ?? false,
        displayOrder: input.displayOrder ?? 0,
        defaultValue: input.defaultValue ?? null,
        config: input.config ? JSON.parse(JSON.stringify(input.config)) : null,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      }).returning(),
    );
    return toField(rows[0]!);
  }

  async update(masterId: string, id: string, input: UpdateFieldInput, ctx: OperationContext, tx?: DrizzleTxn): Promise<MasterField> {
    const db = tx ?? this.db;
    const setData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.userId,
    };
    if (input.name !== undefined) setData.name = input.name;
    if (input.dataType !== undefined) setData.dataType = input.dataType;
    if (input.isRequired !== undefined) setData.isRequired = input.isRequired;
    if (input.isUnique !== undefined) setData.isUnique = input.isUnique;
    if (input.isSearchable !== undefined) setData.isSearchable = input.isSearchable;
    if (input.isFilterable !== undefined) setData.isFilterable = input.isFilterable;
    if (input.displayOrder !== undefined) setData.displayOrder = input.displayOrder;
    if (input.defaultValue !== undefined) setData.defaultValue = input.defaultValue;
    if (input.config !== undefined) setData.config = input.config ? JSON.parse(JSON.stringify(input.config)) : null;

    const rows = await withPgErrorTranslation(() =>
      db.update(f).set(setData)
        .where(and(eq(f.masterId, masterId), eq(f.id, id), isNull(f.deletedAt)))
        .returning(),
    );
    return toField(rows[0]!);
  }

  async softDelete(masterId: string, id: string, tx?: DrizzleTxn): Promise<boolean> {
    const db = tx ?? this.db;
    const rows = await db
      .update(f)
      .set({ deletedAt: new Date() })
      .where(and(eq(f.masterId, masterId), eq(f.id, id), isNull(f.deletedAt)))
      .returning({ id: f.id });
    return rows.length > 0;
  }
}
