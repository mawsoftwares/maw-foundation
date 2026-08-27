import type { ISyncStore, ICacheStore, RbacRole, RbacPermission, RbacModule, ModulePermission, FeatureSyncDefinition } from '@mawsoftwares/rbac-core';

/**
 * In-memory ISyncStore — for running the sample without Postgres.
 * The sync engine writes through this; on a real app, implement over pg/Knex/Kysely.
 */
export class MemorySyncStore implements ISyncStore {
  private permissions = new Map<string, { id: number; description: string | null }>();
  private features = new Map<string, { id: number }>();
  private nextPermId = 1;
  private nextFeatId = 1;
  readonly roleAssignments = new Map<number, number>();

  async findPermissionByCode(code: string) {
    return this.permissions.get(code) ?? null;
  }
  async insertPermission(code: string, description: string) {
    this.permissions.set(code, { id: this.nextPermId++, description });
  }
  async updatePermissionDescription(code: string, description: string) {
    const p = this.permissions.get(code);
    if (p) p.description = description;
  }
  async listAllPermissionCodes() {
    return [...this.permissions.entries()].map(([code, p]) => ({ id: p.id, code }));
  }
  async countRoleAssignmentsForPermission(permissionId: number) {
    return this.roleAssignments.get(permissionId) ?? 0;
  }
  async deletePermission(id: number) {
    for (const [code, p] of this.permissions) {
      if (p.id === id) { this.permissions.delete(code); break; }
    }
  }
  async findFeatureByCode(code: string) {
    return this.features.has(code) ? { code } : null;
  }
  async insertFeature(feat: FeatureSyncDefinition) {
    this.features.set(feat.code, { id: this.nextFeatId++ });
  }
  async updateFeature(_feat: FeatureSyncDefinition) {}
  async listAllFeatureCodes() {
    return [...this.features.entries()].map(([code, f]) => ({ id: f.id, code }));
  }
  async countTenantAssignmentsForFeature() { return 0; }
  async deleteFeature(id: number) {
    for (const [code, f] of this.features) {
      if (f.id === id) { this.features.delete(code); break; }
    }
  }

  getPermissionId(code: string): number | undefined {
    return this.permissions.get(code)?.id;
  }
}

/**
 * In-memory ICacheStore — loads master data from the sync store's state.
 * Seeded with roles and role→permission assignments for the demo users.
 */
export class MemoryCacheStore implements ICacheStore {
  private readonly syncStore: MemorySyncStore;
  private readonly roles: RbacRole[];
  private readonly rolePermissionMap: Record<number, string[]>;

  constructor(syncStore: MemorySyncStore, roles: RbacRole[], rolePermissionMap: Record<number, string[]>) {
    this.syncStore = syncStore;
    this.roles = roles;
    this.rolePermissionMap = rolePermissionMap;
  }

  async loadRoles(): Promise<RbacRole[]> {
    return this.roles;
  }

  async loadPermissions(): Promise<RbacPermission[]> {
    const perms = await this.syncStore.listAllPermissionCodes();
    return perms.map((p, i) => ({
      id: p.id,
      code: p.code,
      name: p.code.split('_')[0] ?? p.code,
      isActive: true,
      sortOrder: i,
    }));
  }

  async loadModules(): Promise<RbacModule[]> {
    const moduleSet = new Set<string>();
    const perms = await this.syncStore.listAllPermissionCodes();
    for (const p of perms) {
      const parts = p.code.split('_');
      if (parts.length >= 2) moduleSet.add(parts.slice(1).join('_'));
    }
    let id = 1;
    return [...moduleSet].map((name, i) => ({
      id: id++,
      code: name.toLowerCase(),
      name,
      parentModuleId: null,
      isActive: true,
      sortOrder: i,
    }));
  }

  async loadModulePermissions(): Promise<ModulePermission[]> {
    return [];
  }

  async loadRolePermissions(roleId: number): Promise<string[]> {
    return this.rolePermissionMap[roleId] ?? [];
  }
}
