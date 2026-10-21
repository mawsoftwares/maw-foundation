import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ApiError } from '@mawsoftwares/api-client';
import {
  ListPage, DataTable, Badge, Button, Modal, TextField, Select, ConfirmationDialog, useForm,
  useToast, ErrorState, PageLoader,
  type ColumnDef,
} from '@mawsoftwares/ui-web';
import { client } from '../api';
import { notifyMenusChanged } from '../menu-tree';

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

type MenuRow = MenuItem & { depth: number };

/** Depth-first order (parent, then its children by sortOrder) so submenus sit under their parent. */
function orderedTree(items: MenuItem[]): MenuRow[] {
  const ids = new Set(items.map((i) => i.id));
  const byParent = new Map<number | null, MenuItem[]>();
  for (const i of items) {
    const key = i.parentId !== null && ids.has(i.parentId) ? i.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), i]);
  }
  const out: MenuRow[] = [];
  const visit = (parent: number | null, depth: number) => {
    for (const i of [...(byParent.get(parent) ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)) {
      out.push({ ...i, depth });
      visit(i.id, depth + 1);
    }
  };
  visit(null, 0);
  return out;
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
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Parents whose submenus are folded away in the list.
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  // Dev-only "with code" support: whether the server can generate/remove module code, and for which keys it did.
  const [scaffold, setScaffold] = useState<{ enabled: boolean; scaffolded: string[] }>({ enabled: false, scaffolded: [] });
  const [withCode, setWithCode] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    client
      .request<{ data: MenuItem[] }>('/api/v1/menus')
      .then((r) => setItems(r.data))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadScaffold = useCallback(() => {
    client
      .request<{ data: { enabled: boolean; scaffolded: string[] } }>('/api/v1/menus/scaffold/status')
      .then((r) => setScaffold(r.data))
      .catch(() => setScaffold({ enabled: false, scaffolded: [] }));
  }, []);

  useEffect(() => {
    load();
    loadScaffold();
  }, [load, loadScaffold]);

  const toggleActive = async (item: MenuItem) => {
    try {
      await client.request(`/api/v1/menus/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          label: item.label,
          path: item.path || undefined,
          icon: item.icon || undefined,
          parentId: item.parentId || undefined,
          permission: item.permission || undefined,
          sortOrder: item.sortOrder,
          isActive: !item.isActive,
        }),
      });
      toast.success(`Menu item ${item.isActive ? 'deactivated' : 'activated'}`);
      load();
      notifyMenusChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const deleteItem = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      const res = await client.request<{ codeRemoved?: boolean }>(
        `/api/v1/menus/${deletingItem.id}${deletingHasCode ? '?withCode=true' : ''}`,
        { method: 'DELETE' },
      );
      toast.success(res.codeRemoved ? 'Menu item and its module code deleted' : 'Menu item deleted');
      setDeletingItem(null);
      load();
      notifyMenusChanged();
      loadScaffold();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const deletingHasCode = !!deletingItem && scaffold.enabled && scaffold.scaffolded.includes(deletingItem.key);

  // Parent choices: any item except the one being edited and its own descendants.
  const parentOptions = (excludeId?: number) => {
    const blocked = new Set<number>();
    if (excludeId !== undefined) {
      blocked.add(excludeId);
      let grew = true;
      while (grew) {
        grew = false;
        for (const i of items) {
          if (i.parentId !== null && blocked.has(i.parentId) && !blocked.has(i.id)) {
            blocked.add(i.id);
            grew = true;
          }
        }
      }
    }
    return orderedTree(items)
      .filter((i) => !blocked.has(i.id))
      .map((i) => ({ value: String(i.id), label: `${'— '.repeat(i.depth)}${i.label}` }));
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
        const generate = scaffold.enabled && withCode;
        const res = await client.request<{ restartRequired?: boolean }>(generate ? '/api/v1/menus/scaffold' : '/api/v1/menus', {
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
        toast.success(
          res.restartRequired
            ? 'Menu item and module code created. Restart the API server, then sign in again to load the new permissions.'
            : 'Menu item created',
        );
        setShowCreate(false);
        createForm.reset();
        load();
        notifyMenusChanged();
        loadScaffold();
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
        notifyMenusChanged();
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

  const parentIds = new Set(items.filter((i) => i.parentId !== null).map((i) => i.parentId as number));
  const byId = new Map(items.map((i) => [i.id, i]));
  const isHidden = (row: MenuItem): boolean => {
    for (let p = row.parentId; p !== null; p = byId.get(p)?.parentId ?? null) {
      if (collapsed.has(p)) return true;
    }
    return false;
  };
  const sorted = orderedTree(items).filter((row) => !isHidden(row));
  const toggleCollapsed = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const columns: ColumnDef<MenuRow>[] = [
    { key: 'label', header: 'Label', sortable: true, render: (row) => (
      <span style={{ fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
        <span style={{ display: 'inline-block', width: row.depth * 20 }} />
        {parentIds.has(row.id) ? (
          <button
            type="button"
            onClick={() => toggleCollapsed(row.id)}
            aria-expanded={!collapsed.has(row.id)}
            aria-label={`${collapsed.has(row.id) ? 'Expand' : 'Collapse'} ${row.label}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--maw-fgMuted)', padding: 0, marginRight: 6, width: 14 }}
          >
            {collapsed.has(row.id) ? '▸' : '▾'}
          </button>
        ) : (
          <span style={{ display: 'inline-block', width: 20 }} />
        )}
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
          <Button variant="ghost" onClick={() => toggleActive(row)}>
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="ghost" onClick={() => setDeletingItem(row)}>Delete</Button>
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
      {parentIds.size > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--maw-space-sm)' }}>
          <Button variant="ghost" onClick={() => setCollapsed(new Set())}>Expand all</Button>
          <Button variant="ghost" onClick={() => setCollapsed(new Set(parentIds))}>Collapse all</Button>
        </div>
      )}
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
          <Select label="Parent Menu Item" value={createForm.values.parentId} options={parentOptions()}
            placeholder="None — top-level item"
            onChange={(e) => createForm.setValue('parentId', e.target.value)} />
          {scaffold.enabled && withCode ? (
            <p style={{ margin: 0, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
              Permission will be generated automatically (Read/Create/Update/Delete for this module).
            </p>
          ) : (
            <TextField label="Required Permission" value={createForm.values.permission}
              onChange={(e) => createForm.setValue('permission', (e.target as HTMLInputElement).value)} placeholder="Optional — e.g. Read_Orders" />
          )}
          <TextField label="Sort Order" type="number" value={String(createForm.values.sortOrder)}
            onChange={(e) => createForm.setValue('sortOrder', Number((e.target as HTMLInputElement).value))} />
          {scaffold.enabled && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--maw-text-sm)' }}>
              <input type="checkbox" checked={withCode} onChange={(e) => setWithCode(e.target.checked)} />
              Also generate module code (permissions, page, nav wiring) — development only
            </label>
          )}
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
          <Select label="Parent Menu Item" value={editForm.values.parentId} options={parentOptions(editingItem?.id)}
            placeholder="None — top-level item"
            onChange={(e) => editForm.setValue('parentId', e.target.value)} />
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
      <ConfirmationDialog
        open={!!deletingItem}
        title="Delete menu item"
        message={`Delete "${deletingItem?.label}"? Any submenus under it will be deleted too.${
          deletingHasCode ? ' The module code generated for it (permissions, page and nav wiring) will also be deleted.' : ''
        } This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void deleteItem()}
        onCancel={() => setDeletingItem(null)}
      />
    </ListPage>
  );
}
