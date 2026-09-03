import type { DrizzleDb, DrizzleTxn } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { withPgErrorTranslation } from '@mawsoftwares/database';
import type { AnyColumn } from 'drizzle-orm';
import { eq, and, isNull, isNotNull, ilike, count, asc, desc, sql } from 'drizzle-orm';
import { paginate, type PaginatedResult, Pagination } from '@mawsoftwares/sdk/config/constants';
import type { MasterValue, MasterOption } from '../types/entities';
import type { CreateValueInput, UpdateValueInput, ValueListQuery, OperationContext } from '../types/dto';
import type { IMasterValueRepository } from '../types/ports';

type ValueRow = typeof schema.masterValues.$inferSelect;

function toValue(row: ValueRow): MasterValue {
  return {
    id: row.id,
    masterId: row.masterId,
    code: row.code,
    label: row.label,
    value: row.value,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    version: row.version,
  };
}

const v = schema.masterValues;

export class PgMasterValueRepository implements IMasterValueRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(masterId: string, id: string, tx?: DrizzleTxn): Promise<MasterValue | null> {
    const db = tx ?? this.db;
    const rows = await db
      .select().from(v)
      .where(and(eq(v.masterId, masterId), eq(v.id, id), isNull(v.deletedAt)))
      .limit(1);
    return rows[0] ? toValue(rows[0]) : null;
  }

  async findByCode(masterId: string, code: string, tx?: DrizzleTxn): Promise<MasterValue | null> {
    const db = tx ?? this.db;
    const rows = await db
      .select().from(v)
      .where(and(eq(v.masterId, masterId), eq(v.code, code), isNull(v.deletedAt)))
      .limit(1);
    return rows[0] ? toValue(rows[0]) : null;
  }

  async list(masterId: string, query: ValueListQuery, tx?: DrizzleTxn): Promise<PaginatedResult<MasterValue>> {
    const db = tx ?? this.db;
    const page = query.page ?? Pagination.DEFAULT_PAGE;
    const pageSize = Math.min(query.pageSize ?? Pagination.DEFAULT_PAGE_SIZE, Pagination.MAX_PAGE_SIZE);
    const conditions = [eq(v.masterId, masterId), isNull(v.deletedAt)];

    if (query.isActive !== undefined) conditions.push(eq(v.isActive, query.isActive));
    if (!query.includeInactive) conditions.push(eq(v.isActive, true));
    if (query.search !== undefined) conditions.push(ilike(v.label, `%${query.search}%`));

    const where = and(...conditions);

    const countRows = await db.select({ count: count() }).from(v).where(where);
    const total = countRows[0]?.count ?? 0;

    const sortCol = this.getSortColumn(query.sortBy ?? 'sort_order');
    const orderFn = (query.sortOrder ?? 'asc') === 'desc' ? desc : asc;

    const rows = await db
      .select().from(v)
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return paginate(rows.map(toValue), total, page, pageSize);
  }

  async options(masterId: string, search?: string, tx?: DrizzleTxn): Promise<MasterOption[]> {
    const db = tx ?? this.db;
    const conditions = [eq(v.masterId, masterId), eq(v.isActive, true), isNull(v.deletedAt)];
    if (search) conditions.push(ilike(v.label, `%${search}%`));

    const rows = await db
      .select({ code: v.code, label: v.label, sortOrder: v.sortOrder })
      .from(v)
      .where(and(...conditions))
      .orderBy(asc(v.sortOrder), asc(v.label))
      .limit(500);

    return rows.map((r) => ({ value: r.code, label: r.label, sortOrder: r.sortOrder }));
  }

  async create(masterId: string, input: CreateValueInput, ctx: OperationContext, tx?: DrizzleTxn): Promise<MasterValue> {
    const db = tx ?? this.db;
    const rows = await withPgErrorTranslation(() =>
      db.insert(v).values({
        masterId,
        code: input.code,
        label: input.label,
        value: input.value ?? null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
        version: 1,
      }).returning(),
    );
    return toValue(rows[0]!);
  }

  async createBulk(masterId: string, inputs: readonly CreateValueInput[], ctx: OperationContext, tx?: DrizzleTxn): Promise<MasterValue[]> {
    const results: MasterValue[] = [];
    for (const input of inputs) {
      results.push(await this.create(masterId, input, ctx, tx));
    }
    return results;
  }

  async update(masterId: string, id: string, input: UpdateValueInput, ctx: OperationContext, tx?: DrizzleTxn): Promise<MasterValue> {
    const db = tx ?? this.db;
    const setData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.userId,
      version: sql`${v.version} + 1`,
    };
    if (input.label !== undefined) setData.label = input.label;
    if (input.value !== undefined) setData.value = input.value;
    if (input.sortOrder !== undefined) setData.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) setData.isActive = input.isActive;
    if (input.metadata !== undefined) setData.metadata = input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null;

    const rows = await withPgErrorTranslation(() =>
      db.update(v).set(setData)
        .where(and(eq(v.masterId, masterId), eq(v.id, id), isNull(v.deletedAt)))
        .returning(),
    );
    return toValue(rows[0]!);
  }

  async softDelete(masterId: string, id: string, tx?: DrizzleTxn): Promise<boolean> {
    const db = tx ?? this.db;
    const rows = await db
      .update(v)
      .set({ deletedAt: new Date() })
      .where(and(eq(v.masterId, masterId), eq(v.id, id), isNull(v.deletedAt)))
      .returning({ id: v.id });
    return rows.length > 0;
  }

  async restore(masterId: string, id: string, tx?: DrizzleTxn): Promise<boolean> {
    const db = tx ?? this.db;
    const rows = await db
      .update(v)
      .set({ deletedAt: null })
      .where(and(eq(v.masterId, masterId), eq(v.id, id), isNotNull(v.deletedAt)))
      .returning({ id: v.id });
    return rows.length > 0;
  }

  async reorder(masterId: string, valueIds: readonly string[], tx?: DrizzleTxn): Promise<void> {
    const db = tx ?? this.db;
    for (let i = 0; i < valueIds.length; i++) {
      await db
        .update(v)
        .set({ sortOrder: i + 1, updatedAt: new Date() })
        .where(and(eq(v.masterId, masterId), eq(v.id, valueIds[i]!), isNull(v.deletedAt)));
    }
  }

  private getSortColumn(sortBy: string): AnyColumn {
    const map: Record<string, AnyColumn> = {
      sort_order: v.sortOrder,
      label: v.label,
      code: v.code,
      created_at: v.createdAt,
    };
    return map[sortBy] ?? v.sortOrder;
  }
}
