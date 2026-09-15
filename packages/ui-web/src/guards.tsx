import { type ReactNode } from 'react';
import { splitPermissionCode } from '@mawsoftwares/rbac-core';

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

  const requiredParts = splitPermissionCode(required);
  if (requiredParts === null) return false;

  const sameParts = (code: string, action: string, moduleName: string): boolean => {
    const parts = splitPermissionCode(code);
    return parts !== null
      && parts.action.toLowerCase() === action.toLowerCase()
      && parts.module.toLowerCase() === moduleName.toLowerCase();
  };

  if (userPermissions.some((p) => sameParts(p, requiredParts.action, requiredParts.module))) return true;

  const fallback = PERMISSION_ALIASES[requiredParts.action.toLowerCase()];
  if (fallback !== undefined) {
    return userPermissions.some((p) => sameParts(p, fallback, requiredParts.module));
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
