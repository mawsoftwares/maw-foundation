import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Badge, Button, ErrorState, Modal, PageLoader, TextField, useForm, useIsMobile, useToast,
} from '@mawsoftwares/ui-web';
import { RoleWorkspace } from './RoleWorkspace';
import { createRole, deleteRole, fetchRoles, rbacErrorMessage, updateRole } from './api';
import type { Role } from './types';

export function RbacView(): ReactNode {
  return <RolesWorkspacePage />;
}

function RolesWorkspacePage(): ReactNode {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [showCreate, setShowCreate] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    fetchRoles()
      .then((data) => setRoles(data))
      .catch((e: unknown) => setError(rbacErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = roles.find((r) => r.id === selectedRoleId) ?? null;
  const split = selected !== null && !isMobile;

  const removeRole = async (id: number) => {
    if (!window.confirm('Delete this role?')) return;
    try {
      await deleteRole(id);
      toast.success('Role deleted');
      if (selectedRoleId === id) setSelectedRoleId(null);
      load();
    } catch (e) {
      toast.error(rbacErrorMessage(e));
    }
  };

  const createForm = useForm({
    initialValues: { code: '', name: '', sortOrder: 0 },
    fields: { code: { required: true }, name: { required: true } },
    onSubmit: async (values) => {
      try {
        const created = await createRole({
          code: values.code,
          name: values.name,
          sortOrder: Number(values.sortOrder),
        });
        toast.success('Role created');
        setShowCreate(false);
        createForm.reset();
        setRoles((prev) => [...prev, created]);
        setSelectedRoleId(created.id);
        load();
      } catch (e) {
        toast.error(rbacErrorMessage(e));
      }
    },
  });

  const editForm = useForm({
    initialValues: { name: '', sortOrder: 0, isActive: true },
    fields: { name: { required: true } },
    onSubmit: async (values) => {
      if (!editingRole) return;
      try {
        const updated = await updateRole(editingRole.id, {
          name: values.name,
          description: editingRole.description ?? undefined,
          sortOrder: Number(values.sortOrder),
          isActive: values.isActive,
        });
        toast.success('Role updated');
        setEditingRole(null);
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      } catch (e) {
        toast.error(rbacErrorMessage(e));
      }
    },
  });

  useEffect(() => {
    if (editingRole) {
      editForm.reset({
        name: editingRole.name,
        sortOrder: editingRole.sortOrder,
        isActive: editingRole.isActive,
      });
    }
  }, [editingRole]);

  if (error) return <ErrorState title="Failed to load roles" message={error} retry={load} />;
  if (loading && roles.length === 0) return <PageLoader message="Loading roles..." />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--maw-space-xl)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xxl)', fontWeight: 800, color: 'var(--maw-fg)', letterSpacing: '-0.02em' }}>
            Role Management
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
            Select a role card to manage its permissions inline
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Create Role</Button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 'var(--maw-space-lg)',
        alignItems: 'flex-start',
      }}>
        <div style={{ flex: split ? '0 0 280px' : '1', width: isMobile ? '100%' : undefined, minWidth: 0 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: split ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 'var(--maw-space-md)',
          }}>
            {roles.map((role) => {
              const isSelected = selectedRoleId === role.id;
              return (
                <div
                  key={role.id}
                  style={{
                    border: `2px solid ${isSelected ? 'var(--maw-brand)' : 'var(--maw-border)'}`,
                    borderRadius: 'var(--maw-radius-lg)',
                    background: isSelected ? 'color-mix(in srgb, var(--maw-brand) 6%, var(--maw-bg))' : 'var(--maw-surface)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedRoleId(isSelected && isMobile ? null : role.id)}
                    aria-pressed={isSelected}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: 'var(--maw-space-md)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <span aria-hidden="true" style={{
                      fontSize: 18,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? 'var(--maw-brand)' : 'var(--maw-border)',
                      color: isSelected ? '#fff' : 'var(--maw-fgMuted)',
                      flexShrink: 0,
                    }}>🔑</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {role.name}
                        <span style={{ fontSize: 11, color: 'var(--maw-fgMuted)', transform: `rotate(${isSelected ? -90 : 0}deg)`, display: 'inline-block' }}>▼</span>
                      </div>
                      <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginTop: 2, fontFamily: 'monospace' }}>{role.code}</div>
                      <div style={{ marginTop: 6 }}>
                        <Badge variant={role.isActive ? 'success' : 'danger'}>{role.isActive ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </div>
                  </button>
                  <div style={{ padding: '0 var(--maw-space-md) var(--maw-space-sm)', display: 'flex', gap: 6 }}>
                    <Button variant="ghost" onClick={() => setEditingRole(role)} style={{ fontSize: 'var(--maw-text-xs)', padding: '3px 10px' }}>Edit</Button>
                    {role.code !== 'super_admin' && role.code !== 'owner' && (
                      <Button variant="ghost" onClick={() => void removeRole(role.id)} style={{ fontSize: 'var(--maw-text-xs)', padding: '3px 10px', color: 'var(--maw-danger)' }}>Delete</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selected ? (
          <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined }}>
            <RoleWorkspace key={selected.id} role={selected} onClose={() => setSelectedRoleId(null)} />
          </div>
        ) : (
          !isMobile && (
            <div style={{
              flex: 1,
              border: '1px dashed var(--maw-border)',
              borderRadius: 'var(--maw-radius-lg)',
              padding: 'var(--maw-space-xxl)',
              color: 'var(--maw-fgMuted)',
              textAlign: 'center',
            }}>
              Select a role to manage its permissions.
            </div>
          )
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Role">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <TextField label="Role Code" required error={createForm.errors.code} value={createForm.values.code}
            onChange={(e) => createForm.setValue('code', (e.target as HTMLInputElement).value)} placeholder="e.g. clerk" />
          <TextField label="Name" required error={createForm.errors.name} value={createForm.values.name}
            onChange={(e) => createForm.setValue('name', (e.target as HTMLInputElement).value)} placeholder="e.g. Clerk" />
          <TextField label="Sort Order" type="number" value={String(createForm.values.sortOrder)}
            onChange={(e) => createForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createForm.handleSubmit()} disabled={createForm.submitting}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editingRole} onClose={() => setEditingRole(null)} title={`Edit Role: ${editingRole?.code ?? ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <TextField label="Name" required error={editForm.errors.name} value={editForm.values.name}
            onChange={(e) => editForm.setValue('name', (e.target as HTMLInputElement).value)} />
          <TextField label="Sort Order" type="number" value={String(editForm.values.sortOrder)}
            onChange={(e) => editForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--maw-text-sm)' }}>
            <input type="checkbox" checked={editForm.values.isActive} onChange={(e) => editForm.setValue('isActive', e.target.checked)} />Active
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setEditingRole(null)}>Cancel</Button>
            <Button onClick={() => editForm.handleSubmit()} disabled={editForm.submitting}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
