import type { ModuleDefinition, PermissionDefinition, FeatureSyncDefinition } from './module-types';

/**
 * Module registry — the single place a developer registers a new feature module.
 * Everything else (route mounting, permission sync, DB upserts) derives from it.
 *
 * Ported from Sushmapet's MODULE_REGISTRY pattern, made framework-agnostic (no Express
 * Router — route mounting is the server adapter's responsibility).
 */
export class ModuleRegistry {
  private readonly modules: ModuleDefinition[] = [];

  register(...definitions: ModuleDefinition[]): void {
    for (const def of definitions) {
      if (this.modules.some((m) => m.key === def.key)) {
        throw new Error(`Module "${def.key}" is already registered`);
      }
      this.modules.push(def);
    }
  }

  getAll(): readonly ModuleDefinition[] {
    return this.modules;
  }

  getByKey(key: string): ModuleDefinition | undefined {
    return this.modules.find((m) => m.key === key);
  }

  getByAudience(audience: 'admin' | 'operator' | 'shared'): readonly ModuleDefinition[] {
    return this.modules.filter((m) => (m.audience ?? 'admin') === audience || m.audience === 'shared');
  }

  getAllPermissions(): readonly (PermissionDefinition & { moduleKey: string })[] {
    const result: (PermissionDefinition & { moduleKey: string })[] = [];
    for (const mod of this.modules) {
      for (const perm of mod.permissions ?? []) {
        result.push({ ...perm, moduleKey: mod.key });
      }
    }
    return result;
  }

  getAllFeatureSyncs(): readonly (FeatureSyncDefinition & { moduleKey: string })[] {
    const result: (FeatureSyncDefinition & { moduleKey: string })[] = [];
    for (const mod of this.modules) {
      if (mod.featureSync !== undefined) {
        result.push({ ...mod.featureSync, moduleKey: mod.key });
      }
    }
    return result;
  }
}
