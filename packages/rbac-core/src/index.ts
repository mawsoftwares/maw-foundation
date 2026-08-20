// Static RBAC (resolveEffectiveAccess + RbacConfig) — lightweight path
export * from './types';
export { resolveEffectiveAccess } from './resolver';
export {
  EXAMPLE_RBAC,
  EXAMPLE_CAPABILITIES,
  EXAMPLE_CAPABILITY_PERMISSIONS,
  EXAMPLE_DEFAULT_ROLE_POLICY,
} from './example-vocab';

// Dynamic RBAC (module registry + sync engine + master cache) — Sushmapet-style
export * from './module-types';
export { ModuleRegistry } from './registry';
export { type ISyncStore, type SyncResult, type SyncLogger, syncPermissions, syncFeatures, syncModules } from './sync';
export { type ICacheStore, type CacheLogger, MasterCache } from './cache';
export {
  type PermissionAction,
  resolvePermission,
  createPermissions,
  isAdminRole,
  matchesPermission,
} from './permission-resolver';
export { type PermissionCheckContext, type PermissionCheckResult, checkPermissionDynamic } from './check-permission';
