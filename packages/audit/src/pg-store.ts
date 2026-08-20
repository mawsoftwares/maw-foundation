import type { IAuditStore, AuditEntry, AuditInput, AuditFilters } from './types';

interface PgPool {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
}

export class PgAuditStore implements IAuditStore {
  constructor(
    private readonly pool: PgPool,
    private readonly table = 'audit_logs',
  ) {}

  async record(input: AuditInput): Promise<AuditEntry> {
    const { rows } = await this.pool.query<{ id: string; created_at: Date }>(
      `INSERT INTO ${this.table} (tenant_id, user_id, action, resource, resource_id, details, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id::text, created_at`,
      [
        input.tenantId,
        input.userId,
        input.action,
        input.resource,
        input.resourceId ?? null,
        input.details ? JSON.stringify(input.details) : null,
        input.ip ?? null,
      ],
    );
    const r = rows[0]!;
    return { ...input, id: r.id, timestamp: r.created_at.toISOString() };
  }

  async query(filters?: AuditFilters): Promise<AuditEntry[]> {
    const { where, params, nextIdx } = this.buildWhere(filters);
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const { rows } = await this.pool.query<{
      id: string;
      tenant_id: string;
      user_id: string;
      action: string;
      resource: string;
      resource_id: string | null;
      details: Record<string, unknown> | null;
      ip: string | null;
      created_at: Date;
    }>(
      `SELECT id::text, tenant_id, user_id, action, resource, resource_id, details, ip, created_at
       FROM ${this.table} ${where}
       ORDER BY created_at DESC
       LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`,
      [...params, limit, offset],
    );

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      userId: r.user_id,
      action: r.action,
      resource: r.resource,
      resourceId: r.resource_id ?? undefined,
      details: r.details ?? undefined,
      ip: r.ip ?? undefined,
      timestamp: r.created_at.toISOString(),
    }));
  }

  async count(filters?: AuditFilters): Promise<number> {
    const { where, params } = this.buildWhere(filters);
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${this.table} ${where}`,
      params,
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }

  private buildWhere(filters?: AuditFilters): {
    where: string;
    params: unknown[];
    nextIdx: number;
  } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters?.tenantId) { conditions.push(`tenant_id = $${idx++}`); params.push(filters.tenantId); }
    if (filters?.userId) { conditions.push(`user_id = $${idx++}`); params.push(filters.userId); }
    if (filters?.action) { conditions.push(`action = $${idx++}`); params.push(filters.action); }
    if (filters?.resource) { conditions.push(`resource = $${idx++}`); params.push(filters.resource); }
    if (filters?.resourceId) { conditions.push(`resource_id = $${idx++}`); params.push(filters.resourceId); }
    if (filters?.from) { conditions.push(`created_at >= $${idx++}`); params.push(filters.from); }
    if (filters?.to) { conditions.push(`created_at <= $${idx++}`); params.push(filters.to); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { where, params, nextIdx: idx };
  }
}
