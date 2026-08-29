import type { PgPool } from '@mawsoftwares/database';
import type {
  ITenantRepository,
  Tenant,
  TenantStatus,
  CreateTenantInput,
  UpdateTenantInput,
} from './index';

interface TenantDbRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  domain: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

function toTenant(row: TenantDbRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as TenantStatus,
    domain: row.domain ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS = 'id, name, slug, status, domain, metadata, created_at, updated_at';

export class PgTenantRepository implements ITenantRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: string): Promise<Tenant | null> {
    const { rows } = await this.pool.query<TenantDbRow>(
      `SELECT ${COLUMNS} FROM tenants WHERE id = $1`,
      [id],
    );
    return rows[0] ? toTenant(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const { rows } = await this.pool.query<TenantDbRow>(
      `SELECT ${COLUMNS} FROM tenants WHERE slug = $1`,
      [slug],
    );
    return rows[0] ? toTenant(rows[0]) : null;
  }

  async findByDomain(domain: string): Promise<Tenant | null> {
    const { rows } = await this.pool.query<TenantDbRow>(
      `SELECT ${COLUMNS} FROM tenants WHERE domain = $1`,
      [domain],
    );
    return rows[0] ? toTenant(rows[0]) : null;
  }

  async findAll(): Promise<Tenant[]> {
    const { rows } = await this.pool.query<TenantDbRow>(
      `SELECT ${COLUMNS} FROM tenants ORDER BY created_at ASC`,
    );
    return rows.map(toTenant);
  }

  async create(input: CreateTenantInput): Promise<Tenant> {
    const { rows } = await this.pool.query<TenantDbRow>(
      `INSERT INTO tenants (name, slug, domain, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [input.name, input.slug, input.domain ?? null, JSON.stringify(input.metadata ?? {})],
    );
    return toTenant(rows[0]!);
  }

  async update(id: string, input: UpdateTenantInput): Promise<Tenant> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(input.name);
    }
    if (input.slug !== undefined) {
      sets.push(`slug = $${idx++}`);
      params.push(input.slug);
    }
    if (input.status !== undefined) {
      sets.push(`status = $${idx++}`);
      params.push(input.status);
    }
    if (input.domain !== undefined) {
      sets.push(`domain = $${idx++}`);
      params.push(input.domain);
    }
    if (input.metadata !== undefined) {
      sets.push(`metadata = $${idx++}`);
      params.push(JSON.stringify(input.metadata));
    }

    if (sets.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error(`Tenant ${id} not found`);
      return existing;
    }

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await this.pool.query<TenantDbRow>(
      `UPDATE tenants SET ${sets.join(', ')} WHERE id = $${idx} RETURNING ${COLUMNS}`,
      params,
    );

    if (!rows[0]) throw new Error(`Tenant ${id} not found`);
    return toTenant(rows[0]);
  }
}
