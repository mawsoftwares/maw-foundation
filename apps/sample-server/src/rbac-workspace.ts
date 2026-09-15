/**
 * Pure workspace assembler: ROLE → MODULES → PERMISSIONS.
 * Keeps HTTP handlers thin and makes grouping / summary unit-testable.
 */

import { splitPermissionCode } from '@mawsoftwares/rbac-core';

export interface WorkspaceRole {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface WorkspacePermission {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  assigned: boolean;
  assignedRoleCount: number;
}

export interface WorkspaceModule {
  id: number;
  code: string;
  name: string;
  description: string | null;
  parentModuleId: number | null;
  isActive: boolean;
  isSystem: boolean;
  isVirtual: boolean;
  sortOrder: number;
  permissions: WorkspacePermission[];
  assignedCount: number;
  permissionCount: number;
}

export interface WorkspaceSummary {
  moduleCount: number;
  fullyAssigned: number;
  partiallyAssigned: number;
  noAccess: number;
  assignedPermissions: number;
  availablePermissions: number;
}

export interface RoleWorkspace {
  role: WorkspaceRole;
  modules: WorkspaceModule[];
  summary: WorkspaceSummary;
}

export interface PermissionRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
}

export interface ModuleRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  parentModuleId: number | null;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
}

export interface BuildRoleWorkspaceInput {
  role: WorkspaceRole;
  modules: readonly ModuleRow[];
  permissions: readonly PermissionRow[];
  modulePermissions: readonly { moduleId: number; permissionId: number }[];
  assignedPermissionIds: ReadonlySet<number>;
  assignmentCounts: ReadonlyMap<number, number>;
}

function normalizeToken(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function moduleTokenFromPermissionCode(code: string): string | undefined {
  const parts = splitPermissionCode(code);
  if (parts === null) return undefined;
  return normalizeToken(parts.module);
}

function permissionDto(
  perm: PermissionRow,
  assignedPermissionIds: ReadonlySet<number>,
  assignmentCounts: ReadonlyMap<number, number>,
): WorkspacePermission {
  return {
    id: perm.id,
    code: perm.code,
    name: perm.name,
    description: perm.description,
    isActive: perm.isActive,
    isSystem: perm.isSystem,
    sortOrder: perm.sortOrder,
    assigned: assignedPermissionIds.has(perm.id),
    assignedRoleCount: assignmentCounts.get(perm.id) ?? 0,
  };
}

function withCounts(mod: Omit<WorkspaceModule, 'assignedCount' | 'permissionCount'>): WorkspaceModule {
  const assignedCount = mod.permissions.filter((p) => p.assigned).length;
  return {
    ...mod,
    assignedCount,
    permissionCount: mod.permissions.length,
  };
}

function comparePermissions(a: WorkspacePermission, b: WorkspacePermission): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id - b.id;
}

export function summarizeModules(modules: readonly WorkspaceModule[]): WorkspaceSummary {
  let fullyAssigned = 0;
  let partiallyAssigned = 0;
  let noAccess = 0;
  let assignedPermissions = 0;
  let availablePermissions = 0;

  for (const mod of modules) {
    if (mod.isVirtual && mod.permissions.length === 0) continue;
    availablePermissions += mod.permissionCount;
    assignedPermissions += mod.assignedCount;
    if (mod.permissionCount === 0 || mod.assignedCount === 0) noAccess += 1;
    else if (mod.assignedCount === mod.permissionCount) fullyAssigned += 1;
    else partiallyAssigned += 1;
  }

  return {
    moduleCount: modules.filter((m) => !m.isVirtual || m.permissions.length > 0).length,
    fullyAssigned,
    partiallyAssigned,
    noAccess,
    assignedPermissions,
    availablePermissions,
  };
}

export function buildRoleWorkspace(input: BuildRoleWorkspaceInput): RoleWorkspace {
  const permById = new Map(input.permissions.map((p) => [p.id, p]));
  const linkedIds = new Set<number>();
  const permsByModule = new Map<number, WorkspacePermission[]>();

  for (const link of input.modulePermissions) {
    const perm = permById.get(link.permissionId);
    if (!perm) continue;
    linkedIds.add(perm.id);
    const list = permsByModule.get(link.moduleId) ?? [];
    list.push(permissionDto(perm, input.assignedPermissionIds, input.assignmentCounts));
    permsByModule.set(link.moduleId, list);
  }

  const modules: WorkspaceModule[] = input.modules.map((mod) => {
    const permissions = (permsByModule.get(mod.id) ?? [])
      .slice()
      .sort(comparePermissions);
    return withCounts({
      id: mod.id,
      code: mod.code,
      name: mod.name,
      description: mod.description,
      parentModuleId: mod.parentModuleId,
      isActive: mod.isActive,
      isSystem: mod.isSystem,
      isVirtual: false,
      sortOrder: mod.sortOrder,
      permissions,
    });
  });

  const moduleByToken = new Map<string, WorkspaceModule>();
  for (const mod of modules) {
    moduleByToken.set(normalizeToken(mod.code), mod);
    moduleByToken.set(normalizeToken(mod.name), mod);
  }

  const orphans: WorkspacePermission[] = [];
  for (const perm of input.permissions) {
    if (linkedIds.has(perm.id)) continue;
    const dto = permissionDto(perm, input.assignedPermissionIds, input.assignmentCounts);
    const token = moduleTokenFromPermissionCode(perm.code);
    const host = token !== undefined ? moduleByToken.get(token) : undefined;
    if (host) {
      host.permissions.push(dto);
    } else {
      orphans.push(dto);
    }
  }

  for (const mod of modules) {
    mod.permissions.sort(comparePermissions);
    const recounted = withCounts(mod);
    mod.assignedCount = recounted.assignedCount;
    mod.permissionCount = recounted.permissionCount;
  }

  modules.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  if (orphans.length > 0) {
    modules.push(withCounts({
      id: 0,
      code: 'uncategorized',
      name: 'Uncategorized',
      description: 'Permissions not linked to a module',
      parentModuleId: null,
      isActive: true,
      isSystem: false,
      isVirtual: true,
      sortOrder: Number.MAX_SAFE_INTEGER,
      permissions: orphans.sort(comparePermissions),
    }));
  }

  return {
    role: input.role,
    modules,
    summary: summarizeModules(modules),
  };
}
