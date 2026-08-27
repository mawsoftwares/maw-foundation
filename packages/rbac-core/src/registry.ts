import { BaseModuleRegistry } from '@mawsoftwares/sdk';
import type { ModuleDefinition, PermissionDefinition, FeatureSyncDefinition } from './module-types';

/**
 * RBAC-aware Module Registry — extends BaseModuleRegistry with permission
 * and feature-sync aggregation. The sync engine and master cache consume
 * these to auto-upsert permissions to the DB and serve them at runtime.
 */
export class ModuleRegistry extends BaseModuleRegistry<ModuleDefinition> {
  getByAudience(audience: 'admin' | 'operator' | 'shared'): readonly ModuleDefinition[] {
    return this.getAll().filter(
      (m) => (m.audience ?? 'admin') === audience || m.audience === 'shared',
    );
  }

  getAllPermissions(): readonly (PermissionDefinition & { moduleKey: string })[] {
    const result: (PermissionDefinition & { moduleKey: string })[] = [];
    for (const mod of this.getAll()) {
      for (const perm of mod.permissions ?? []) {
        result.push({ ...perm, moduleKey: mod.key });
      }
    }
    return result;
  }

  getAllFeatureSyncs(): readonly (FeatureSyncDefinition & { moduleKey: string })[] {
    const result: (FeatureSyncDefinition & { moduleKey: string })[] = [];
    for (const mod of this.getAll()) {
      if (mod.featureSync !== undefined) {
        result.push({ ...mod.featureSync, moduleKey: mod.key });
      }
    }
    return result;
  }
}
