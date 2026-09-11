import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ApiError } from '@mawsoftwares/api-client';
import {
  Badge, Button, Modal, TextField, useForm,
  useToast, ErrorState, PageLoader, IconButton, Divider,
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
  return <RolesTab />;
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
  const [rightPanel, setRightPanel] = useState<{ type: 'role'; roleId: number } | { type: 'modules' } | null>(null);

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
      if (rightPanel?.type === 'role' && rightPanel.roleId === id) setRightPanel(null);
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const createForm = useForm({
    initialValues: { code: '', name: '', description: '', sortOrder: 0 },
    fields: { code: { required: true }, name: { required: true } },
    onSubmit: async (values) => {
      try {
        const created = await client.request<{ data: Role }>('/api/v1/rbac/roles', {
          method: 'POST',
          body: JSON.stringify({ code: values.code, name: values.name, description: values.description || undefined, sortOrder: Number(values.sortOrder) }),
        });
        toast.success('Role created'); setShowCreate(false); createForm.reset();
        setRoles((prev) => [...prev, created.data]);
        setRightPanel({ type: 'role', roleId: created.data.id });
        load();
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
        <div style={{ display: 'flex', gap: 'var(--maw-space-sm)' }}>
          <Button
            variant={rightPanel?.type === 'modules' ? undefined : 'ghost'}
            onClick={() => setRightPanel(rightPanel?.type === 'modules' ? null : { type: 'modules' })}
          >
            Manage Modules & Permissions
          </Button>
          <Button onClick={() => setShowCreate(true)}>+ Create Role</Button>
        </div>
      </div>

      {/* Two-column layout when expanded */}
      <div style={{ display: 'flex', gap: 'var(--maw-space-lg)', alignItems: 'flex-start', marginBottom: 'var(--maw-space-lg)' }}>
        {/* Left column: Role cards */}
        <div style={{ flex: rightPanel !== null ? '0 0 320px' : '1', transition: 'flex 0.3s' }}>
          <div style={{ display: 'grid', gridTemplateColumns: rightPanel !== null ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--maw-space-md)' }}>
            {roles.map((role) => {
              const isExpanded = rightPanel?.type === 'role' && rightPanel.roleId === role.id;
              return (
                <div key={role.id} style={{
                  border: `2px solid ${isExpanded ? 'var(--maw-brand)' : 'var(--maw-border)'}`,
                  borderRadius: 'var(--maw-radius-lg)',
                  background: isExpanded ? 'color-mix(in srgb, var(--maw-brand) 6%, var(--maw-bg))' : 'var(--maw-surface)',
                  transition: 'border-color 0.2s, background 0.2s', overflow: 'hidden',
                }}>
                  <button
                    onClick={() => setRightPanel(isExpanded ? null : { type: 'role', roleId: role.id })}
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

        {/* Right column: role-permissions panel, or the modules & permissions manager */}
        {rightPanel?.type === 'role' && (() => {
          const role = roles.find((r) => r.id === rightPanel.roleId);
          return role ? (
            <div style={{ flex: 1, position: 'sticky', top: 'var(--maw-space-lg)' }}>
              <RolePermissionsPanel key={rightPanel.roleId} role={role} onClose={() => setRightPanel(null)} />
            </div>
          ) : null;
        })()}
        {rightPanel?.type === 'modules' && (
          <div style={{ flex: 1, position: 'sticky', top: 'var(--maw-space-lg)' }}>
            <ModulesPermissionsPanel onClose={() => setRightPanel(null)} />
          </div>
        )}
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

  const getAction = (code: string) => {
    const action = code.split('_')[0] ?? code;
    return action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
  };

  // suppress unused modules warning
  void modules;

  return (
    <div style={{
      border: '1px solid var(--maw-border)',
      borderRadius: 'var(--maw-radius-lg)',
      background: 'var(--maw-surface)',
      overflow: 'hidden',
      marginBottom: 'var(--maw-space-lg)',
    }}>
      <div style={{
        padding: 'var(--maw-space-md) var(--maw-space-lg)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 'var(--maw-space-md)',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)' }}>
            {role.name} Permissions
          </div>
          <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)', marginTop: 2 }}>
            {role.code} · {assigned.length} assigned
          </div>
        </div>
        <IconButton label="Close" onClick={onClose}>✕</IconButton>
      </div>

      <Divider style={{ margin: 0 }} />

      {loading ? (
        <div style={{ padding: 'var(--maw-space-xl)' }}><PageLoader message="Loading permissions..." /></div>
      ) : (
        <>
          <div style={{ padding: 'var(--maw-space-xs) var(--maw-space-lg) var(--maw-space-md)' }}>
            {Object.entries(groups).map(([groupName, groupPerms], index) => {
              const isOpen = expandedModules.has(groupName);
              const checkedCount = groupPerms.filter((p) => isChecked(p.id)).length;
              const allChecked = checkedCount === groupPerms.length && groupPerms.length > 0;
              const someChecked = checkedCount > 0 && !allChecked;
              return (
                <div key={groupName}>
                  {index > 0 && <Divider style={{ margin: 'var(--maw-space-xs) 0' }} />}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--maw-space-sm)',
                    padding: 'var(--maw-space-sm) 0',
                  }}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked; }}
                      onChange={() => handleGroupToggle(groupPerms)}
                      aria-label={`Toggle all ${groupName.replace(/_/g, ' ')} permissions`}
                      style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--maw-brand)', flexShrink: 0, margin: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleModuleExpand(groupName)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--maw-space-sm)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontWeight: 500, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)' }}>
                        {groupName.replace(/_/g, ' ')}
                      </span>
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: 'var(--maw-text-xs)',
                        color: 'var(--maw-fgSubtle)',
                        fontWeight: 500,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {checkedCount}/{groupPerms.length}
                      </span>
                      <span style={{
                        fontSize: 10,
                        color: 'var(--maw-fgSubtle)',
                        transform: `rotate(${isOpen ? 180 : 0}deg)`,
                        transition: 'transform 0.15s',
                        display: 'inline-block',
                      }}>▾</span>
                    </button>
                  </div>

                  {isOpen && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '2px var(--maw-space-md)',
                      padding: '0 0 var(--maw-space-sm) 22px',
                    }}>
                      {groupPerms.map((p) => {
                        const checked = isChecked(p.id);
                        return (
                          <label
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 'var(--maw-space-sm)',
                              padding: '6px 8px',
                              borderRadius: 'var(--maw-radius-sm)',
                              cursor: 'pointer',
                              background: checked
                                ? 'color-mix(in srgb, var(--maw-brand) 7%, transparent)'
                                : 'transparent',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggle(p.id)}
                              style={{ width: 13, height: 14, accentColor: 'var(--maw-brand)', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontSize: 'var(--maw-text-sm)',
                                fontWeight: 500,
                                color: checked ? 'var(--maw-fg)' : 'var(--maw-fgMuted)',
                                lineHeight: 1.3,
                              }}>
                                {getAction(p.code)}
                              </div>
                              {p.description && (
                                <div style={{
                                  fontSize: 'var(--maw-text-xs)',
                                  color: 'var(--maw-fgSubtle)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  marginTop: 1,
                                }}>
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

          <Divider style={{ margin: 0 }} />
          <div style={{
            padding: 'var(--maw-space-sm) var(--maw-space-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--maw-surface)',
          }}>
            <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)' }}>
              {assigned.length} selected
            </span>
            <div style={{ display: 'flex', gap: 'var(--maw-space-sm)' }}>
              <Button variant="ghost" onClick={onClose}>Discard</Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Modules & Permissions Tab — a single screen to build the module tree
// (parent + nested children) and manage each module's permissions inline,
// instead of hopping between separate Modules and Permissions tabs.
// ---------------------------------------------------------------------------
interface ModuleNode extends Module {
  permissions: Permission[];
  children: ModuleNode[];
}

function ModulesPermissionsPanel({ onClose }: { onClose: () => void }): ReactNode {
  const toast = useToast();
  const [tree, setTree] = useState<ModuleNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Create/Edit module modal state
  const [moduleModal, setModuleModal] = useState<{ mode: 'create' | 'edit'; parentModuleId: number | null; module?: Module } | null>(null);
  // Add-permission modal state
  const [permModal, setPermModal] = useState<{ moduleId: number; moduleName: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    client
      .request<{ data: ModuleNode[] }>('/api/v1/rbac/modules/tree')
      .then((r) => {
        setTree(r.data);
        // Default: expand all top-level modules on first load
        setExpanded((prev) => (prev.size > 0 ? prev : new Set(r.data.map((m) => m.id))));
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const deleteModule = async (mod: ModuleNode) => {
    if (!window.confirm(`Delete "${mod.name}"? Any child modules will also be removed.`)) return;
    try {
      await client.request(`/api/v1/rbac/modules/${mod.id}`, { method: 'DELETE' });
      toast.success('Module deleted');
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const unlinkPermission = async (moduleId: number, permission: Permission) => {
    if (!window.confirm(`Remove "${permission.name}" from this module? The permission itself won't be deleted.`)) return;
    try {
      await client.request(`/api/v1/rbac/modules/${moduleId}/permissions/${permission.id}`, { method: 'DELETE' });
      toast.success('Permission removed from module');
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const moduleForm = useForm({
    initialValues: { code: '', name: '', description: '', sortOrder: 0, isActive: true },
    fields: { code: { required: true }, name: { required: true } },
    onSubmit: async (values) => {
      try {
        if (moduleModal?.mode === 'edit' && moduleModal.module) {
          await client.request(`/api/v1/rbac/modules/${moduleModal.module.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              name: values.name, description: values.description || undefined,
              sortOrder: Number(values.sortOrder), isActive: values.isActive,
              parentModuleId: moduleModal.module.parentModuleId ?? undefined,
            }),
          });
          toast.success('Module updated');
        } else {
          await client.request('/api/v1/rbac/modules', {
            method: 'POST',
            body: JSON.stringify({
              code: values.code, name: values.name, description: values.description || undefined,
              sortOrder: Number(values.sortOrder), parentModuleId: moduleModal?.parentModuleId ?? undefined,
            }),
          });
          toast.success('Module created');
        }
        setModuleModal(null);
        moduleForm.reset();
        load();
      } catch (e) { toast.error((e as Error).message); }
    },
  });

  useEffect(() => {
    if (moduleModal?.mode === 'edit' && moduleModal.module) {
      moduleForm.reset({
        code: moduleModal.module.code, name: moduleModal.module.name,
        description: moduleModal.module.description || '', sortOrder: moduleModal.module.sortOrder,
        isActive: moduleModal.module.isActive,
      });
    } else if (moduleModal?.mode === 'create') {
      moduleForm.reset({ code: '', name: '', description: '', sortOrder: 0, isActive: true });
    }
  }, [moduleModal]);

  const permForm = useForm({
    initialValues: { code: '', name: '', description: '', sortOrder: 0 },
    fields: { code: { required: true }, name: { required: true } },
    onSubmit: async (values) => {
      if (!permModal) return;
      try {
        await client.request(`/api/v1/rbac/modules/${permModal.moduleId}/permissions`, {
          method: 'POST',
          body: JSON.stringify({
            code: values.code, name: values.name,
            description: values.description || undefined, sortOrder: Number(values.sortOrder),
          }),
        });
        toast.success('Permission added');
        setPermModal(null);
        permForm.reset();
        load();
      } catch (e) { toast.error((e as Error).message); }
    },
  });

  if (error) return <ErrorState title="Failed to load modules" message={error} retry={load} />;
  if (loading && tree.length === 0) return <PageLoader message="Loading modules..." />;

  const renderNode = (node: ModuleNode, depth: number): ReactNode => {
    const isOpen = expanded.has(node.id);
    const hasChildren = node.children.length > 0;
    return (
      <div key={node.id} style={{ marginLeft: depth * 24 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--maw-space-sm)',
          padding: 'var(--maw-space-sm) var(--maw-space-md)',
          border: '1px solid var(--maw-border)', borderRadius: 'var(--maw-radius-md)',
          background: 'var(--maw-surface)', marginBottom: 'var(--maw-space-sm)',
        }}>
          <button
            type="button"
            onClick={() => toggleExpand(node.id)}
            disabled={!hasChildren && node.permissions.length === 0}
            style={{ background: 'none', border: 'none', cursor: hasChildren || node.permissions.length > 0 ? 'pointer' : 'default', fontSize: 10, color: 'var(--maw-fgSubtle)', width: 14 }}
          >
            {(hasChildren || node.permissions.length > 0) ? (isOpen ? '▾' : '▸') : ''}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)' }}>{node.name}</span>
              <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)', fontFamily: 'monospace' }}>{node.code}</span>
              <Badge variant={node.isActive ? 'success' : 'danger'}>{node.isActive ? 'Active' : 'Inactive'}</Badge>
              <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)' }}>{node.permissions.length} permission{node.permissions.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <Button variant="ghost" onClick={() => setPermModal({ moduleId: node.id, moduleName: node.name })} style={{ fontSize: 'var(--maw-text-xs)', padding: '3px 8px' }}>+ Permission</Button>
            <Button variant="ghost" onClick={() => setModuleModal({ mode: 'create', parentModuleId: node.id })} style={{ fontSize: 'var(--maw-text-xs)', padding: '3px 8px' }}>+ Child Module</Button>
            <Button variant="ghost" onClick={() => setModuleModal({ mode: 'edit', parentModuleId: node.parentModuleId, module: node })} style={{ fontSize: 'var(--maw-text-xs)', padding: '3px 8px' }}>Edit</Button>
            <Button variant="ghost" onClick={() => deleteModule(node)} style={{ fontSize: 'var(--maw-text-xs)', padding: '3px 8px', color: 'var(--maw-danger)' }}>Delete</Button>
          </div>
        </div>

        {isOpen && node.permissions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 24 + 14, marginBottom: 'var(--maw-space-sm)' }}>
            {node.permissions.map((p) => (
              <span key={p.id} title={p.description ?? undefined} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 6px 3px 10px', borderRadius: 999,
                background: 'color-mix(in srgb, var(--maw-brand) 8%, var(--maw-surface))',
                border: '1px solid var(--maw-border)', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fg)',
              }}>
                {p.name}
                <button
                  type="button"
                  onClick={() => unlinkPermission(node.id, p)}
                  aria-label={`Remove ${p.name}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--maw-fgSubtle)', fontSize: 11, padding: 0, lineHeight: 1 }}
                >✕</button>
              </span>
            ))}
          </div>
        )}

        {isOpen && hasChildren && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{
      border: '1px solid var(--maw-border)',
      borderRadius: 'var(--maw-radius-lg)',
      background: 'var(--maw-surface)',
      overflow: 'hidden',
      marginBottom: 'var(--maw-space-lg)',
    }}>
      <div style={{
        padding: 'var(--maw-space-md) var(--maw-space-lg)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 'var(--maw-space-md)',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)' }}>Modules & Permissions</div>
          <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)', marginTop: 2 }}>
            Add a module, nest a child under it, and attach permissions right here
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--maw-space-sm)', flexShrink: 0 }}>
          <Button onClick={() => setModuleModal({ mode: 'create', parentModuleId: null })} style={{ fontSize: 'var(--maw-text-xs)', padding: '5px 10px' }}>+ Add Module</Button>
          <IconButton label="Close" onClick={onClose}>✕</IconButton>
        </div>
      </div>

      <Divider style={{ margin: 0 }} />

      <div style={{ padding: 'var(--maw-space-md) var(--maw-space-lg)', maxHeight: '70vh', overflowY: 'auto' }}>
        {tree.length === 0 ? (
          <div style={{ padding: 'var(--maw-space-xl)', textAlign: 'center', color: 'var(--maw-fgMuted)' }}>No modules yet — create one to get started.</div>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </div>

      {/* Create/Edit Module Modal */}
      <Modal
        open={moduleModal !== null}
        onClose={() => setModuleModal(null)}
        title={moduleModal?.mode === 'edit' ? `Edit Module: ${moduleModal.module?.code}` : moduleModal?.parentModuleId ? 'Add Child Module' : 'Add Module'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          {moduleModal?.mode !== 'edit' && (
            <TextField label="Module Code" required error={moduleForm.errors.code} value={moduleForm.values.code}
              onChange={(e) => moduleForm.setValue('code', (e.target as HTMLInputElement).value)} placeholder="e.g. orders" />
          )}
          <TextField label="Name" required error={moduleForm.errors.name} value={moduleForm.values.name}
            onChange={(e) => moduleForm.setValue('name', (e.target as HTMLInputElement).value)} placeholder="e.g. Orders" />
          <TextField label="Description" value={moduleForm.values.description}
            onChange={(e) => moduleForm.setValue('description', (e.target as HTMLInputElement).value)} placeholder="Optional" />
          <TextField label="Sort Order" type="number" value={String(moduleForm.values.sortOrder)}
            onChange={(e) => moduleForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))} />
          {moduleModal?.mode === 'edit' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--maw-text-sm)' }}>
              <input type="checkbox" checked={moduleForm.values.isActive} onChange={(e) => moduleForm.setValue('isActive', e.target.checked)} />Active
            </label>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="ghost" onClick={() => setModuleModal(null)}>Cancel</Button>
            <Button onClick={() => moduleForm.handleSubmit()} disabled={moduleForm.submitting}>
              {moduleModal?.mode === 'edit' ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Permission Modal */}
      <Modal open={permModal !== null} onClose={() => setPermModal(null)} title={`Add Permission to: ${permModal?.moduleName ?? ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <TextField label="Permission Code" required error={permForm.errors.code} value={permForm.values.code}
            onChange={(e) => permForm.setValue('code', (e.target as HTMLInputElement).value)} placeholder="e.g. Create_Orders" />
          <TextField label="Name" required error={permForm.errors.name} value={permForm.values.name}
            onChange={(e) => permForm.setValue('name', (e.target as HTMLInputElement).value)} placeholder="e.g. Create Orders" />
          <TextField label="Description" value={permForm.values.description}
            onChange={(e) => permForm.setValue('description', (e.target as HTMLInputElement).value)} placeholder="Optional" />
          <TextField label="Sort Order" type="number" value={String(permForm.values.sortOrder)}
            onChange={(e) => permForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="ghost" onClick={() => setPermModal(null)}>Cancel</Button>
            <Button onClick={() => permForm.handleSubmit()} disabled={permForm.submitting}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
