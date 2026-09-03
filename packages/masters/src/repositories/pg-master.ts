import type { DrizzleDb, DrizzleTxn } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { withPgErrorTranslation } from '@mawsoftwares/database';
import type { AnyColumn } from 'drizzle-orm';
import { eq, and, isNull, isNotNull, ilike, count, asc, desc, sql } from 'drizzle-orm';
import { paginate, type PaginatedResult, Pagination } from '@mawsoftwares/sdk/config/constants';
import type { Master } from '../types/entities';
import type { CreateMasterInput, UpdateMasterInput, MasterListQuery, OperationContext } from '../types/dto';
import type { IMasterRepository } from '../types/ports';
import { masterNotFound } from '../errors/index';

type MasterRow = typeof schema.masters.$inferSelect;

function toMaster(row: MasterRow): Master {
  return {
    id: row.id,
    tenantId: row.tenantId,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status as Master['status'],
    isSystem: row.isSystem,
    allowCustomValues: row.allowCustomValues,
    config: row.config as Master['config'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    version: row.version,
  };
}

const t = schema.masters;

export class PgMasterRepository implements IMasterRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(tenantId: string, id: string, tx?: DrizzleTxn): Promise<Master | null> {
    const db = tx ?? this.db;
    const rows = await db
      .select().from(t)
      .where(and(eq(t.tenantId, tenantId), eq(t.id, id), isNull(t.deletedAt)))
      .limit(1);
    return rows[0] ? toMaster(rows[0]) : null;
  }

  async findByCode(tenantId: string, code: string, tx?: DrizzleTxn): Promise<Master | null> {
    const db = tx ?? this.db;
    const rows = await db
      .select().from(t)
      .where(and(eq(t.tenantId, tenantId), eq(t.code, code), isNull(t.deletedAt)))
      .limit(1);
    return rows[0] ? toMaster(rows[0]) : null;
  }

  async list(tenantId: string, query: MasterListQuery, tx?: DrizzleTxn): Promise<PaginatedResult<Master>> {
    const db = tx ?? this.db;
    const page = query.page ?? Pagination.DEFAULT_PAGE;
    const pageSize = Math.min(query.pageSize ?? Pagination.DEFAULT_PAGE_SIZE, Pagination.MAX_PAGE_SIZE);
    const conditions = [eq(t.tenantId, tenantId), isNull(t.deletedAt)];

    if (query.status !== undefined) conditions.push(eq(t.status, query.status));
    if (query.isSystem !== undefined) conditions.push(eq(t.isSystem, query.isSystem));
    if (query.search !== undefined) conditions.push(ilike(t.name, `%${query.search}%`));

    const where = and(...conditions);

    const countRows = await db.select({ count: count() }).from(t).where(where);
    const total = countRows[0]?.count ?? 0;

    const sortCol = this.getSortColumn(query.sortBy ?? 'name');
    const orderFn = (query.sortOrder ?? 'asc') === 'desc' ? desc : asc;

    const rows = await db
      .select().from(t)
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return paginate(rows.map(toMaster), total, page, pageSize);
  }

  async create(tenantId: string, input: CreateMasterInput, ctx: OperationContext, tx?: DrizzleTxn): Promise<Master> {
    const db = tx ?? this.db;
    const rows = await withPgErrorTranslation(() =>
      db.insert(t).values({
        tenantId,
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        status: 'active',
        isSystem: input.isSystem ?? false,
        allowCustomValues: input.allowCustomValues ?? true,
        config: input.config ? JSON.parse(JSON.stringify(input.config)) : null,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
        version: 1,
      }).returning(),
    );
    return toMaster(rows[0]!);
  }

  async update(tenantId: string, id: string, input: UpdateMasterInput, ctx: OperationContext, tx?: DrizzleTxn): Promise<Master> {
    const db = tx ?? this.db;
    const setData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: ctx.userId,
      version: sql`${t.version} + 1`,
    };
    if (input.name !== undefined) setData.name = input.name;
    if (input.description !== undefined) setData.description = input.description;
    if (input.status !== undefined) setData.status = input.status;
    if (input.allowCustomValues !== undefined) setData.allowCustomValues = input.allowCustomValues;
    if (input.config !== undefined) setData.config = input.config ? JSON.parse(JSON.stringify(input.config)) : null;

    const rows = await withPgErrorTranslation(() =>
      db.update(t).set(setData)
        .where(and(eq(t.tenantId, tenantId), eq(t.id, id), isNull(t.deletedAt)))
        .returning(),
    );
    if (!rows[0]) throw masterNotFound(id);
    return toMaster(rows[0]);
  }

  async softDelete(tenantId: string, id: string, ctx: OperationContext, tx?: DrizzleTxn): Promise<boolean> {
    const db = tx ?? this.db;
    const rows = await db
      .update(t)
      .set({ deletedAt: new Date(), updatedBy: ctx.userId })
      .where(and(eq(t.tenantId, tenantId), eq(t.id, id), isNull(t.deletedAt)))
      .returning({ id: t.id });
    return rows.length > 0;
  }

  async restore(tenantId: string, id: string, ctx: OperationContext, tx?: DrizzleTxn): Promise<boolean> {
    const db = tx ?? this.db;
    const rows = await db
      .update(t)
      .set({ deletedAt: null, updatedBy: ctx.userId })
      .where(and(eq(t.tenantId, tenantId), eq(t.id, id), isNotNull(t.deletedAt)))
      .returning({ id: t.id });
    return rows.length > 0;
  }

  private getSortColumn(sortBy: string): AnyColumn {
    const map: Record<string, AnyColumn> = {
      name: t.name,
      code: t.code,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
      status: t.status,
    };
    return map[sortBy] ?? t.name;
  }
}
