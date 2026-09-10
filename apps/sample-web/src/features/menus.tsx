import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ApiError } from '@mawsoftwares/api-client';
import {
  ListPage, DataTable, Badge, Button, Modal, TextField, useForm,
  useToast, ErrorState, PageLoader,
  type ColumnDef,
} from '@mawsoftwares/ui-web';
import { client } from '../api';

interface MenuItem {
  id: number;
  key: string;
  label: string;
  path: string | null;
  icon: string | null;
  parentId: number | null;
  permission: string | null;
  featureFlag: string | null;
  sortOrder: number;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Menu Management — DB-backed navigation tree. Flat table (sorted by
// sortOrder, with the parent's label shown alongside a child row) plus
// create/edit modals. Gated behind Manage_Menus at the route/nav level.
// ---------------------------------------------------------------------------
export function MenusView(): ReactNode {
  const toast = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    client
      .request<{ data: MenuItem[] }>('/api/v1/menus')
      .then((r) => setItems(r.data))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteItem = async (id: number) => {
    if (!window.confirm('Delete this menu item? Any child items will also be removed.')) return;
    try {
      await client.request(`/api/v1/menus/${id}`, { method: 'DELETE' });
      toast.success('Menu item deleted');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const labelForParent = (parentId: number | null) => {
    if (parentId === null) return '—';
    return items.find((i) => i.id === parentId)?.label ?? `#${parentId}`;
  };

  const createForm = useForm({
    initialValues: { key: '', label: '', path: '', icon: '', parentId: '', permission: '', sortOrder: 0 },
    fields: { key: { required: true }, label: { required: true } },
    onSubmit: async (values) => {
      try {
        await client.request('/api/v1/menus', {
          method: 'POST',
          body: JSON.stringify({
            key: values.key,
            label: values.label,
            path: values.path || undefined,
            icon: values.icon || undefined,
            parentId: values.parentId ? Number(values.parentId) : undefined,
            permission: values.permission || undefined,
            sortOrder: Number(values.sortOrder),
          }),
        });
        toast.success('Menu item created');
        setShowCreate(false);
        createForm.reset();
        load();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  const editForm = useForm({
    initialValues: { label: '', path: '', icon: '', parentId: '', permission: '', sortOrder: 0, isActive: true },
    fields: { label: { required: true } },
    onSubmit: async (values) => {
      if (!editingItem) return;
      try {
        await client.request(`/api/v1/menus/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            label: values.label,
            path: values.path || undefined,
            icon: values.icon || undefined,
            parentId: values.parentId ? Number(values.parentId) : undefined,
            permission: values.permission || undefined,
            sortOrder: Number(values.sortOrder),
            isActive: values.isActive,
          }),
        });
        toast.success('Menu item updated');
        setEditingItem(null);
        load();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  useEffect(() => {
    if (editingItem) {
      editForm.reset({
        label: editingItem.label,
        path: editingItem.path ?? '',
        icon: editingItem.icon ?? '',
        parentId: editingItem.parentId ? String(editingItem.parentId) : '',
        permission: editingItem.permission ?? '',
        sortOrder: editingItem.sortOrder,
        isActive: editingItem.isActive,
      });
    }
  }, [editingItem]);

  if (error) return <ErrorState title="Failed to load menu items" message={error} retry={load} />;
  if (loading && items.length === 0) return <PageLoader message="Loading menu items..." />;

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  const columns: ColumnDef<MenuItem>[] = [
    { key: 'label', header: 'Label', sortable: true, render: (row) => (
      <span style={{ fontWeight: 500 }}>
        {row.parentId !== null && <span style={{ color: 'var(--maw-fgSubtle)', marginRight: 6 }}>↳</span>}
        {row.label}
      </span>
    ) },
    { key: 'key', header: 'Key' },
    { key: 'path', header: 'Path', render: (row) => row.path ?? '—' },
    { key: 'parentId', header: 'Parent', render: (row) => labelForParent(row.parentId) },
    { key: 'permission', header: 'Permission', render: (row) => row.permission ?? '—' },
    { key: 'sortOrder', header: 'Order', sortable: true },
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
          <Button variant="ghost" onClick={() => setEditingItem(row)}>Edit</Button>
          <Button variant="ghost" onClick={() => deleteItem(row.id)} style={{ color: 'var(--maw-danger)' }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <ListPage title="Menu Management" createLabel="Create Menu Item" onCreate={() => setShowCreate(true)}>
      <p style={{ margin: '0 0 var(--maw-space-md)', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
        Controls the app's navigation sidebar. Items with a permission are hidden from users who don't have it;
        inactive items are hidden entirely. Changes take effect on the next page load.
      </p>
      <DataTable columns={columns} data={sorted} keyField="id" emptyMessage="No menu items found" />

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Menu Item">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <TextField label="Key" required error={createForm.errors.key} value={createForm.values.key}
            onChange={(e) => createForm.setValue('key', (e.target as HTMLInputElement).value)} placeholder="e.g. reports-custom" />
          <TextField label="Label" required error={createForm.errors.label} value={createForm.values.label}
            onChange={(e) => createForm.setValue('label', (e.target as HTMLInputElement).value)} placeholder="e.g. Custom Reports" />
          <TextField label="Path" value={createForm.values.path}
            onChange={(e) => createForm.setValue('path', (e.target as HTMLInputElement).value)} placeholder="e.g. /reports-custom" />
          <TextField label="Icon" value={createForm.values.icon}
            onChange={(e) => createForm.setValue('icon', (e.target as HTMLInputElement).value)} placeholder="e.g. bar-chart" />
          <TextField label="Parent Menu Item ID" value={createForm.values.parentId}
            onChange={(e) => createForm.setValue('parentId', (e.target as HTMLInputElement).value)} placeholder="Optional — leave blank for a top-level item" />
          <TextField label="Required Permission" value={createForm.values.permission}
            onChange={(e) => createForm.setValue('permission', (e.target as HTMLInputElement).value)} placeholder="Optional — e.g. Read_Orders" />
          <TextField label="Sort Order" type="number" value={String(createForm.values.sortOrder)}
            onChange={(e) => createForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createForm.handleSubmit()} disabled={createForm.submitting}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editingItem} onClose={() => setEditingItem(null)} title={`Edit Menu Item: ${editingItem?.key}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          <TextField label="Label" required error={editForm.errors.label} value={editForm.values.label}
            onChange={(e) => editForm.setValue('label', (e.target as HTMLInputElement).value)} />
          <TextField label="Path" value={editForm.values.path}
            onChange={(e) => editForm.setValue('path', (e.target as HTMLInputElement).value)} />
          <TextField label="Icon" value={editForm.values.icon}
            onChange={(e) => editForm.setValue('icon', (e.target as HTMLInputElement).value)} />
          <TextField label="Parent Menu Item ID" value={editForm.values.parentId}
            onChange={(e) => editForm.setValue('parentId', (e.target as HTMLInputElement).value)} />
          <TextField label="Required Permission" value={editForm.values.permission}
            onChange={(e) => editForm.setValue('permission', (e.target as HTMLInputElement).value)} />
          <TextField label="Sort Order" type="number" value={String(editForm.values.sortOrder)}
            onChange={(e) => editForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--maw-text-sm)' }}>
            <input type="checkbox" checked={editForm.values.isActive} onChange={(e) => editForm.setValue('isActive', e.target.checked)} />Active
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="ghost" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button onClick={() => editForm.handleSubmit()} disabled={editForm.submitting}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </ListPage>
  );
}
