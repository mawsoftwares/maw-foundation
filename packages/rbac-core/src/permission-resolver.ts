import type { MasterCache } from './cache';

export type PermissionAction = 'Read' | 'Create' | 'Write' | 'Update' | 'Edit' | 'Delete';

/** Join used for new permission codes: `Read|Orders`. Legacy codes still use `_`. */
export const PERMISSION_CODE_SEPARATOR = '|';

const FALLBACKS: Readonly<Record<string, string>> = {
  create: 'write',
  write: 'create',
  edit: 'update',
  update: 'edit',
};

export function splitPermissionCode(code: string): { action: string; module: string } | null {
  const trimmed = code.trim();
  if (trimmed.length === 0) return null;
  const sep = trimmed.includes(PERMISSION_CODE_SEPARATOR) ? PERMISSION_CODE_SEPARATOR : '_';
  const parts = trimmed.split(sep);
  if (parts.length < 2) return null;
  const action = parts[0];
  const moduleName = parts.slice(1).join(sep);
  if (!action || !moduleName) return null;
  return { action, module: moduleName };
}

export function joinPermissionCode(action: string, moduleName: string): string {
  return `${action}${PERMISSION_CODE_SEPARATOR}${moduleName}`;
}

/**
 * Resolve a permission string from the master cache at runtime.
 * Returns format `"permissionId_ModuleName"` (e.g. `"57_Users"`) which is what the
 * dynamic checkPermission middleware matches against user permission lists.
 */
export function resolvePermission(cache: MasterCache, action: PermissionAction, moduleName: string): string {
  const data = cache.getCache();
  if (data === null) throw new Error('Master cache not loaded');

  let perm = data.permissions.find((p) => p.name.toLowerCase() === action.toLowerCase());
  if (perm === undefined) {
    const fallback = FALLBACKS[action.toLowerCase()];
    if (fallback !== undefined) {
      perm = data.permissions.find((p) => p.name.toLowerCase() === fallback);
    }
  }
  if (perm === undefined) {
    throw new Error(`Permission "${action}" not found. Available: ${data.permissions.map((p) => p.name).join(', ')}`);
  }

  const mod = data.modules.find(
    (m) => m.name.toLowerCase() === moduleName.toLowerCase() || m.code.toLowerCase() === moduleName.toLowerCase(),
  );
  if (mod === undefined) {
    throw new Error(`Module "${moduleName}" not found. Available: ${data.modules.map((m) => m.name).join(', ')}`);
  }

  return `${perm.id}_${moduleName}`;
}

/**
 * Helper factory — bind to a cache instance once, then call `permissions.read('Users')` etc.
 */
export function createPermissions(cache: MasterCache) {
  return {
    read: (mod: string) => resolvePermission(cache, 'Read', mod),
    create: (mod: string) => resolvePermission(cache, 'Create', mod),
    write: (mod: string) => resolvePermission(cache, 'Write', mod),
    update: (mod: string) => resolvePermission(cache, 'Update', mod),
    edit: (mod: string) => resolvePermission(cache, 'Edit', mod),
    delete: (mod: string) => resolvePermission(cache, 'Delete', mod),
  };
}

/**
 * Admin-role check. A role with code or name matching these patterns gets full access.
 */
export function isAdminRole(code: string, name?: string): boolean {
  const lower = code.toLowerCase();
  if (lower === 'admin' || lower === 'super_admin' || lower === 'superadmin') return true;
  if (name !== undefined) {
    const n = name.toLowerCase();
    if (n === 'admin' || n === 'super admin' || n === 'superadmin') return true;
  }
  return false;
}

/**
 * Match a user's permission list against a required permission string.
 * Supports `"Action|Module"` (preferred), legacy `"Action_Module"` (e.g. `"Read_Users"`),
 * and `"permId_Module"`. `|` and `_` are treated as the same join. Case-insensitive
 * module matching. Handles Create↔Write and Edit↔Update fallbacks.
 */
export function matchesPermission(
  userPermissions: readonly string[],
  required: string,
  cache: MasterCache,
): boolean {
  if (userPermissions.includes(required)) return true;

  const requiredParts = splitPermissionCode(required);
  if (requiredParts === null) return false;

  const actionEq = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();
  const moduleEq = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

  if (userPermissions.some((up) => {
    const parts = splitPermissionCode(up);
    return parts !== null
      && actionEq(parts.action, requiredParts.action)
      && moduleEq(parts.module, requiredParts.module);
  })) {
    return true;
  }

  const data = cache.getCache();
  if (data === null) return false;

  const actionOrId = requiredParts.action;
  const moduleName = requiredParts.module;

  let permissionId: number;
  const parsedId = parseInt(actionOrId, 10);
  if (!isNaN(parsedId)) {
    permissionId = parsedId;
  } else {
    let perm = data.permissions.find((p) => p.name.toLowerCase() === actionOrId.toLowerCase());
    if (perm === undefined) {
      const fallback = FALLBACKS[actionOrId.toLowerCase()];
      if (fallback !== undefined) {
        perm = data.permissions.find((p) => p.name.toLowerCase() === fallback);
      }
    }
    if (perm === undefined) return false;
    permissionId = perm.id;
  }

  return userPermissions.some((up) => {
    const upParts = splitPermissionCode(up);
    if (upParts === null) return false;
    return upParts.action === String(permissionId) && moduleEq(upParts.module, moduleName);
  });
}


