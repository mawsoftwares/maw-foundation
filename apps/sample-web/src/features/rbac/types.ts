export interface Role {
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
  role: Role;
  modules: WorkspaceModule[];
  summary: WorkspaceSummary;
}

export type AssignmentFilter = 'all' | 'assigned' | 'partial' | 'none';
export type StatusFilter = 'all' | 'active' | 'inactive';

export interface RolePermissionAssignment {
  permissionId: number;
  moduleId: number | null;
}

export const DEFAULT_MODULE_ACTIONS = [
  { key: 'Read', label: 'View', description: 'View records' },
  { key: 'Create', label: 'Create', description: 'Create new records' },
  { key: 'Update', label: 'Edit', description: 'Edit existing records' },
  { key: 'Delete', label: 'Delete', description: 'Delete records' },
  { key: 'Export', label: 'Export', description: 'Export records' },
] as const;
