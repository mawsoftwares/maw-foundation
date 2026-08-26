import type { PgPool } from '@maw/database';
import type {
  ISyncStore,
  ICacheStore,
  RbacRole,
  RbacPermission,
  RbacModule,
  ModulePermission,
  FeatureSyncDefinition,
} from '@maw/rbac-core';

/**
 * Postgres ISyncStore — the sync engine writes module permissions and features
 * to real DB tables (created by migrations/002_dynamic_rbac.sql).
 */
export class PgSyncStore implements ISyncStore {
  constructor(private readonly pool: PgPool) {}

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
  constructor(private readonly pool: PgPool) {}

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

