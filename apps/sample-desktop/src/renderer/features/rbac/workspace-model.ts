import { joinPermissionCode, splitPermissionCode } from '@mawsoftwares/rbac-core';
import type { AssignmentFilter, StatusFilter, WorkspaceModule, WorkspaceSummary } from './types';

const ACTION_LABELS: Record<string, string> = {
  read: 'View',
  view: 'View',
  create: 'Create',
  write: 'Create',
  update: 'Edit',
  edit: 'Edit',
  delete: 'Delete',
  export: 'Export',
  manage: 'Manage',
  print: 'Print',
  approve: 'Approve',
  reject: 'Reject',
};

export function permissionDisplayName(perm: { name: string; code: string }): string {
  const fromName = ACTION_LABELS[perm.name.trim().toLowerCase()];
  if (fromName) return fromName;
  const action = splitPermissionCode(perm.code)?.action ?? perm.name;
  return ACTION_LABELS[action.toLowerCase()] ?? perm.name;
}

export function suggestModuleCode(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function pascalToken(value: string): string {
  return value
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function actionCodeFromName(name: string): string {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'view') return 'Read';
  if (lower === 'edit') return 'Update';
  return trimmed.replace(/\s+/g, '');
}

export function suggestPermissionCode(permissionName: string, moduleName: string): string {
  return joinPermissionCode(actionCodeFromName(permissionName), pascalToken(moduleName));
}

export function moduleCheckboxState(mod: WorkspaceModule): 'checked' | 'indeterminate' | 'unchecked' {
  if (mod.permissionCount === 0 || mod.assignedCount === 0) return 'unchecked';
  if (mod.assignedCount === mod.permissionCount) return 'checked';
  return 'indeterminate';
}

export function summarizeModules(modules: readonly WorkspaceModule[]): WorkspaceSummary {
  let fullyAssigned = 0;
  let partiallyAssigned = 0;
  let noAccess = 0;
  let assignedPermissions = 0;
  let availablePermissions = 0;

  const countable = modules.filter((m) => !m.isVirtual || m.permissions.length > 0);
  for (const mod of countable) {
    availablePermissions += mod.permissionCount;
    assignedPermissions += mod.assignedCount;
    if (mod.permissionCount === 0 || mod.assignedCount === 0) noAccess += 1;
    else if (mod.assignedCount === mod.permissionCount) fullyAssigned += 1;
    else partiallyAssigned += 1;
  }

  return {
    moduleCount: countable.length,
    fullyAssigned,
    partiallyAssigned,
    noAccess,
    assignedPermissions,
    availablePermissions,
  };
}

export function applyAssignment(
  modules: readonly WorkspaceModule[],
  permissionIds: ReadonlySet<number>,
  assigned: boolean,
): WorkspaceModule[] {
  return modules.map((mod) => {
    const permissions = mod.permissions.map((p) => (
      permissionIds.has(p.id) ? { ...p, assigned } : p
    ));
    const assignedCount = permissions.filter((p) => p.assigned).length;
    return { ...mod, permissions, assignedCount, permissionCount: permissions.length };
  });
}

function matchesSearch(mod: WorkspaceModule, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (mod.name.toLowerCase().includes(q) || mod.code.toLowerCase().includes(q)) return true;
  return mod.permissions.some(
    (p) => p.name.toLowerCase().includes(q)
      || p.code.toLowerCase().includes(q)
      || permissionDisplayName(p).toLowerCase().includes(q),
  );
}

function matchesAssignment(mod: WorkspaceModule, filter: AssignmentFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'assigned') return mod.permissionCount > 0 && mod.assignedCount === mod.permissionCount;
  if (filter === 'partial') return mod.assignedCount > 0 && mod.assignedCount < mod.permissionCount;
  return mod.assignedCount === 0;
}

function matchesStatus(mod: WorkspaceModule, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (mod.isVirtual) return true;
  return filter === 'active' ? mod.isActive : !mod.isActive;
}

export function filterModules(
  modules: readonly WorkspaceModule[],
  opts: { search: string; assignment: AssignmentFilter; status: StatusFilter },
): WorkspaceModule[] {
  return modules.filter((mod) => (
    matchesSearch(mod, opts.search)
    && matchesAssignment(mod, opts.assignment)
    && matchesStatus(mod, opts.status)
  ));
}

export function assignmentsFromModules(modules: readonly WorkspaceModule[]): { permissionId: number; moduleId: number | null }[] {
  const seen = new Set<number>();
  const assignments: { permissionId: number; moduleId: number | null }[] = [];
  for (const mod of modules) {
    for (const perm of mod.permissions) {
      if (!perm.assigned || seen.has(perm.id)) continue;
      seen.add(perm.id);
      assignments.push({ permissionId: perm.id, moduleId: mod.isVirtual ? null : mod.id });
    }
  }
  return assignments;
}
