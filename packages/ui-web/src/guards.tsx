import { type ReactNode } from 'react';

/**
 * Dynamic RBAC route guards for the frontend — ported from Sushmapet's guards.tsx.
 * These work with a flat permission list (string[]) loaded from the backend,
 * rather than the static resolveEffectiveAccess path.
 *
 * Use these when the backend runs dynamic RBAC (module registry + master cache);
 * use the <Can> component from ./access.tsx when using the static RbacConfig path.
 */

const PERMISSION_ALIASES: Readonly<Record<string, string>> = {
  create: 'write',
  write: 'create',
  edit: 'update',
  update: 'edit',
};

export function normalizePermissionCode(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, '_');
}

export function matchesPermission(userPermissions: readonly string[], required: string): boolean {
  const normalized = normalizePermissionCode(required);
  if (userPermissions.some((p) => normalizePermissionCode(p) === normalized)) return true;

  const parts = normalized.split('_');
  if (parts.length >= 2) {
    const action = parts[0]!;
    const fallback = PERMISSION_ALIASES[action];
    if (fallback !== undefined) {
      const alt = [fallback, ...parts.slice(1)].join('_');
      return userPermissions.some((p) => normalizePermissionCode(p) === alt);
    }
  }
  return false;
}

export interface PermissionRouteProps {
  permission: string;
  userPermissions: readonly string[];
  isAdmin?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionRoute({ permission, userPermissions, isAdmin, fallback = null, children }: PermissionRouteProps): ReactNode {
  if (isAdmin === true) return <>{children}</>;
  return matchesPermission(userPermissions, permission) ? <>{children}</> : <>{fallback}</>;
}

export interface AnyPermissionRouteProps {
  permissions: readonly string[];
  userPermissions: readonly string[];
  isAdmin?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function AnyPermissionRoute({ permissions, userPermissions, isAdmin, fallback = null, children }: AnyPermissionRouteProps): ReactNode {
  if (isAdmin === true) return <>{children}</>;
  return permissions.some((p) => matchesPermission(userPermissions, p)) ? <>{children}</> : <>{fallback}</>;
}

export interface FeatureRouteProps {
  feature: string;
  enabledFeatures: readonly string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function FeatureRoute({ feature, enabledFeatures, fallback = null, children }: FeatureRouteProps): ReactNode {
  return enabledFeatures.includes(feature) ? <>{children}</> : <>{fallback}</>;
}

export interface AccessRouteProps {
  permission: string;
  feature?: string;
  userPermissions: readonly string[];
  enabledFeatures?: readonly string[];
  isAdmin?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function AccessRoute({
  permission,
  feature,
  userPermissions,
  enabledFeatures = [],
  isAdmin,
  fallback = null,
  children,
}: AccessRouteProps): ReactNode {
  if (feature !== undefined && !enabledFeatures.includes(feature)) return <>{fallback}</>;
  if (isAdmin === true) return <>{children}</>;
  return matchesPermission(userPermissions, permission) ? <>{children}</> : <>{fallback}</>;
}
