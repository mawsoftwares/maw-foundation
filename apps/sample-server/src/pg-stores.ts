import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, sql, count } from 'drizzle-orm';
import type {
  ISyncStore,
  ICacheStore,
  RbacRole,
  RbacPermission,
  RbacModule,
  ModulePermission,
  FeatureSyncDefinition,
} from '@mawsoftwares/rbac-core';

export class PgSyncStore implements ISyncStore {
  constructor(private readonly db: DrizzleDb) {}

  async findPermissionByCode(code: string) {
    const rows = await this.db
      .select({ id: schema.masterPermissions.id, description: schema.masterPermissions.description })
      .from(schema.masterPermissions)
      .where(eq(schema.masterPermissions.code, code));
    return rows[0] ?? null;
  }

  async insertPermission(code: string, description: string) {
    const name = code.split('_')[0] ?? code;
    await this.db.insert(schema.masterPermissions).values({ code, name, description });
  }

  async updatePermissionDescription(code: string, description: string) {
    await this.db
      .update(schema.masterPermissions)
      .set({ description, updatedAt: new Date() })
      .where(eq(schema.masterPermissions.code, code));
  }

  async listAllPermissionCodes() {
    return this.db
      .select({ id: schema.masterPermissions.id, code: schema.masterPermissions.code })
      .from(schema.masterPermissions)
      .orderBy(schema.masterPermissions.id);
  }

  async countRoleAssignmentsForPermission(permissionId: number) {
    const rows = await this.db
      .select({ count: count() })
      .from(schema.rolePermissions)
      .where(eq(schema.rolePermissions.permissionId, permissionId));
    return rows[0]?.count ?? 0;
  }

  async deletePermission(id: number) {
    await this.db.delete(schema.masterPermissions).where(eq(schema.masterPermissions.id, id));
  }

  async findFeatureByCode(code: string) {
    const rows = await this.db
      .select({ code: schema.features.code })
      .from(schema.features)
      .where(eq(schema.features.code, code));
    return rows[0] ?? null;
  }

  async insertFeature(feat: FeatureSyncDefinition) {
    await this.db.insert(schema.features).values({
      code: feat.code,
      name: feat.name,
      groupCode: feat.groupCode,
      routePath: feat.routePath,
      icon: feat.icon ?? null,
      sortOrder: feat.sortOrder,
      isPremium: feat.isPremium ?? false,
    });
  }

  async updateFeature(feat: FeatureSyncDefinition) {
    await this.db
      .update(schema.features)
      .set({
        name: feat.name,
        groupCode: feat.groupCode,
        routePath: feat.routePath,
        icon: feat.icon ?? null,
        sortOrder: feat.sortOrder,
        isPremium: feat.isPremium ?? false,
        updatedAt: new Date(),
      })
      .where(eq(schema.features.code, feat.code));
  }

  async listAllFeatureCodes() {
    return this.db
      .select({ id: schema.features.id, code: schema.features.code })
      .from(schema.features)
      .orderBy(schema.features.id);
  }

  async countTenantAssignmentsForFeature(featureId: number) {
    const rows = await this.db
      .select({ count: count() })
      .from(schema.tenantFeatures)
      .where(eq(schema.tenantFeatures.featureId, featureId));
    return rows[0]?.count ?? 0;
  }

  async deleteFeature(id: number) {
    await this.db.delete(schema.features).where(eq(schema.features.id, id));
  }
}

export class PgCacheStore implements ICacheStore {
  constructor(private readonly db: DrizzleDb) {}

  async loadRoles(): Promise<RbacRole[]> {
    const rows = await this.db
      .select({
        id: schema.masterRoles.id,
        code: schema.masterRoles.code,
        name: schema.masterRoles.name,
        isActive: schema.masterRoles.isActive,
        sortOrder: schema.masterRoles.sortOrder,
      })
      .from(schema.masterRoles)
      .where(eq(schema.masterRoles.isActive, true))
      .orderBy(schema.masterRoles.sortOrder);
    return rows;
  }

  async loadPermissions(): Promise<RbacPermission[]> {
    const rows = await this.db
      .select({
        id: schema.masterPermissions.id,
        code: schema.masterPermissions.code,
        name: schema.masterPermissions.name,
        isActive: schema.masterPermissions.isActive,
        sortOrder: schema.masterPermissions.sortOrder,
      })
      .from(schema.masterPermissions)
      .where(eq(schema.masterPermissions.isActive, true))
      .orderBy(schema.masterPermissions.sortOrder);
    return rows;
  }

  async loadModules(): Promise<RbacModule[]> {
    const rows = await this.db
      .select({
        id: schema.masterModules.id,
        code: schema.masterModules.code,
        name: schema.masterModules.name,
        parentModuleId: schema.masterModules.parentModuleId,
        isActive: schema.masterModules.isActive,
        sortOrder: schema.masterModules.sortOrder,
      })
      .from(schema.masterModules)
      .where(eq(schema.masterModules.isActive, true))
      .orderBy(schema.masterModules.sortOrder);
    return rows;
  }

  async loadModulePermissions(): Promise<ModulePermission[]> {
    const rows = await this.db
      .select({
        id: schema.modulePermissions.id,
        moduleId: schema.modulePermissions.moduleId,
        permissionId: schema.modulePermissions.permissionId,
      })
      .from(schema.modulePermissions)
      .orderBy(schema.modulePermissions.id);
    return rows;
  }

  async loadRolePermissions(roleId: number): Promise<string[]> {
    const rows = await this.db
      .select({ code: schema.masterPermissions.code })
      .from(schema.rolePermissions)
      .innerJoin(schema.masterPermissions, eq(schema.masterPermissions.id, schema.rolePermissions.permissionId))
      .where(eq(schema.rolePermissions.roleId, roleId));
    return rows.map((r) => r.code);
  }
}
