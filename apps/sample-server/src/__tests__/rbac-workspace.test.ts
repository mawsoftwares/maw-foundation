import { describe, expect, it } from 'vitest';
import { buildRoleWorkspace, summarizeModules, type ModuleRow, type PermissionRow } from '../rbac-workspace';

const role = {
  id: 1,
  code: 'manager',
  name: 'Manager',
  description: 'Can manage customers and orders',
  isActive: true,
  sortOrder: 2,
};

function mod(partial: Partial<ModuleRow> & Pick<ModuleRow, 'id' | 'code' | 'name'>): ModuleRow {
  return {
    description: null,
    parentModuleId: null,
    isActive: true,
    isSystem: true,
    sortOrder: 0,
    ...partial,
  };
}

function perm(partial: Partial<PermissionRow> & Pick<PermissionRow, 'id' | 'code' | 'name'>): PermissionRow {
  return {
    description: null,
    isActive: true,
    isSystem: true,
    sortOrder: 0,
    ...partial,
  };
}

describe('buildRoleWorkspace', () => {
  it('groups permissions under their linked module', () => {
    const workspace = buildRoleWorkspace({
      role,
      modules: [mod({ id: 10, code: 'orders', name: 'Orders', description: 'Order management' })],
      permissions: [
        perm({ id: 1, code: 'Read_Orders', name: 'Read', description: 'View orders' }),
        perm({ id: 2, code: 'Create_Orders', name: 'Create' }),
        perm({ id: 3, code: 'Delete_Orders', name: 'Delete' }),
      ],
      modulePermissions: [
        { moduleId: 10, permissionId: 1 },
        { moduleId: 10, permissionId: 2 },
        { moduleId: 10, permissionId: 3 },
      ],
      assignedPermissionIds: new Set([1, 2]),
      assignmentCounts: new Map([[1, 3], [2, 1], [3, 0]]),
    });

    expect(workspace.modules).toHaveLength(1);
    expect(workspace.modules[0]!.permissions.map((p) => p.name)).toEqual(['Read', 'Create', 'Delete']);
    expect(workspace.modules[0]!.assignedCount).toBe(2);
    expect(workspace.modules[0]!.permissionCount).toBe(3);
    expect(workspace.modules[0]!.permissions[0]!.assigned).toBe(true);
    expect(workspace.modules[0]!.permissions[2]!.assigned).toBe(false);
    expect(workspace.summary).toEqual({
      moduleCount: 1,
      fullyAssigned: 0,
      partiallyAssigned: 1,
      noAccess: 0,
      assignedPermissions: 2,
      availablePermissions: 3,
    });
  });

  it('attaches unlinked Action_Module codes to the matching module', () => {
    const workspace = buildRoleWorkspace({
      role,
      modules: [mod({ id: 10, code: 'audit-logs', name: 'Audit Logs' })],
      permissions: [perm({ id: 1, code: 'Read_AuditLogs', name: 'Read' })],
      modulePermissions: [],
      assignedPermissionIds: new Set(),
      assignmentCounts: new Map(),
    });

    expect(workspace.modules[0]!.permissions).toHaveLength(1);
    expect(workspace.modules[0]!.permissions[0]!.code).toBe('Read_AuditLogs');
    expect(workspace.modules.some((m) => m.isVirtual)).toBe(false);
  });

  it('places truly unlinked permissions in Uncategorized', () => {
    const workspace = buildRoleWorkspace({
      role,
      modules: [mod({ id: 10, code: 'orders', name: 'Orders' })],
      permissions: [perm({ id: 9, code: 'orphan.custom', name: 'Orphan', isSystem: false })],
      modulePermissions: [],
      assignedPermissionIds: new Set(),
      assignmentCounts: new Map(),
    });

    const virtual = workspace.modules.find((m) => m.isVirtual);
    expect(virtual?.code).toBe('uncategorized');
    expect(virtual?.permissions).toHaveLength(1);
  });

  it('marks system vs custom from the source row', () => {
    const workspace = buildRoleWorkspace({
      role,
      modules: [mod({ id: 10, code: 'orders', name: 'Orders' })],
      permissions: [
        perm({ id: 1, code: 'Read_Orders', name: 'Read', isSystem: true }),
        perm({ id: 2, code: 'Export_Orders', name: 'Export', isSystem: false }),
      ],
      modulePermissions: [
        { moduleId: 10, permissionId: 1 },
        { moduleId: 10, permissionId: 2 },
      ],
      assignedPermissionIds: new Set([1]),
      assignmentCounts: new Map(),
    });

    expect(workspace.modules[0]!.permissions.find((p) => p.code === 'Read_Orders')?.isSystem).toBe(true);
    expect(workspace.modules[0]!.permissions.find((p) => p.code === 'Export_Orders')?.isSystem).toBe(false);
  });
});

describe('summarizeModules', () => {
  it('counts fully / partial / none', () => {
    const summary = summarizeModules([
      {
        id: 1, code: 'a', name: 'A', description: null, parentModuleId: null,
        isActive: true, isSystem: true, isVirtual: false, sortOrder: 0,
        permissions: [
          { id: 1, code: 'a', name: 'A', description: null, isActive: true, isSystem: true, sortOrder: 0, assigned: true, assignedRoleCount: 1 },
          { id: 2, code: 'b', name: 'B', description: null, isActive: true, isSystem: true, sortOrder: 1, assigned: true, assignedRoleCount: 1 },
        ],
        assignedCount: 2, permissionCount: 2,
      },
      {
        id: 2, code: 'c', name: 'C', description: null, parentModuleId: null,
        isActive: true, isSystem: true, isVirtual: false, sortOrder: 1,
        permissions: [
          { id: 3, code: 'c', name: 'C', description: null, isActive: true, isSystem: true, sortOrder: 0, assigned: true, assignedRoleCount: 1 },
          { id: 4, code: 'd', name: 'D', description: null, isActive: true, isSystem: true, sortOrder: 1, assigned: false, assignedRoleCount: 0 },
        ],
        assignedCount: 1, permissionCount: 2,
      },
      {
        id: 3, code: 'e', name: 'E', description: null, parentModuleId: null,
        isActive: true, isSystem: true, isVirtual: false, sortOrder: 2,
        permissions: [
          { id: 5, code: 'e', name: 'E', description: null, isActive: true, isSystem: true, sortOrder: 0, assigned: false, assignedRoleCount: 0 },
        ],
        assignedCount: 0, permissionCount: 1,
      },
    ]);

    expect(summary).toEqual({
      moduleCount: 3,
      fullyAssigned: 1,
      partiallyAssigned: 1,
      noAccess: 1,
      assignedPermissions: 3,
      availablePermissions: 5,
    });
  });
});
