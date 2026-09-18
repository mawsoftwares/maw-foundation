import { describe, expect, it } from 'vitest';
import {
  actionCodeFromName,
  applyAssignment,
  filterModules,
  moduleCheckboxState,
  permissionDisplayName,
  suggestModuleCode,
  suggestPermissionCode,
  summarizeModules,
} from './workspace-model';
import type { WorkspaceModule, WorkspacePermission } from './types';

function perm(partial: Partial<WorkspacePermission> & Pick<WorkspacePermission, 'id' | 'code' | 'name' | 'assigned'>): WorkspacePermission {
  return {
    description: null,
    isActive: true,
    isSystem: true,
    sortOrder: 0,
    assignedRoleCount: 0,
    ...partial,
  };
}

function mod(partial: Partial<WorkspaceModule> & Pick<WorkspaceModule, 'id' | 'code' | 'name' | 'permissions'>): WorkspaceModule {
  const permissions = partial.permissions;
  return {
    description: null,
    parentModuleId: null,
    isActive: true,
    isSystem: true,
    isVirtual: false,
    sortOrder: 0,
    assignedCount: permissions.filter((p) => p.assigned).length,
    permissionCount: permissions.length,
    ...partial,
  };
}

describe('permission naming helpers', () => {
  it('maps Read to View and generates Action|Module codes', () => {
    expect(permissionDisplayName({ name: 'Read', code: 'Read_Orders' })).toBe('View');
    expect(permissionDisplayName({ name: 'Export', code: 'Export|Orders' })).toBe('Export');
    expect(actionCodeFromName('View')).toBe('Read');
    expect(suggestPermissionCode('View', 'Customers')).toBe('Read|Customers');
    expect(suggestPermissionCode('Export', 'orders')).toBe('Export|Orders');
    expect(suggestModuleCode('Audit Logs')).toBe('audit-logs');
  });
});

describe('module assignment helpers', () => {
  const customers = mod({
    id: 1,
    code: 'customers',
    name: 'Customers',
    permissions: [
      perm({ id: 1, code: 'Read_Customers', name: 'Read', assigned: true }),
      perm({ id: 2, code: 'Create_Customers', name: 'Create', assigned: true }),
      perm({ id: 3, code: 'Delete_Customers', name: 'Delete', assigned: false }),
    ],
  });

  it('computes checkbox and summary states', () => {
    expect(moduleCheckboxState(customers)).toBe('indeterminate');
    expect(summarizeModules([customers]).partiallyAssigned).toBe(1);
    expect(summarizeModules([customers]).assignedPermissions).toBe(2);
  });

  it('filters by search across module and permission fields', () => {
    expect(filterModules([customers], { search: 'delete', assignment: 'all', status: 'all' })).toHaveLength(1);
    expect(filterModules([customers], { search: 'orders', assignment: 'all', status: 'all' })).toHaveLength(0);
    expect(filterModules([customers], { search: '', assignment: 'assigned', status: 'all' })).toHaveLength(0);
    expect(filterModules([customers], { search: '', assignment: 'partial', status: 'all' })).toHaveLength(1);
  });

  it('applies assignment without duplicating permission definitions', () => {
    const next = applyAssignment([customers], new Set([3]), true);
    expect(next[0]!.assignedCount).toBe(3);
    expect(next[0]!.permissions.find((p) => p.id === 3)?.assigned).toBe(true);
    expect(moduleCheckboxState(next[0]!)).toBe('checked');
  });
});
