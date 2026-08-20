import type { MasterCache } from './cache';
import { isAdminRole, matchesPermission } from './permission-resolver';

export interface PermissionCheckContext {
  userId: string;
  roleId?: number;
  permissions?: string[];
}

export interface PermissionCheckResult {
  granted: boolean;
  reason: 'admin_bypass' | 'permission_match' | 'no_role' | 'denied' | 'cache_unavailable';
}

/**
 * Core dynamic permission check — used by server adapters (Express/Hono middleware) and
 * can also be called directly in service code. Admin roles bypass all checks.
 *
 * Ported from Sushmapet's checkPermission middleware, extracted into a pure function
 * so the middleware adapter is a thin wrapper.
 */
export async function checkPermissionDynamic(
  ctx: PermissionCheckContext,
  requiredPermission: string,
  cache: MasterCache,
): Promise<PermissionCheckResult> {
  const data = await cache.ensureLoaded();

  if (ctx.roleId !== undefined) {
    const role = data.roles.find((r) => r.id === ctx.roleId);
    if (role !== undefined && isAdminRole(role.code, role.name)) {
      return { granted: true, reason: 'admin_bypass' };
    }
  }

  if (ctx.roleId === undefined) {
    return { granted: false, reason: 'no_role' };
  }

  const userPermissions = ctx.permissions ?? (await cache.getUserPermissions(ctx.roleId));

  if (matchesPermission(userPermissions, requiredPermission, cache)) {
    return { granted: true, reason: 'permission_match' };
  }

  return { granted: false, reason: 'denied' };
}
