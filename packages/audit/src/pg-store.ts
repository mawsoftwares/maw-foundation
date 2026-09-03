import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, and, gte, lte, count, desc, sql } from 'drizzle-orm';
import type { IAuditStore, AuditEntry, AuditInput, AuditFilters } from './types';

export class PgAuditStore implements IAuditStore {
  constructor(private readonly db: DrizzleDb) {}

  async record(input: AuditInput): Promise<AuditEntry> {
    const rows = await this.db
      .insert(schema.auditLogs)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        details: input.details ? JSON.parse(JSON.stringify(input.details)) : null,
        ip: input.ip ?? null,
      })
      .returning({ id: schema.auditLogs.id, createdAt: schema.auditLogs.createdAt });
    const r = rows[0]!;
    return { ...input, id: String(r.id), timestamp: r.createdAt.toISOString() };
  }

  async query(filters?: AuditFilters): Promise<AuditEntry[]> {
    const conditions = this.buildConditions(filters);
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const rows = await this.db
      .select()
      .from(schema.auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      id: String(r.id),
      tenantId: r.tenantId,
      userId: r.userId,
      action: r.action,
      resource: r.resource,
      resourceId: r.resourceId ?? undefined,
      details: (r.details as Record<string, unknown>) ?? undefined,
      ip: r.ip ?? undefined,
      timestamp: r.createdAt.toISOString(),
    }));
  }

  async count(filters?: AuditFilters): Promise<number> {
    const conditions = this.buildConditions(filters);
    const rows = await this.db
      .select({ count: count() })
      .from(schema.auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return rows[0]?.count ?? 0;
  }

  private buildConditions(filters?: AuditFilters) {
    const conditions: ReturnType<typeof eq>[] = [];
    if (filters?.tenantId) conditions.push(eq(schema.auditLogs.tenantId, filters.tenantId));
    if (filters?.userId) conditions.push(eq(schema.auditLogs.userId, filters.userId));
    if (filters?.action) conditions.push(eq(schema.auditLogs.action, filters.action));
    if (filters?.resource) conditions.push(eq(schema.auditLogs.resource, filters.resource));
    if (filters?.resourceId) conditions.push(eq(schema.auditLogs.resourceId, filters.resourceId));
    if (filters?.from) conditions.push(gte(schema.auditLogs.createdAt, new Date(filters.from as string)));
    if (filters?.to) conditions.push(lte(schema.auditLogs.createdAt, new Date(filters.to as string)));
    return conditions;
  }
}
