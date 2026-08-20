import type pg from 'pg';
import type {
  ISyncStore,
  ICacheStore,
  RbacRole,
  RbacPermission,
  RbacModule,
  ModulePermission,
  FeatureSyncDefinition,
} from '@maw/rbac-core';
import type { AuditEntry } from './audit';

/**
 * Postgres ISyncStore — the sync engine writes module permissions and features
 * to real DB tables (created by migrations/002_dynamic_rbac.sql).
 */
export class PgSyncStore implements ISyncStore {
  constructor(private readonly pool: pg.Pool) {}

  async findPermissionByCode(code: string) {
    const { rows } = await this.pool.query<{ id: number; description: string | null }>(
      'SELECT id, description FROM master_permissions WHERE code = $1',
      [code],
    );
    return rows[0] ?? null;
  }

  async insertPermission(code: string, description: string) {
    const name = code.split('_')[0] ?? code;
    await this.pool.query(
      'INSERT INTO master_permissions (code, name, description) VALUES ($1, $2, $3)',
      [code, name, description],
    );
  }

  async updatePermissionDescription(code: string, description: string) {
    await this.pool.query(
      'UPDATE master_permissions SET description = $1, updated_at = NOW() WHERE code = $2',
      [description, code],
    );
  }

  async listAllPermissionCodes() {
    const { rows } = await this.pool.query<{ id: number; code: string }>(
      'SELECT id, code FROM master_permissions ORDER BY id',
    );
    return rows;
  }

  async countRoleAssignmentsForPermission(permissionId: number) {
    const { rows } = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM role_permissions WHERE permission_id = $1',
      [permissionId],
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }

  async deletePermission(id: number) {
    await this.pool.query('DELETE FROM master_permissions WHERE id = $1', [id]);
  }

  async findFeatureByCode(code: string) {
    const { rows } = await this.pool.query<{ code: string }>(
      'SELECT code FROM features WHERE code = $1',
      [code],
    );
    return rows[0] ?? null;
  }

  async insertFeature(feat: FeatureSyncDefinition) {
    await this.pool.query(
      `INSERT INTO features (code, name, group_code, route_path, icon, sort_order, is_premium)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [feat.code, feat.name, feat.groupCode, feat.routePath, feat.icon ?? null, feat.sortOrder, feat.isPremium ?? false],
    );
  }

  async updateFeature(feat: FeatureSyncDefinition) {
    await this.pool.query(
      `UPDATE features SET name = $2, group_code = $3, route_path = $4, icon = $5,
       sort_order = $6, is_premium = $7, updated_at = NOW() WHERE code = $1`,
      [feat.code, feat.name, feat.groupCode, feat.routePath, feat.icon ?? null, feat.sortOrder, feat.isPremium ?? false],
    );
  }

  async listAllFeatureCodes() {
    const { rows } = await this.pool.query<{ id: number; code: string }>(
      'SELECT id, code FROM features ORDER BY id',
    );
    return rows;
  }

  async countTenantAssignmentsForFeature(featureId: number) {
    const { rows } = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM tenant_features WHERE feature_id = $1',
      [featureId],
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }

  async deleteFeature(id: number) {
    await this.pool.query('DELETE FROM features WHERE id = $1', [id]);
  }
}

/**
 * Postgres ICacheStore — loads master RBAC data from the DB tables.
 */
export class PgCacheStore implements ICacheStore {
  constructor(private readonly pool: pg.Pool) {}

  async loadRoles(): Promise<RbacRole[]> {
    const { rows } = await this.pool.query<{
      id: number; code: string; name: string; is_active: boolean; sort_order: number;
    }>('SELECT id, code, name, is_active, sort_order FROM master_roles WHERE is_active = TRUE ORDER BY sort_order');
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      isActive: r.is_active,
      sortOrder: r.sort_order,
    }));
  }

  async loadPermissions(): Promise<RbacPermission[]> {
    const { rows } = await this.pool.query<{
      id: number; code: string; name: string; is_active: boolean; sort_order: number;
    }>('SELECT id, code, name, is_active, sort_order FROM master_permissions WHERE is_active = TRUE ORDER BY sort_order');
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      isActive: r.is_active,
      sortOrder: r.sort_order,
    }));
  }

  async loadModules(): Promise<RbacModule[]> {
    const { rows } = await this.pool.query<{
      id: number; code: string; name: string; parent_module_id: number | null;
      is_active: boolean; sort_order: number;
    }>('SELECT id, code, name, parent_module_id, is_active, sort_order FROM master_modules WHERE is_active = TRUE ORDER BY sort_order');
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      parentModuleId: r.parent_module_id,
      isActive: r.is_active,
      sortOrder: r.sort_order,
    }));
  }

  async loadModulePermissions(): Promise<ModulePermission[]> {
    const { rows } = await this.pool.query<{
      id: number; module_id: number; permission_id: number;
    }>('SELECT id, module_id, permission_id FROM module_permissions ORDER BY id');
    return rows.map((r) => ({
      id: r.id,
      moduleId: r.module_id,
      permissionId: r.permission_id,
    }));
  }

  async loadRolePermissions(roleId: number): Promise<string[]> {
    const { rows } = await this.pool.query<{ code: string }>(
      `SELECT mp.code FROM role_permissions rp
       JOIN master_permissions mp ON mp.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [roleId],
    );
    return rows.map((r) => r.code);
  }
}

/**
 * Postgres audit log store.
 */
export function createPgAuditStore(pool: pg.Pool) {
  return {
    async record(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> {
      const { rows } = await pool.query<{ id: string; created_at: Date }>(
        `INSERT INTO audit_logs (tenant_id, user_id, action, resource, resource_id, details, ip)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id::text, created_at`,
        [entry.tenantId, entry.userId, entry.action, entry.resource,
         entry.resourceId ?? null, entry.details ? JSON.stringify(entry.details) : null, entry.ip ?? null],
      );
      const r = rows[0]!;
      return { ...entry, id: r.id, timestamp: r.created_at.toISOString() };
    },

    async query(filters?: {
      tenantId?: string; userId?: string; resource?: string; limit?: number;
    }): Promise<AuditEntry[]> {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (filters?.tenantId) { conditions.push(`tenant_id = $${idx++}`); params.push(filters.tenantId); }
      if (filters?.userId) { conditions.push(`user_id = $${idx++}`); params.push(filters.userId); }
      if (filters?.resource) { conditions.push(`resource = $${idx++}`); params.push(filters.resource); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = filters?.limit ?? 50;

      const { rows } = await pool.query<{
        id: string; tenant_id: string; user_id: string; action: string;
        resource: string; resource_id: string | null; details: Record<string, unknown> | null;
        ip: string | null; created_at: Date;
      }>(
        `SELECT id::text, tenant_id, user_id, action, resource, resource_id, details, ip, created_at
         FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ${limit}`,
        params,
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
    },
  };
}
