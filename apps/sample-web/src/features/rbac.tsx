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
// 1. Roles Tab
// ---------------------------------------------------------------------------
function RolesTab(): ReactNode {
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [showCreate, setShowCreate] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissionModalRole, setPermissionModalRole] = useState<Role | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    client
      .request<{ data: Role[] }>('/api/v1/rbac/roles')
      .then((r) => setRoles(r.data))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteRole = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await client.request(`/api/v1/rbac/roles/${id}`, { method: 'DELETE' });
      toast.success('Role deleted successfully');
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
        await client.request('/api/v1/rbac/roles', {
          method: 'POST',
          body: JSON.stringify({
            code: values.code,
            name: values.name,
            description: values.description || undefined,
            sortOrder: Number(values.sortOrder),
          }),
        });
        toast.success('Role created successfully');
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
      if (!editingRole) return;
      try {
        await client.request(`/api/v1/rbac/roles/${editingRole.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: values.name,
            description: values.description || undefined,
            sortOrder: Number(values.sortOrder),
            isActive: values.isActive,
          }),
        });
        toast.success('Role updated successfully');
        setEditingRole(null);
        load();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  useEffect(() => {
    if (editingRole) {
      editForm.reset({
        name: editingRole.name,
        description: editingRole.description || '',
        sortOrder: editingRole.sortOrder,
        isActive: editingRole.isActive,
      });
    }
  }, [editingRole]);

  if (error) return <ErrorState title="Failed to load roles" message={error} retry={load} />;
  if (loading && roles.length === 0) return <PageLoader message="Loading roles..." />;

  const columns: ColumnDef<Role>[] = [
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
          <Button variant="ghost" onClick={() => setPermissionModalRole(row)}>
            Permissions
          </Button>
          <Button variant="ghost" onClick={() => setEditingRole(row)}>
            Edit
          </Button>
          {row.code !== 'super_admin' && row.code !== 'owner' && (
            <Button variant="ghost" onClick={() => deleteRole(row.id)} style={{ color: 'var(--maw-danger)' }}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ListPage title="Role Management" createLabel="Create Role" onCreate={() => setShowCreate(true)}>
      <DataTable columns={columns} data={roles} keyField="id" emptyMessage="No roles found" />

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Role">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <TextField
            label="Role Code"
            required
            error={createForm.errors.code}
            value={createForm.values.code}
            onChange={(e) => createForm.setValue('code', (e.target as HTMLInputElement).value)}
            placeholder="e.g. clerk"
          />
          <TextField
            label="Name"
            required
            error={createForm.errors.name}
            value={createForm.values.name}
            onChange={(e) => createForm.setValue('name', (e.target as HTMLInputElement).value)}
            placeholder="e.g. Clerk"
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
      <Modal open={!!editingRole} onClose={() => setEditingRole(null)} title={`Edit Role: ${editingRole?.code}`}>
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
            <Button variant="ghost" onClick={() => setEditingRole(null)}>Cancel</Button>
            <Button onClick={() => editForm.handleSubmit()} disabled={editForm.submitting}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Permissions Modal */}
      {permissionModalRole && (
        <RolePermissionsModal
          role={permissionModalRole}
          onClose={() => setPermissionModalRole(null)}
        />
      )}
    </ListPage>
  );
}

// ---------------------------------------------------------------------------
// Role Permissions Assignment Modal
// ---------------------------------------------------------------------------
function RolePermissionsModal({ role, onClose }: { role: Role; onClose: () => void }): ReactNode {
  const toast = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [assigned, setAssigned] = useState<RolePermissionAssignment[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [role.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = (permissionId: number, moduleId: number | null) => {
    setAssigned((prev) => {
      const idx = prev.findIndex((item) => item.permissionId === permissionId && item.moduleId === moduleId);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      } else {
        return [...prev, { permissionId, moduleId }];
      }
    });
  };

  const handleSave = async () => {
    try {
      await client.request(`/api/v1/rbac/roles/${role.id}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ assignments: assigned }),
      });
      toast.success('Permissions assigned successfully');
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const getPermissionGroupName = (perm: Permission): string => {
    const parts = perm.code.split('_');
    if (parts.length >= 2) {
      return parts.slice(1).join('_');
    }
    return 'Global / System';
  };

  const groups: Record<string, Permission[]> = {};
  for (const p of permissions) {
    const g = getPermissionGroupName(p);
    groups[g] = groups[g] || [];
    groups[g].push(p);
  }

  return (
    <Modal open={true} onClose={onClose} title={`Manage Permissions: ${role.name}`}>
      {loading ? (
        <PageLoader message="Loading permission assignments..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto', marginTop: '16px', paddingRight: '4px' }}>
          {Object.entries(groups).map(([groupName, groupPerms]) => (
            <div key={groupName} style={{ borderBottom: '1px solid var(--maw-border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 'var(--maw-text-md)', fontWeight: 600, color: 'var(--maw-fg)' }}>
                {groupName}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {groupPerms.map((p) => {
                  const isChecked = assigned.some((a) => a.permissionId === p.id);
                  return (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: 'var(--maw-text-sm)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(p.id, null)}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>{p.description}</div>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--maw-border)', paddingTop: '16px' }}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Permissions</Button>
          </div>
        </div>
      )}
    </Modal>
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
