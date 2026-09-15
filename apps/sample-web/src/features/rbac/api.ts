import { getApiErrorMessage } from '@mawsoftwares/api-client';
import { client } from '../../api';
import type { Role, RolePermissionAssignment, RoleWorkspace, WorkspacePermission } from './types';

export function rbacErrorMessage(err: unknown): string {
  return getApiErrorMessage(err);
}

export async function fetchRoles(): Promise<Role[]> {
  const r = await client.request<{ data: Role[] }>('/api/v1/rbac/roles');
  return r.data;
}

export async function createRole(body: { code: string; name: string; description?: string; sortOrder: number }): Promise<Role> {
  const r = await client.request<{ data: Role }>('/api/v1/rbac/roles', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
}

export async function updateRole(id: number, body: { name: string; description?: string; sortOrder: number; isActive: boolean }): Promise<Role> {
  const r = await client.request<{ data: Role }>(`/api/v1/rbac/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return r.data;
}

export async function deleteRole(id: number): Promise<void> {
  await client.request(`/api/v1/rbac/roles/${id}`, { method: 'DELETE' });
}

export async function fetchRoleWorkspace(roleId: number): Promise<RoleWorkspace> {
  const r = await client.request<{ data: RoleWorkspace }>(`/api/v1/rbac/roles/${roleId}/workspace`);
  return r.data;
}

export async function saveRoleAssignments(roleId: number, assignments: readonly RolePermissionAssignment[]): Promise<void> {
  await client.request(`/api/v1/rbac/roles/${roleId}/permissions`, {
    method: 'POST',
    body: JSON.stringify({ assignments }),
  });
}

export async function createModule(body: {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  parentModuleId?: number;
  permissions?: { code: string; name: string; description?: string }[];
}): Promise<{ id: number; code: string; name: string }> {
  const r = await client.request<{ data: { id: number; code: string; name: string } }>('/api/v1/rbac/modules', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
}

export async function updateModule(id: number, body: {
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  parentModuleId?: number | null;
}): Promise<void> {
  await client.request(`/api/v1/rbac/modules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteModule(id: number): Promise<void> {
  await client.request(`/api/v1/rbac/modules/${id}`, { method: 'DELETE' });
}

export async function addPermissionToModule(moduleId: number, body: {
  code: string;
  name: string;
  description?: string;
}): Promise<WorkspacePermission> {
  const r = await client.request<{ data: WorkspacePermission }>(`/api/v1/rbac/modules/${moduleId}/permissions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
}

export async function updatePermission(id: number, body: {
  name: string;
  description?: string;
  sortOrder?: number;
  isActive: boolean;
  code?: string;
}): Promise<WorkspacePermission> {
  const r = await client.request<{ data: WorkspacePermission }>(`/api/v1/rbac/permissions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return r.data;
}

export async function deletePermission(id: number): Promise<void> {
  await client.request(`/api/v1/rbac/permissions/${id}`, { method: 'DELETE' });
}

export async function fetchPermissionAssignments(id: number): Promise<{ count: number; roles: { id: number; code: string; name: string }[] }> {
  const r = await client.request<{ data: { count: number; roles: { id: number; code: string; name: string }[] } }>(
    `/api/v1/rbac/permissions/${id}/assignments`,
  );
  return r.data;
}
