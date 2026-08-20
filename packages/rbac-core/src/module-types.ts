/**
 * Dynamic RBAC types — ported from Sushmapet's module-registry pattern.
 * Each feature self-declares its permissions via a ModuleDefinition; the sync engine
 * auto-upserts them to the DB on boot; the master cache serves them at runtime.
 *
 * Extends the base ModuleDefinition from @maw/sdk with RBAC-specific fields
 * (permissions, featureSync, audience). Framework-agnostic: no Express Router
 * or Hono types here. Route mounting is the server adapter's job.
 */

import type { BaseModuleDefinition } from '@maw/sdk';

export interface PermissionDefinition {
  code: string;
  name: string;
  description?: string;
}

export interface FeatureSyncDefinition {
  code: string;
  name: string;
  groupCode: string;
  routePath: string;
  icon?: string;
  sortOrder?: number;
  isPremium?: boolean;
  description?: string;
}

export type ModuleAudience = 'admin' | 'operator' | 'shared';

export interface ModuleDefinition extends BaseModuleDefinition {
  routePrefix: string;
  audience?: ModuleAudience;
  permissions?: PermissionDefinition[];
  featureSync?: FeatureSyncDefinition;
}

export interface RbacRole {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface RbacPermission {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface RbacModule {
  id: number;
  code: string;
  name: string;
  description?: string;
  parentModuleId: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface RbacFeature {
  id: number;
  code: string;
  name: string;
  groupCode: string;
  routePath: string;
  icon?: string;
  sortOrder: number;
  isPremium: boolean;
  isActive: boolean;
}

export interface ModulePermission {
  id: number;
  moduleId: number;
  permissionId: number;
}

export interface RolePermissionAssignment {
  roleId: number;
  permissionId: number;
  moduleId?: number;
}

export interface MasterData {
  roles: RbacRole[];
  permissions: RbacPermission[];
  modules: RbacModule[];
  modulePermissions: ModulePermission[];
}
