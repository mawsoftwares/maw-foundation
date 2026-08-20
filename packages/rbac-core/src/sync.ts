import type { PermissionDefinition, FeatureSyncDefinition } from './module-types';
import type { ModuleRegistry } from './registry';

/**
 * Sync store port — the sync engine writes through this interface so it stays
 * DB-agnostic. Implement with pg, Knex, Kysely, Drizzle — whatever the app uses.
 */
export interface ISyncStore {
  findPermissionByCode(code: string): Promise<{ id: number; description: string | null } | null>;
  insertPermission(code: string, description: string): Promise<void>;
  updatePermissionDescription(code: string, description: string): Promise<void>;
  listAllPermissionCodes(): Promise<{ id: number; code: string }[]>;
  countRoleAssignmentsForPermission(permissionId: number): Promise<number>;
  deletePermission(permissionId: number): Promise<void>;

  findFeatureByCode(code: string): Promise<{ code: string } | null>;
  insertFeature(feat: FeatureSyncDefinition): Promise<void>;
  updateFeature(feat: FeatureSyncDefinition): Promise<void>;
  listAllFeatureCodes(): Promise<{ id: number; code: string }[]>;
  countTenantAssignmentsForFeature(featureId: number): Promise<number>;
  deleteFeature(featureId: number): Promise<void>;
}

export interface SyncResult {
  inserted: number;
  updated: number;
  deleted: number;
  skipped: number;
  total: number;
}

export interface SyncLogger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string, err?: unknown): void;
}

const noop: SyncLogger = { info() {}, warn() {}, error() {} };

export async function syncPermissions(
  store: ISyncStore,
  permissions: readonly PermissionDefinition[],
  logger: SyncLogger = noop,
): Promise<SyncResult> {
  const registryCodes = new Set(permissions.map((p) => p.code));
  let inserted = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;

  for (const perm of permissions) {
    const desc = perm.description ?? perm.name;
    const existing = await store.findPermissionByCode(perm.code);
    if (existing === null) {
      await store.insertPermission(perm.code, desc);
      inserted++;
    } else if (existing.description !== desc) {
      await store.updatePermissionDescription(perm.code, desc);
      updated++;
    }
  }

  const dbPerms = await store.listAllPermissionCodes();
  for (const dbPerm of dbPerms) {
    if (registryCodes.has(dbPerm.code)) continue;
    const count = await store.countRoleAssignmentsForPermission(dbPerm.id);
    if (count > 0) {
      logger.warn(`syncPermissions: skipping delete of "${dbPerm.code}" — assigned to ${count} role(s)`);
      skipped++;
      continue;
    }
    await store.deletePermission(dbPerm.id);
    deleted++;
    logger.info(`syncPermissions: deleted obsolete "${dbPerm.code}"`);
  }

  logger.info(`syncPermissions: inserted=${inserted} updated=${updated} deleted=${deleted} skipped=${skipped} total=${permissions.length}`);
  return { inserted, updated, deleted, skipped, total: permissions.length };
}

export async function syncFeatures(
  store: ISyncStore,
  features: readonly FeatureSyncDefinition[],
  logger: SyncLogger = noop,
): Promise<SyncResult> {
  const registryCodes = new Set(features.map((f) => f.code));
  let inserted = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;

  for (const feat of features) {
    const existing = await store.findFeatureByCode(feat.code);
    if (existing === null) {
      await store.insertFeature(feat);
      inserted++;
    } else {
      await store.updateFeature(feat);
      updated++;
    }
  }

  const dbFeatures = await store.listAllFeatureCodes();
  for (const dbFeat of dbFeatures) {
    if (registryCodes.has(dbFeat.code)) continue;
    const count = await store.countTenantAssignmentsForFeature(dbFeat.id);
    if (count > 0) {
      logger.warn(`syncFeatures: skipping delete of "${dbFeat.code}" — assigned to ${count} tenant(s)`);
      skipped++;
      continue;
    }
    await store.deleteFeature(dbFeat.id);
    deleted++;
    logger.info(`syncFeatures: deleted obsolete "${dbFeat.code}"`);
  }

  logger.info(`syncFeatures: inserted=${inserted} updated=${updated} deleted=${deleted} skipped=${skipped} total=${features.length}`);
  return { inserted, updated, deleted, skipped, total: features.length };
}

export async function syncModules(
  store: ISyncStore,
  registry: ModuleRegistry,
  logger: SyncLogger = noop,
): Promise<void> {
  try {
    const perms = registry.getAllPermissions();
    await syncPermissions(store, perms, logger);
    const feats = registry.getAllFeatureSyncs();
    await syncFeatures(store, feats, logger);
    logger.info('Module sync complete');
  } catch (err) {
    logger.error('syncModules failed', err);
  }
}
