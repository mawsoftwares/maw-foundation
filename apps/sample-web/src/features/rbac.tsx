import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ApiError } from '@mawsoftwares/api-client';
import {
  ListPage, DataTable, Badge, Button, Modal, TextField, useForm,
  useToast, ErrorState, PageLoader, Tabs, type ColumnDef
} from '@mawsoftwares/ui-web';
import { client } from '../api';

interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface Module {
  id: number;
  code: string;
  name: string;
  description: string | null;
  parentModuleId: number | null;
  isActive: boolean;
  sortOrder: number;
}

interface RolePermissionAssignment {
  permissionId: number;
  moduleId: number | null;
}

export function RbacView(): ReactNode {
  const [tab, setTab] = useState<'roles' | 'permissions' | 'modules'>('roles');

  return (
    <div>
      <Tabs
        tabs={[
          { key: 'roles', label: 'Roles' },
          { key: 'permissions', label: 'Permissions' },
          { key: 'modules', label: 'Modules / Actions' },
        ]}
        activeTab={tab}
        onChange={(k) => setTab(k as any)}
        style={{ marginBottom: 'var(--maw-space-lg)' }}
      />

      {tab === 'roles' && <RolesTab />}
      {tab === 'permissions' && <PermissionsTab />}
      {tab === 'modules' && <ModulesTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Roles Tab — card grid + inline collapsible permission panel
// ---------------------------------------------------------------------------
function RolesTab(): ReactNode {
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [showCreate, setShowCreate] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(undefined);
    client.request<{ data: Role[] }>('/api/v1/rbac/roles')
      .then((r) => setRoles(r.data))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteRole = async (id: number) => {
    if (!window.confirm('Delete this role?')) return;
    try {
      await client.request(`/api/v1/rbac/roles/${id}`, { method: 'DELETE' });
      toast.success('Role deleted');
      if (expandedRoleId === id) setExpandedRoleId(null);
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const createForm = useForm({
    initialValues: { code: '', name: '', description: '', sortOrder: 0 },
    fields: { code: { required: true }, name: { required: true } },
    onSubmit: async (values) => {
      try {
        await client.request('/api/v1/rbac/roles', {
          method: 'POST',
          body: JSON.stringify({ code: values.code, name: values.name, description: values.description || undefined, sortOrder: Number(values.sortOrder) }),
        });
        toast.success('Role created'); setShowCreate(false); createForm.reset(); load();
      } catch (e) { toast.error((e as Error).message); }
    },
  });

  const editForm = useForm({
    initialValues: { name: '', description: '', sortOrder: 0, isActive: true },
    fields: { name: { required: true } },
    onSubmit: async (values) => {
      if (!editingRole) return;
      try {
        await client.request(`/api/v1/rbac/roles/${editingRole.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: values.name, description: values.description || undefined, sortOrder: Number(values.sortOrder), isActive: values.isActive }),
        });
        toast.success('Role updated'); setEditingRole(null); load();
      } catch (e) { toast.error((e as Error).message); }
    },
  });

  useEffect(() => {
    if (editingRole) editForm.reset({ name: editingRole.name, description: editingRole.description || '', sortOrder: editingRole.sortOrder, isActive: editingRole.isActive });
  }, [editingRole]);

  if (error) return <ErrorState title="Failed to load roles" message={error} retry={load} />;
  if (loading && roles.length === 0) return <PageLoader message="Loading roles..." />;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--maw-space-xl)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xxl)', fontWeight: 800, color: 'var(--maw-fg)', letterSpacing: '-0.02em' }}>Role Management</h1>
          <p style={{ margin: '6px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>Select a role card to manage its permissions inline</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Create Role</Button>
      </div>

      {/* Two-column layout when expanded */}
      <div style={{ display: 'flex', gap: 'var(--maw-space-lg)', alignItems: 'flex-start', marginBottom: 'var(--maw-space-lg)' }}>
        {/* Left column: Role cards */}
        <div style={{ flex: expandedRoleId !== null ? '0 0 320px' : '1', transition: 'flex 0.3s' }}>
          <div style={{ display: 'grid', gridTemplateColumns: expandedRoleId !== null ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--maw-space-md)' }}>
            {roles.map((role) => {
              const isExpanded = expandedRoleId === role.id;
              return (
                <div key={role.id} style={{
                  border: `2px solid ${isExpanded ? 'var(--maw-brand)' : 'var(--maw-border)'}`,
                  borderRadius: 'var(--maw-radius-lg)',
                  background: isExpanded ? 'color-mix(in srgb, var(--maw-brand) 6%, var(--maw-bg))' : 'var(--maw-surface)',
                  transition: 'border-color 0.2s, background 0.2s', overflow: 'hidden',
                }}>
                  <button
                    onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 'var(--maw-space-md)', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
                  >
                    <span style={{ fontSize: 20, width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isExpanded ? 'var(--maw-brand)' : 'var(--maw-border)', color: isExpanded ? '#fff' : 'var(--maw-fgMuted)', flexShrink: 0 }}>🔑</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {role.name}
                        <span style={{ fontSize: 11, color: 'var(--maw-fgMuted)', transform: `rotate(${isExpanded ? -90 : 0}deg)`, transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                      </div>
                      <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginTop: 2, fontFamily: 'monospace' }}>{role.code}</div>
                      {role.description && <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role.description}</div>}
                      <div style={{ marginTop: 6 }}>
                        <Badge variant={role.isActive ? 'success' : 'danger'}>{role.isActive ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </div>
                  </button>
                  <div style={{ padding: '0 var(--maw-space-md) var(--maw-space-sm)', display: 'flex', gap: 6 }}>
                    <Button variant="ghost" onClick={() => setEditingRole(role)} style={{ fontSize: 'var(--maw-text-xs)', padding: '3px 10px' }}>Edit</Button>
                    {role.code !== 'super_admin' && role.code !== 'owner' && (
                      <Button variant="ghost" onClick={() => deleteRole(role.id)} style={{ fontSize: 'var(--maw-text-xs)', padding: '3px 10px', color: 'var(--maw-danger)' }}>Delete</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Inline permissions panel */}
        {expandedRoleId !== null && (() => {
          const role = roles.find((r) => r.id === expandedRoleId);
          return role ? (
            <div style={{ flex: 1, position: 'sticky', top: 'var(--maw-space-lg)' }}>
              <RolePermissionsPanel key={expandedRoleId} role={role} onClose={() => setExpandedRoleId(null)} />
            </div>
          ) : null;
        })()}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Role">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <TextField label="Role Code" required error={createForm.errors.code} value={createForm.values.code}
            onChange={(e) => createForm.setValue('code', (e.target as HTMLInputElement).value)} placeholder="e.g. clerk" />
          <TextField label="Name" required error={createForm.errors.name} value={createForm.values.name}
            onChange={(e) => createForm.setValue('name', (e.target as HTMLInputElement).value)} placeholder="e.g. Clerk" />
          <TextField label="Description" value={createForm.values.description}
            onChange={(e) => createForm.setValue('description', (e.target as HTMLInputElement).value)} placeholder="Optional" />
          <TextField label="Sort Order" type="number" value={String(createForm.values.sortOrder)}
            onChange={(e) => createForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createForm.handleSubmit()} disabled={createForm.submitting}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editingRole} onClose={() => setEditingRole(null)} title={`Edit Role: ${editingRole?.code}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <TextField label="Name" required error={editForm.errors.name} value={editForm.values.name}
            onChange={(e) => editForm.setValue('name', (e.target as HTMLInputElement).value)} />
          <TextField label="Description" value={editForm.values.description}
            onChange={(e) => editForm.setValue('description', (e.target as HTMLInputElement).value)} />
          <TextField label="Sort Order" type="number" value={String(editForm.values.sortOrder)}
            onChange={(e) => editForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--maw-text-sm)' }}>
            <input type="checkbox" checked={editForm.values.isActive} onChange={(e) => editForm.setValue('isActive', e.target.checked)} />Active
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="ghost" onClick={() => setEditingRole(null)}>Cancel</Button>
            <Button onClick={() => editForm.handleSubmit()} disabled={editForm.submitting}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline collapsible permission panel (replaces the old modal)
// ---------------------------------------------------------------------------
function RolePermissionsPanel({ role, onClose }: { role: Role; onClose: () => void }): ReactNode {
  const toast = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [assigned, setAssigned] = useState<RolePermissionAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, mRes, aRes] = await Promise.all([
        client.request<{ data: Permission[] }>('/api/v1/rbac/permissions'),
        client.request<{ data: Module[] }>('/api/v1/rbac/modules'),
        client.request<{ data: RolePermissionAssignment[] }>(`/api/v1/rbac/roles/${role.id}/permissions`),
      ]);
      setPermissions(pRes.data);
      setModules(mRes.data);
      setAssigned(aRes.data);
      // Default: open all module groups
      const names = new Set<string>();
      for (const p of pRes.data) {
        const parts = p.code.split('_');
        names.add(parts.length >= 2 ? parts.slice(1).join('_') : 'Global');
      }
      setExpandedModules(new Set(names));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [role.id, toast]);

  useEffect(() => { void loadData(); }, [loadData]);

  const isChecked = (permissionId: number) => assigned.some((a) => a.permissionId === permissionId);

  const handleToggle = (permissionId: number) => {
    setAssigned((prev) => {
      const idx = prev.findIndex((a) => a.permissionId === permissionId);
      return idx >= 0 ? prev.filter((_, i) => i !== idx) : [...prev, { permissionId, moduleId: null }];
    });
  };

  const handleGroupToggle = (groupPerms: Permission[]) => {
    const allChecked = groupPerms.every((p) => isChecked(p.id));
    setAssigned((prev) => {
      const ids = new Set(groupPerms.map((p) => p.id));
      const filtered = prev.filter((a) => !ids.has(a.permissionId));
      return allChecked ? filtered : [...filtered, ...groupPerms.map((p) => ({ permissionId: p.id, moduleId: null }))];
    });
  };

  const toggleModuleExpand = (name: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await client.request(`/api/v1/rbac/roles/${role.id}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ assignments: assigned }),
      });
      toast.success('Permissions saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  };

  // Group permissions by module name from code (e.g. "Read_Orders" → "Orders")
  const groups: Record<string, Permission[]> = {};
  for (const p of permissions) {
    const parts = p.code.split('_');
    const g = parts.length >= 2 ? parts.slice(1).join('_') : 'Global / System';
    groups[g] = groups[g] || [];
    groups[g].push(p);
  }

  const getAction = (code: string) => code.split('_')[0] ?? code;

  // suppress unused modules warning
  void modules;

  return (
    <div style={{
      border: '1px solid var(--maw-border)', borderRadius: 'var(--maw-radius-lg)',
      background: 'var(--maw-surface)', overflow: 'hidden',
      marginBottom: 'var(--maw-space-lg)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    }}>
      {/* Panel header */}
      <div style={{
        background: 'var(--maw-surface)',
        borderBottom: '1px solid var(--maw-border)',
        padding: 'var(--maw-space-md) var(--maw-space-lg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)' }}>{role.name} Permissions</div>
            <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', fontFamily: 'monospace', marginTop: 2 }}>
              {role.code} · {assigned.length} permission{assigned.length !== 1 ? 's' : ''} assigned
            </div>
          </div>
        </div>
        <Button variant="ghost" onClick={onClose} style={{ fontSize: 'var(--maw-text-xs)' }}>✕ Close</Button>
      </div>

      {loading ? (
        <div style={{ padding: 'var(--maw-space-xl)' }}><PageLoader message="Loading permissions..." /></div>
      ) : (
        <>
          {/* Module sections */}
          <div style={{ padding: 'var(--maw-space-md) var(--maw-space-lg)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--maw-space-sm)' }}>
              {Object.entries(groups).map(([groupName, groupPerms]) => {
                const isOpen = expandedModules.has(groupName);
                const checkedCount = groupPerms.filter((p) => isChecked(p.id)).length;
                const allChecked = checkedCount === groupPerms.length;
                const someChecked = checkedCount > 0 && !allChecked;
                return (
                  <div key={groupName} style={{
                    border: '1px solid var(--maw-border)', borderRadius: 'var(--maw-radius-md)',
                    overflow: 'hidden', background: 'var(--maw-bg)',
                  }}>
                    {/* Module header row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px var(--maw-space-md)',
                      background: isOpen ? 'var(--maw-surface)' : 'var(--maw-bg)',
                      transition: 'background 0.15s',
                    }}>
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked; }}
                        onChange={() => handleGroupToggle(groupPerms)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--maw-brand)', flexShrink: 0 }}
                      />
                      <button
                        onClick={() => toggleModuleExpand(groupName)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)' }}>
                          {groupName.replace(/_/g, ' ')}
                        </span>
                        <span style={{
                          marginLeft: 'auto', fontSize: 'var(--maw-text-xs)', padding: '2px 8px',
                          borderRadius: 'var(--maw-radius-full)',
                          background: checkedCount > 0 ? 'var(--maw-surface)' : 'var(--maw-bg)',
                          border: '1px solid var(--maw-border)',
                          color: checkedCount > 0 ? 'var(--maw-fg)' : 'var(--maw-fgMuted)',
                          fontWeight: 600, transition: 'background 0.15s, border-color 0.15s',
                        }}>
                          {checkedCount}/{groupPerms.length}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--maw-fgMuted)', transform: `rotate(${isOpen ? 180 : 0}deg)`, transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                      </button>
                    </div>

                    {/* Permission checkboxes */}
                    {isOpen && (
                      <div style={{
                        borderTop: '1px solid var(--maw-border)',
                        padding: 'var(--maw-space-sm) var(--maw-space-md)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                        gap: '6px',
                        background: 'var(--maw-bg)',
                      }}>
                        {groupPerms.map((p) => {
                          const checked = isChecked(p.id);
                          const action = getAction(p.code);
                          return (
                            <label key={p.id} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '6px 10px', borderRadius: 'var(--maw-radius-sm)',
                              cursor: 'pointer', transition: 'background 0.12s, border-color 0.12s',
                              background: checked ? 'var(--maw-surface)' : 'transparent',
                              border: `1px solid ${checked ? 'var(--maw-border)' : 'transparent'}`,
                            }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggle(p.id)}
                                style={{ width: 14, height: 14, accentColor: 'var(--maw-brand)', cursor: 'pointer', flexShrink: 0 }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div style={{
                                  fontSize: 'var(--maw-text-xs)', fontWeight: 600,
                                  color: checked ? 'var(--maw-fg)' : 'var(--maw-fgMuted)',
                                  textTransform: 'uppercase', letterSpacing: '0.04em',
                                }}>{action}</div>
                                {p.description && (
                                  <div style={{ fontSize: 10, color: 'var(--maw-fgMuted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.description}
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky save bar */}
          <div style={{
            borderTop: '1px solid var(--maw-border)',
            padding: 'var(--maw-space-sm) var(--maw-space-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--maw-surface)',
          }}>
            <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
              {assigned.length} permission{assigned.length !== 1 ? 's' : ''} selected
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" onClick={onClose}>Discard</Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Permissions Tab
// ---------------------------------------------------------------------------
function PermissionsTab(): ReactNode {
  const toast = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [showCreate, setShowCreate] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    client
      .request<{ data: Permission[] }>('/api/v1/rbac/permissions')
      .then((r) => setPermissions(r.data))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deletePerm = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this permission?')) return;
    try {
      await client.request(`/api/v1/rbac/permissions/${id}`, { method: 'DELETE' });
      toast.success('Permission deleted successfully');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const createForm = useForm({
    initialValues: { code: '', name: '', description: '', sortOrder: 0 },
    fields: {
      code: { required: true },
      name: { required: true },
    },
    onSubmit: async (values) => {
      try {
        await client.request('/api/v1/rbac/permissions', {
          method: 'POST',
          body: JSON.stringify({
            code: values.code,
            name: values.name,
            description: values.description || undefined,
            sortOrder: Number(values.sortOrder),
          }),
        });
        toast.success('Permission created successfully');
        setShowCreate(false);
        createForm.reset();
        load();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  const editForm = useForm({
    initialValues: { name: '', description: '', sortOrder: 0, isActive: true },
    fields: {
      name: { required: true },
    },
    onSubmit: async (values) => {
      if (!editingPerm) return;
      try {
        await client.request(`/api/v1/rbac/permissions/${editingPerm.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: values.name,
            description: values.description || undefined,
            sortOrder: Number(values.sortOrder),
            isActive: values.isActive,
          }),
        });
        toast.success('Permission updated successfully');
        setEditingPerm(null);
        load();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  useEffect(() => {
    if (editingPerm) {
      editForm.reset({
        name: editingPerm.name,
        description: editingPerm.description || '',
        sortOrder: editingPerm.sortOrder,
        isActive: editingPerm.isActive,
      });
    }
  }, [editingPerm]);

  if (error) return <ErrorState title="Failed to load permissions" message={error} retry={load} />;
  if (loading && permissions.length === 0) return <PageLoader message="Loading permissions..." />;

  const columns: ColumnDef<Permission>[] = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'description', header: 'Description' },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => <Badge variant={row.isActive ? 'success' : 'danger'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions' as any,
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={() => setEditingPerm(row)}>
            Edit
          </Button>
          <Button variant="ghost" onClick={() => deletePerm(row.id)} style={{ color: 'var(--maw-danger)' }}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ListPage title="Permissions Manager" createLabel="Create Permission" onCreate={() => setShowCreate(true)}>
      <DataTable columns={columns} data={permissions} keyField="id" emptyMessage="No permissions found" />

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Permission">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <TextField
            label="Permission Code"
            required
            error={createForm.errors.code}
            value={createForm.values.code}
            onChange={(e) => createForm.setValue('code', (e.target as HTMLInputElement).value)}
            placeholder="e.g. Create_Orders"
          />
          <TextField
            label="Name"
            required
            error={createForm.errors.name}
            value={createForm.values.name}
            onChange={(e) => createForm.setValue('name', (e.target as HTMLInputElement).value)}
            placeholder="e.g. Create Orders"
          />
          <TextField
            label="Description"
            value={createForm.values.description}
            onChange={(e) => createForm.setValue('description', (e.target as HTMLInputElement).value)}
            placeholder="Optional description"
          />
          <TextField
            label="Sort Order"
            type="number"
            value={String(createForm.values.sortOrder)}
            onChange={(e) => createForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createForm.handleSubmit()} disabled={createForm.submitting}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editingPerm} onClose={() => setEditingPerm(null)} title={`Edit Permission: ${editingPerm?.code}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <TextField
            label="Name"
            required
            error={editForm.errors.name}
            value={editForm.values.name}
            onChange={(e) => editForm.setValue('name', (e.target as HTMLInputElement).value)}
          />
          <TextField
            label="Description"
            value={editForm.values.description}
            onChange={(e) => editForm.setValue('description', (e.target as HTMLInputElement).value)}
          />
          <TextField
            label="Sort Order"
            type="number"
            value={String(editForm.values.sortOrder)}
            onChange={(e) => editForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--maw-text-sm)' }}>
            <input type="checkbox" checked={editForm.values.isActive} onChange={(e) => editForm.setValue('isActive', e.target.checked)} />
            Active
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="ghost" onClick={() => setEditingPerm(null)}>Cancel</Button>
            <Button onClick={() => editForm.handleSubmit()} disabled={editForm.submitting}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </ListPage>
  );
}

// ---------------------------------------------------------------------------
// 3. Modules Tab
// ---------------------------------------------------------------------------
function ModulesTab(): ReactNode {
  const toast = useToast();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [showCreate, setShowCreate] = useState(false);
  const [editingMod, setEditingMod] = useState<Module | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    client
      .request<{ data: Module[] }>('/api/v1/rbac/modules')
      .then((r) => setModules(r.data))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteMod = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this module?')) return;
    try {
      await client.request(`/api/v1/rbac/modules/${id}`, { method: 'DELETE' });
      toast.success('Module deleted successfully');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const createForm = useForm({
    initialValues: { code: '', name: '', description: '', sortOrder: 0, parentModuleId: '' },
    fields: {
      code: { required: true },
      name: { required: true },
    },
    onSubmit: async (values) => {
      try {
        await client.request('/api/v1/rbac/modules', {
          method: 'POST',
          body: JSON.stringify({
            code: values.code,
            name: values.name,
            description: values.description || undefined,
            sortOrder: Number(values.sortOrder),
            parentModuleId: values.parentModuleId ? Number(values.parentModuleId) : undefined,
          }),
        });
        toast.success('Module created successfully');
        setShowCreate(false);
        createForm.reset();
        load();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  const editForm = useForm({
    initialValues: { name: '', description: '', sortOrder: 0, isActive: true, parentModuleId: '' },
    fields: {
      name: { required: true },
    },
    onSubmit: async (values) => {
      if (!editingMod) return;
      try {
        await client.request(`/api/v1/rbac/modules/${editingMod.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: values.name,
            description: values.description || undefined,
            sortOrder: Number(values.sortOrder),
            isActive: values.isActive,
            parentModuleId: values.parentModuleId ? Number(values.parentModuleId) : undefined,
          }),
        });
        toast.success('Module updated successfully');
        setEditingMod(null);
        load();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  useEffect(() => {
    if (editingMod) {
      editForm.reset({
        name: editingMod.name,
        description: editingMod.description || '',
        sortOrder: editingMod.sortOrder,
        isActive: editingMod.isActive,
        parentModuleId: editingMod.parentModuleId ? String(editingMod.parentModuleId) : '',
      });
    }
  }, [editingMod]);

  if (error) return <ErrorState title="Failed to load modules" message={error} retry={load} />;
  if (loading && modules.length === 0) return <PageLoader message="Loading modules..." />;

  const columns: ColumnDef<Module>[] = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'description', header: 'Description' },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => <Badge variant={row.isActive ? 'success' : 'danger'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions' as any,
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={() => setEditingMod(row)}>
            Edit
          </Button>
          <Button variant="ghost" onClick={() => deleteMod(row.id)} style={{ color: 'var(--maw-danger)' }}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ListPage title="Module / Action Registry" createLabel="Create Module" onCreate={() => setShowCreate(true)}>
      <DataTable columns={columns} data={modules} keyField="id" emptyMessage="No modules found" />

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Module">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <TextField
            label="Module Code"
            required
            error={createForm.errors.code}
            value={createForm.values.code}
            onChange={(e) => createForm.setValue('code', (e.target as HTMLInputElement).value)}
            placeholder="e.g. orders"
          />
          <TextField
            label="Name"
            required
            error={createForm.errors.name}
            value={createForm.values.name}
            onChange={(e) => createForm.setValue('name', (e.target as HTMLInputElement).value)}
            placeholder="e.g. Orders"
          />
          <TextField
            label="Description"
            value={createForm.values.description}
            onChange={(e) => createForm.setValue('description', (e.target as HTMLInputElement).value)}
            placeholder="Optional description"
          />
          <TextField
            label="Parent Module ID"
            value={createForm.values.parentModuleId}
            onChange={(e) => createForm.setValue('parentModuleId', (e.target as HTMLInputElement).value)}
            placeholder="Optional parent module ID"
          />
          <TextField
            label="Sort Order"
            type="number"
            value={String(createForm.values.sortOrder)}
            onChange={(e) => createForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createForm.handleSubmit()} disabled={createForm.submitting}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editingMod} onClose={() => setEditingMod(null)} title={`Edit Module: ${editingMod?.code}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <TextField
            label="Name"
            required
            error={editForm.errors.name}
            value={editForm.values.name}
            onChange={(e) => editForm.setValue('name', (e.target as HTMLInputElement).value)}
          />
          <TextField
            label="Description"
            value={editForm.values.description}
            onChange={(e) => editForm.setValue('description', (e.target as HTMLInputElement).value)}
          />
          <TextField
            label="Parent Module ID"
            value={editForm.values.parentModuleId}
            onChange={(e) => editForm.setValue('parentModuleId', (e.target as HTMLInputElement).value)}
          />
          <TextField
            label="Sort Order"
            type="number"
            value={String(editForm.values.sortOrder)}
            onChange={(e) => editForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--maw-text-sm)' }}>
            <input type="checkbox" checked={editForm.values.isActive} onChange={(e) => editForm.setValue('isActive', e.target.checked)} />
            Active
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="ghost" onClick={() => setEditingMod(null)}>Cancel</Button>
            <Button onClick={() => editForm.handleSubmit()} disabled={editForm.submitting}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </ListPage>
  );
}
