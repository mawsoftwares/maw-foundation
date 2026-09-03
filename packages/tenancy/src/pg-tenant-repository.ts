import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq } from 'drizzle-orm';
import type {
  ITenantRepository,
  Tenant,
  TenantStatus,
  CreateTenantInput,
  UpdateTenantInput,
} from './index';

type TenantRow = typeof schema.tenants.$inferSelect;

function toTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as TenantStatus,
    domain: row.domain ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PgTenantRepository implements ITenantRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: string): Promise<Tenant | null> {
    const rows = await this.db.select().from(schema.tenants).where(eq(schema.tenants.id, id));
    return rows[0] ? toTenant(rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const rows = await this.db.select().from(schema.tenants).where(eq(schema.tenants.slug, slug));
    return rows[0] ? toTenant(rows[0]) : null;
  }

  async findByDomain(domain: string): Promise<Tenant | null> {
    const rows = await this.db.select().from(schema.tenants).where(eq(schema.tenants.domain, domain));
    return rows[0] ? toTenant(rows[0]) : null;
  }

  async findAll(): Promise<Tenant[]> {
    const rows = await this.db.select().from(schema.tenants).orderBy(schema.tenants.createdAt);
    return rows.map(toTenant);
  }

  async create(input: CreateTenantInput): Promise<Tenant> {
    const rows = await this.db
      .insert(schema.tenants)
      .values({
        name: input.name,
        slug: input.slug,
        domain: input.domain ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();
    return toTenant(rows[0]!);
  }

  async update(id: string, input: UpdateTenantInput): Promise<Tenant> {
    const setData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) setData.name = input.name;
    if (input.slug !== undefined) setData.slug = input.slug;
    if (input.status !== undefined) setData.status = input.status;
    if (input.domain !== undefined) setData.domain = input.domain;
    if (input.metadata !== undefined) setData.metadata = input.metadata;

    const hasUpdates = Object.keys(setData).length > 1;
    if (!hasUpdates) {
      const existing = await this.findById(id);
      if (!existing) throw new Error(`Tenant ${id} not found`);
      return existing;
    }

    const rows = await this.db
      .update(schema.tenants)
      .set(setData)
      .where(eq(schema.tenants.id, id))
      .returning();

    if (!rows[0]) throw new Error(`Tenant ${id} not found`);
    return toTenant(rows[0]);
  }
}
